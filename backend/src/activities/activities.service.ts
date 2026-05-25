import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Contact } from '../contacts/contact.entity';
import { paginate } from '../common/pagination';
import { ActivityType } from '../common/enums';
import { Property } from '../properties/property.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import {
  buildAppraisalRequestActivityTitle,
  createAppraisalRequestExpiration,
  createPublicFormToken,
} from '../use-cases/appraisal-initial-intake.use-case';
import { Activity } from './activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { ShareActivityDto } from './dto/share-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
  ) {}

  async create(dto: CreateActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedRelations(dto.contactId ?? null, dto.propertyId ?? null, dto.appraisalRequestId ?? null, teamId);
    this.assertPropertySearchPayload(dto.activityType, dto.externalUrl);

    let appraisalRequestId = dto.appraisalRequestId ?? null;

    if (dto.activityType === ActivityType.APPRAISAL_REQUEST) {
      if (!dto.contactId) {
        throw new BadRequestException('La actividad de solicitud de tasacion requiere un contacto');
      }

      const request = await this.appraisalRequestsRepository.save(
        this.appraisalRequestsRepository.create({
          teamId,
          ownerUserId: user.sub,
          contactId: dto.contactId,
          publicToken: createPublicFormToken(),
          expiresAt: createAppraisalRequestExpiration(),
          submittedAt: null,
        }),
      );
      appraisalRequestId = request.id;
    }

    const activity = this.activitiesRepository.create({
      ...dto,
      teamId,
      ownerUserId: user.sub,
      activityDate: new Date(dto.activityDate),
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      contactId: dto.contactId ?? null,
      propertyId: dto.propertyId ?? null,
      appraisalRequestId,
      title:
        dto.activityType === ActivityType.APPRAISAL_REQUEST
          ? buildAppraisalRequestActivityTitle(null)
          : dto.title,
      externalUrl: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.externalUrl?.trim() || null : null,
      whatsappComment: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.whatsappComment?.trim() || null : null,
      whatsappSharedAt: dto.whatsappSharedAt ? new Date(dto.whatsappSharedAt) : null,
      propertySearchLiked: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.propertySearchLiked ?? null : null,
    });

    return this.activitiesRepository.save(activity);
  }

  async findAll(query: QueryActivitiesDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.contact', 'contact')
      .leftJoinAndSelect('activity.property', 'property')
      .leftJoinAndSelect('activity.appraisalRequest', 'appraisalRequest')
      .where('activity.teamId = :teamId', { teamId })
      .orderBy('activity.activityDate', 'DESC');

    if (query.contactId) {
      qb.andWhere('activity.contactId = :contactId', { contactId: query.contactId });
    }

    if (query.activityType) {
      qb.andWhere('activity.activityType = :activityType', { activityType: query.activityType });
    }

    if (query.propertySearchFeedback) {
      qb.andWhere('activity.activityType = :propertySearchType', {
        propertySearchType: ActivityType.PROPERTY_SEARCH,
      });

      if (query.propertySearchFeedback === 'LIKED') {
        qb.andWhere('activity.propertySearchLiked = true');
      } else if (query.propertySearchFeedback === 'DISLIKED') {
        qb.andWhere('activity.propertySearchLiked = false');
      } else {
        qb.andWhere('activity.propertySearchLiked IS NULL');
      }
    }

    if (query.propertyId) {
      qb.andWhere('activity.propertyId = :propertyId', { propertyId: query.propertyId });
    }

    if (query.nextFollowUpDate) {
      qb.andWhere('DATE(activity.nextFollowUpDate) = :followUpDate', {
        followUpDate: query.nextFollowUpDate,
      });
    }

    if (query.fromDate) {
      qb.andWhere('DATE(activity.activityDate) >= :fromDate', {
        fromDate: query.fromDate,
      });
    }

    if (query.toDate) {
      qb.andWhere('DATE(activity.activityDate) <= :toDate', {
        toDate: query.toDate,
      });
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
      relations: { contact: true, property: true, appraisalRequest: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return activity;
  }

  async update(id: number, dto: UpdateActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
      relations: { appraisalRequest: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.activityType === ActivityType.APPRAISAL_REQUEST && dto.activityType && dto.activityType !== ActivityType.APPRAISAL_REQUEST) {
      throw new BadRequestException('La actividad de solicitud de tasacion no puede cambiar de tipo');
    }

    const nextActivityType = dto.activityType ?? activity.activityType;
    const nextContactId = dto.contactId === undefined ? activity.contactId : dto.contactId ?? null;
    const nextPropertyId = dto.propertyId === undefined ? activity.propertyId : dto.propertyId ?? null;
    const nextAppraisalRequestId = activity.appraisalRequestId;
    await this.assertScopedRelations(nextContactId ?? null, nextPropertyId ?? null, nextAppraisalRequestId ?? null, teamId);
    this.assertPropertySearchPayload(nextActivityType, dto.externalUrl ?? activity.externalUrl ?? undefined);

    if (nextActivityType === ActivityType.APPRAISAL_REQUEST) {
      if (!nextContactId) {
        throw new BadRequestException('La actividad de solicitud de tasacion requiere un contacto');
      }

      if (activity.appraisalRequest) {
        activity.appraisalRequest.contactId = nextContactId;
        await this.appraisalRequestsRepository.save(activity.appraisalRequest);
      }
    }

    Object.assign(activity, {
      ...dto,
      activityDate: dto.activityDate ? new Date(dto.activityDate) : activity.activityDate,
      nextFollowUpDate:
        dto.nextFollowUpDate === undefined
          ? activity.nextFollowUpDate
          : dto.nextFollowUpDate
            ? new Date(dto.nextFollowUpDate)
            : null,
      contactId: nextContactId,
      propertyId: nextPropertyId,
      appraisalRequestId: nextAppraisalRequestId ?? null,
      title:
        nextActivityType === ActivityType.APPRAISAL_REQUEST
          ? buildAppraisalRequestActivityTitle(activity.appraisalRequest?.propertyAddress ?? null)
          : dto.title ?? activity.title,
      externalUrl:
        nextActivityType === ActivityType.PROPERTY_SEARCH
          ? dto.externalUrl === undefined
            ? activity.externalUrl
            : dto.externalUrl?.trim() || null
          : null,
      whatsappComment:
        nextActivityType === ActivityType.PROPERTY_SEARCH
          ? dto.whatsappComment === undefined
            ? activity.whatsappComment
            : dto.whatsappComment?.trim() || null
          : null,
      whatsappSharedAt:
        nextActivityType !== ActivityType.PROPERTY_SEARCH
          ? null
          : dto.whatsappSharedAt === undefined
          ? activity.whatsappSharedAt
          : dto.whatsappSharedAt
            ? new Date(dto.whatsappSharedAt)
            : null,
      propertySearchLiked:
        nextActivityType !== ActivityType.PROPERTY_SEARCH
          ? null
          : dto.propertySearchLiked === undefined
            ? activity.propertySearchLiked
            : dto.propertySearchLiked,
    });

    await this.activitiesRepository.save(activity);
    return this.findOne(id, user);
  }

  async share(id: number, dto: ShareActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
      relations: { contact: true, property: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.activityType !== ActivityType.PROPERTY_SEARCH) {
      throw new BadRequestException('Solo las actividades de busqueda de propiedad se pueden compartir por WhatsApp');
    }

    if (!activity.externalUrl) {
      throw new BadRequestException('La actividad no tiene link para compartir');
    }

    activity.whatsappComment = dto.whatsappComment?.trim() || activity.whatsappComment;
    activity.whatsappSharedAt = new Date();
    await this.activitiesRepository.save(activity);
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.appraisalRequestId) {
      const appraisalRequest = await this.appraisalRequestsRepository.findOne({
        where: { id: activity.appraisalRequestId, teamId },
      });

      if (appraisalRequest) {
        await this.appraisalRequestsRepository.remove(appraisalRequest);
      }
    }

    await this.activitiesRepository.remove(activity);
    return { success: true };
  }

  private async assertScopedRelations(
    contactId: number | null,
    propertyId: number | null,
    appraisalRequestId: number | null,
    teamId: number | null,
  ) {
    if (contactId && teamId) {
      const contact = await this.contactsRepository.findOne({
        where: { id: contactId, teamId },
      });

      if (!contact) {
        throw new NotFoundException('Contacto no encontrado');
      }
    }

    if (propertyId && teamId) {
      const property = await this.propertiesRepository.findOne({
        where: { id: propertyId, teamId },
      });

      if (!property) {
        throw new NotFoundException('Propiedad no encontrada');
      }
    }

    if (appraisalRequestId && teamId) {
      const appraisalRequest = await this.appraisalRequestsRepository.findOne({
        where: { id: appraisalRequestId, teamId },
      });

      if (!appraisalRequest) {
        throw new NotFoundException('Solicitud de tasacion no encontrada');
      }
    }
  }

  private assertPropertySearchPayload(activityType: ActivityType, externalUrl?: string) {
    if (activityType === ActivityType.PROPERTY_SEARCH && !externalUrl?.trim()) {
      throw new BadRequestException('La actividad de busqueda de propiedad requiere un link');
    }
  }
}
