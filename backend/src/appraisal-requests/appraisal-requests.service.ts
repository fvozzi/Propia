import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Activity } from '../activities/activity.entity';
import { ActivityType } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { paginate } from '../common/pagination';
import {
  buildAppraisalRequestActivityTitle,
  calculateAppraisalAreas,
  createAppraisalRequestExpiration,
  createPublicFormToken,
  isAppraisalRequestAvailable,
  summarizeAppraisalAnswers,
} from '../use-cases/appraisal-initial-intake.use-case';
import { AppraisalRequest } from './appraisal-request.entity';
import { CreateAppraisalRequestDto } from './dto/create-appraisal-request.dto';
import { QueryAppraisalRequestsDto } from './dto/query-appraisal-requests.dto';
import { SubmitAppraisalRequestDto } from './dto/submit-appraisal-request.dto';
import { UpdateAppraisalRequestDto } from './dto/update-appraisal-request.dto';

@Injectable()
export class AppraisalRequestsService {
  constructor(
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
  ) {}

  async create(dto: CreateAppraisalRequestDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedContact(dto.contactId, teamId);

    const request = this.appraisalRequestsRepository.create({
      ...this.mapDraftFields(dto, false),
      teamId,
      ownerUserId: user.sub,
      contactId: dto.contactId,
      publicToken: createPublicFormToken(),
      expiresAt: createAppraisalRequestExpiration(),
      submittedAt: null,
    });

    const saved = await this.appraisalRequestsRepository.save(request);
    await this.syncActivityForRequest(saved);
    return this.findOne(saved.id, user);
  }

  async findAll(query: QueryAppraisalRequestsDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.appraisalRequestsRepository
      .createQueryBuilder('appraisalRequest')
      .leftJoinAndSelect('appraisalRequest.contact', 'contact')
      .leftJoinAndSelect('appraisalRequest.properties', 'properties')
      .where('appraisalRequest.teamId = :teamId', { teamId })
      .orderBy('appraisalRequest.updatedAt', 'DESC');

    if (query.contactId) {
      qb.andWhere('appraisalRequest.contactId = :contactId', { contactId: query.contactId });
    }

    if (query.status === 'COMPLETED') {
      qb.andWhere('appraisalRequest.submittedAt IS NOT NULL');
    }

    if (query.status === 'OPEN') {
      qb.andWhere('appraisalRequest.submittedAt IS NULL');
      qb.andWhere('appraisalRequest.expiresAt > NOW()');
    }

    if (query.status === 'EXPIRED') {
      qb.andWhere('appraisalRequest.submittedAt IS NULL');
      qb.andWhere('appraisalRequest.expiresAt <= NOW()');
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const request = await this.appraisalRequestsRepository.findOne({
      where: { id, teamId },
      relations: { contact: true, properties: true },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de tasacion no encontrada');
    }

    return request;
  }

  async update(id: number, dto: UpdateAppraisalRequestDto, user: AuthenticatedUser) {
    const request = await this.findOne(id, user);

    if (dto.contactId && dto.contactId !== request.contactId) {
      await this.assertScopedContact(dto.contactId, request.teamId);
    }

    Object.assign(request, {
      ...this.mapDraftFields(dto, true, request),
      contactId: dto.contactId ?? request.contactId,
      expiresAt: request.submittedAt ? request.expiresAt : createAppraisalRequestExpiration(),
    });

    await this.appraisalRequestsRepository.save(request);
    await this.syncActivityForRequest(request);
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const request = await this.findOne(id, user);
    const linkedActivity = await this.activitiesRepository.findOne({
      where: { appraisalRequestId: request.id, teamId: request.teamId },
    });

    if (linkedActivity) {
      await this.activitiesRepository.remove(linkedActivity);
    }

    await this.appraisalRequestsRepository.remove(request);
    return { success: true };
  }

  async findPublicByToken(token: string) {
    const request = await this.appraisalRequestsRepository.findOne({
      where: { publicToken: token },
      relations: { contact: true },
    });

    if (!request) {
      throw new NotFoundException('Formulario de tasacion no encontrado');
    }

    return {
      id: request.id,
      contactDisplayName: request.contact.displayName,
      expiresAt: request.expiresAt,
      submittedAt: request.submittedAt,
      isAvailable: isAppraisalRequestAvailable(request.expiresAt, request.submittedAt),
      propertyAddress: request.propertyAddress,
      city: request.city,
      neighborhood: request.neighborhood,
      propertyType: request.propertyType,
      operationType: request.operationType,
      rooms: request.rooms,
      bedrooms: request.bedrooms,
      bathrooms: request.bathrooms,
      expenses: request.expenses,
      floor: request.floor,
      amenities: request.amenities,
      orientation: request.orientation,
      disposition: request.disposition,
      ageYears: request.ageYears,
      coveredArea: request.coveredArea,
      semiCoveredArea: request.semiCoveredArea,
      uncoveredArea: request.uncoveredArea,
      totalArea: request.totalArea,
      weightedArea: request.weightedArea,
      hasGarage: request.hasGarage,
      conditionNotes: request.conditionNotes,
      valuationReason: request.valuationReason,
      availabilityNotes: request.availabilityNotes,
      additionalNotes: request.additionalNotes,
    };
  }

  async submitPublic(token: string, dto: SubmitAppraisalRequestDto) {
    const request = await this.appraisalRequestsRepository.findOne({
      where: { publicToken: token },
      relations: { contact: true },
    });

    if (!request) {
      throw new NotFoundException('Formulario de tasacion no encontrado');
    }

    if (!isAppraisalRequestAvailable(request.expiresAt, request.submittedAt)) {
      throw new BadRequestException('El formulario de tasacion ya fue respondido o vencio');
    }

    Object.assign(request, {
      ...this.mapDraftFields(dto, false),
      submittedAt: new Date(),
    });
    await this.appraisalRequestsRepository.save(request);

    await this.syncActivityForRequest(request);

    return this.findPublicByToken(token);
  }

  private async assertScopedContact(contactId: number, teamId: number) {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
  }

  private mapDraftFields(
    dto: Partial<
      CreateAppraisalRequestDto &
        SubmitAppraisalRequestDto
    >,
    preserveMissingFields: boolean,
    current?: AppraisalRequest,
  ) {
    const coveredArea = 'coveredArea' in dto ? dto.coveredArea ?? null : current?.coveredArea ?? null;
    const semiCoveredArea = 'semiCoveredArea' in dto ? dto.semiCoveredArea ?? null : current?.semiCoveredArea ?? null;
    const uncoveredArea = 'uncoveredArea' in dto ? dto.uncoveredArea ?? null : current?.uncoveredArea ?? null;
    const computedAreas = calculateAppraisalAreas({
      coveredArea,
      semiCoveredArea,
      uncoveredArea,
    });
    const fields = {
      propertyAddress: dto.propertyAddress?.trim() || null,
      city: dto.city?.trim() || null,
      neighborhood: dto.neighborhood?.trim() || null,
      propertyType: dto.propertyType ?? null,
      operationType: dto.operationType ?? null,
      rooms: dto.rooms ?? null,
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms ?? null,
      expenses: dto.expenses ?? null,
      floor: dto.floor ?? null,
      amenities: dto.amenities?.trim() || null,
      orientation: dto.orientation ?? null,
      disposition: dto.disposition ?? null,
      ageYears: dto.ageYears ?? null,
      coveredArea,
      semiCoveredArea,
      uncoveredArea,
      totalArea: computedAreas.totalArea,
      weightedArea: computedAreas.weightedArea,
      hasGarage: dto.hasGarage ?? null,
      conditionNotes: dto.conditionNotes?.trim() || null,
      valuationReason: dto.valuationReason?.trim() || null,
      availabilityNotes: dto.availabilityNotes?.trim() || null,
      additionalNotes: dto.additionalNotes?.trim() || null,
    };

    if (!preserveMissingFields) {
      return fields;
    }

    const areaFieldsTouched = 'coveredArea' in dto || 'semiCoveredArea' in dto || 'uncoveredArea' in dto;
    return Object.fromEntries(
      Object.entries(fields).filter(([key]) => key in dto || (areaFieldsTouched && (key === 'totalArea' || key === 'weightedArea'))),
    );
  }

  private async syncActivityForRequest(request: AppraisalRequest) {
    const linkedActivity = await this.activitiesRepository.findOne({
      where: { appraisalRequestId: request.id, teamId: request.teamId },
    });

    const description = request.submittedAt
      ? summarizeAppraisalAnswers(request)
      : null;

    if (linkedActivity) {
      Object.assign(linkedActivity, {
        contactId: request.contactId,
        activityType: ActivityType.APPRAISAL_REQUEST,
        title: buildAppraisalRequestActivityTitle(request.propertyAddress),
        description,
        activityDate: request.submittedAt ?? linkedActivity.activityDate,
      });
      await this.activitiesRepository.save(linkedActivity);
      return linkedActivity;
    }

    const activity = this.activitiesRepository.create({
      teamId: request.teamId,
      ownerUserId: request.ownerUserId,
      contactId: request.contactId,
      propertyId: null,
      appraisalRequestId: request.id,
      activityType: ActivityType.APPRAISAL_REQUEST,
      title: buildAppraisalRequestActivityTitle(request.propertyAddress),
      description,
      activityDate: request.submittedAt ?? request.createdAt ?? new Date(),
      nextFollowUpDate: null,
    });

    return this.activitiesRepository.save(activity);
  }
}
