import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import {
  requireActiveTeamId,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import {
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
} from '../common/enums';
import { paginate } from '../common/pagination';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { CommercialOpportunity } from './commercial-opportunity.entity';
import { CreateCommercialOpportunityDto } from './dto/create-commercial-opportunity.dto';
import { QueryCommercialOpportunitiesDto } from './dto/query-commercial-opportunities.dto';
import { UpdateCommercialOpportunityDto } from './dto/update-commercial-opportunity.dto';

@Injectable()
export class CommercialOpportunitiesService {
  constructor(
    @InjectRepository(CommercialOpportunity)
    private readonly opportunitiesRepository: Repository<CommercialOpportunity>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
  ) {}

  async create(dto: CreateCommercialOpportunityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const relations = await this.resolveScopedRelations(dto, teamId);
    const title =
      dto.title?.trim() ||
      buildOpportunityTitle(
        relations.contact.displayName,
        dto.operationType,
        relations.property?.title ?? relations.appraisalRequest?.propertyAddress ?? null,
      );

    validateStageStatusConsistency(
      dto.stage ?? defaultStageForOperation(dto.operationType),
      dto.status ?? CommercialOpportunityStatus.OPEN,
    );

    const opportunity = this.opportunitiesRepository.create({
      teamId,
      ownerUserId: user.sub,
      contactId: relations.contact.id,
      operationType: dto.operationType,
      stage: dto.stage ?? defaultStageForOperation(dto.operationType),
      status: dto.status ?? CommercialOpportunityStatus.OPEN,
      isExternalBuyerLead: dto.isExternalBuyerLead ?? false,
      sourceActivityId: relations.activity?.id ?? null,
      searchRequirementId: relations.requirement?.id ?? null,
      appraisalRequestId: relations.appraisalRequest?.id ?? null,
      propertyId: relations.property?.id ?? null,
      title,
      summary: dto.summary?.trim() || null,
      lostReason: dto.lostReason?.trim() || null,
      closedAt: dto.closedAt ? new Date(dto.closedAt) : null,
    });

    const saved = await this.opportunitiesRepository.save(opportunity);
    return this.findOne(saved.id, user);
  }

  async findAll(query: QueryCommercialOpportunitiesDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.opportunitiesRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.contact', 'contact')
      .leftJoinAndSelect('opportunity.property', 'property')
      .leftJoinAndSelect('opportunity.searchRequirement', 'searchRequirement')
      .leftJoinAndSelect('opportunity.appraisalRequest', 'appraisalRequest')
      .leftJoinAndSelect('opportunity.sourceActivity', 'sourceActivity')
      .where('opportunity.teamId = :teamId', { teamId })
      .orderBy('opportunity.updatedAt', 'DESC');

    if (query.contactId) {
      qb.andWhere('opportunity.contactId = :contactId', {
        contactId: query.contactId,
      });
    }

    if (query.operationType) {
      qb.andWhere('opportunity.operationType = :operationType', {
        operationType: query.operationType,
      });
    }

    if (query.stage) {
      qb.andWhere('opportunity.stage = :stage', { stage: query.stage });
    }

    if (query.status) {
      qb.andWhere('opportunity.status = :status', { status: query.status });
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const opportunity = await this.opportunitiesRepository.findOne({
      where: { id, teamId },
      relations: {
        contact: true,
        property: true,
        searchRequirement: true,
        appraisalRequest: true,
        sourceActivity: true,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad comercial no encontrada');
    }

    return opportunity;
  }

  async update(
    id: number,
    dto: UpdateCommercialOpportunityDto,
    user: AuthenticatedUser,
  ) {
    const teamId = requireActiveTeamId(user);
    const opportunity = await this.opportunitiesRepository.findOne({
      where: { id, teamId },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad comercial no encontrada');
    }

    const relations = await this.resolveScopedRelations(
      {
        contactId: dto.contactId ?? opportunity.contactId,
        sourceActivityId:
          dto.sourceActivityId === undefined
            ? opportunity.sourceActivityId ?? undefined
            : dto.sourceActivityId,
        searchRequirementId:
          dto.searchRequirementId === undefined
            ? opportunity.searchRequirementId ?? undefined
            : dto.searchRequirementId,
        appraisalRequestId:
          dto.appraisalRequestId === undefined
            ? opportunity.appraisalRequestId ?? undefined
            : dto.appraisalRequestId,
        propertyId:
          dto.propertyId === undefined
            ? opportunity.propertyId ?? undefined
            : dto.propertyId,
      },
      teamId,
    );

    const operationType = dto.operationType ?? opportunity.operationType;
    const stage = dto.stage ?? opportunity.stage;
    const status = dto.status ?? opportunity.status;
    validateStageStatusConsistency(stage, status);

    Object.assign(opportunity, {
      contactId: relations.contact.id,
      operationType,
      stage,
      status,
      isExternalBuyerLead:
        dto.isExternalBuyerLead === undefined
          ? opportunity.isExternalBuyerLead
          : dto.isExternalBuyerLead,
      sourceActivityId:
        dto.sourceActivityId === undefined
          ? opportunity.sourceActivityId
          : relations.activity?.id ?? null,
      searchRequirementId:
        dto.searchRequirementId === undefined
          ? opportunity.searchRequirementId
          : relations.requirement?.id ?? null,
      appraisalRequestId:
        dto.appraisalRequestId === undefined
          ? opportunity.appraisalRequestId
          : relations.appraisalRequest?.id ?? null,
      propertyId:
        dto.propertyId === undefined
          ? opportunity.propertyId
          : relations.property?.id ?? null,
      title:
        dto.title === undefined
          ? opportunity.title
          : dto.title.trim() ||
            buildOpportunityTitle(
              relations.contact.displayName,
              operationType,
              relations.property?.title ??
                relations.appraisalRequest?.propertyAddress ??
                null,
            ),
      summary:
        dto.summary === undefined ? opportunity.summary : dto.summary?.trim() || null,
      lostReason:
        dto.lostReason === undefined
          ? opportunity.lostReason
          : dto.lostReason?.trim() || null,
      closedAt:
        dto.closedAt === undefined
          ? deriveClosedAt(opportunity.closedAt, status)
          : dto.closedAt
            ? new Date(dto.closedAt)
            : null,
    });

    await this.opportunitiesRepository.save(opportunity);
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const opportunity = await this.opportunitiesRepository.findOne({
      where: { id, teamId },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad comercial no encontrada');
    }

    await this.opportunitiesRepository.remove(opportunity);
    return { success: true };
  }

  private async resolveScopedRelations(
    dto: {
      contactId: number;
      sourceActivityId?: number;
      searchRequirementId?: number;
      appraisalRequestId?: number;
      propertyId?: number;
    },
    teamId: number,
  ) {
    const [contact, activity, requirement, appraisalRequest, property] =
      await Promise.all([
        this.contactsRepository.findOne({
          where: { id: dto.contactId, teamId },
        }),
        dto.sourceActivityId
          ? this.activitiesRepository.findOne({
              where: { id: dto.sourceActivityId, teamId },
            })
          : Promise.resolve(null),
        dto.searchRequirementId
          ? this.requirementsRepository.findOne({
              where: { id: dto.searchRequirementId, teamId },
            })
          : Promise.resolve(null),
        dto.appraisalRequestId
          ? this.appraisalRequestsRepository.findOne({
              where: { id: dto.appraisalRequestId, teamId },
            })
          : Promise.resolve(null),
        dto.propertyId
          ? this.propertiesRepository.findOne({
              where: { id: dto.propertyId, teamId },
            })
          : Promise.resolve(null),
      ]);

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    if (dto.sourceActivityId && !activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (dto.searchRequirementId && !requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    if (dto.appraisalRequestId && !appraisalRequest) {
      throw new NotFoundException('Prelisting no encontrado');
    }

    if (dto.propertyId && !property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const relationContactIds = [
      activity?.contactId ?? null,
      requirement?.contactId ?? null,
      appraisalRequest?.contactId ?? null,
      property?.ownerContactId ?? null,
    ].filter((value): value is number => value !== null);

    if (relationContactIds.some((contactId) => contactId !== contact.id)) {
      throw new BadRequestException(
        'Las relaciones seleccionadas deben corresponder al mismo contacto',
      );
    }

    return {
      contact,
      activity,
      requirement,
      appraisalRequest,
      property,
    };
  }
}

function defaultStageForOperation(operationType: OperationType) {
  switch (operationType) {
    case OperationType.BUY:
      return CommercialOpportunityStage.SEARCHING;
    case OperationType.SALE:
      return CommercialOpportunityStage.QUALIFYING;
    default:
      return CommercialOpportunityStage.NEW;
  }
}

function deriveClosedAt(
  currentValue: Date | null,
  status: CommercialOpportunityStatus,
) {
  if (
    status === CommercialOpportunityStatus.WON ||
    status === CommercialOpportunityStatus.LOST
  ) {
    return currentValue ?? new Date();
  }

  return null;
}

function validateStageStatusConsistency(
  stage: CommercialOpportunityStage,
  status: CommercialOpportunityStatus,
) {
  if (
    status === CommercialOpportunityStatus.WON &&
    stage !== CommercialOpportunityStage.CLOSED_WON
  ) {
    throw new BadRequestException(
      'Las oportunidades ganadas deben estar en etapa de cierre ganado',
    );
  }

  if (
    status === CommercialOpportunityStatus.LOST &&
    stage !== CommercialOpportunityStage.CLOSED_LOST
  ) {
    throw new BadRequestException(
      'Las oportunidades perdidas deben estar en etapa de cierre perdido',
    );
  }
}

function buildOpportunityTitle(
  contactName: string,
  operationType: OperationType,
  context: string | null,
) {
  const prefix =
    operationType === OperationType.SALE
      ? 'Venta'
      : operationType === OperationType.BUY
        ? 'Compra'
        : 'Alquiler';

  return context?.trim()
    ? `${prefix} - ${context.trim()}`
    : `${prefix} - ${contactName}`;
}
