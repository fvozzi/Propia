import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { chromium } from 'playwright';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Contact } from '../contacts/contact.entity';
import { paginate } from '../common/pagination';
import {
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  ActivityType,
  CurrencyType,
  OperationType,
  PropertyType,
} from '../common/enums';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Property } from '../properties/property.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import {
  buildAppraisalRequestActivityTitle,
  createAppraisalRequestExpiration,
  createPublicFormToken,
} from '../use-cases/appraisal-initial-intake.use-case';
import { ActivityCalendarSyncService } from './activity-calendar-sync.service';
import { extractDomain, parseActivityPreviewMetadata } from './activity-preview.utils';
import { Activity, type ReservationActivityData } from './activity.entity';
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
    @InjectRepository(CommercialOpportunity)
    private readonly opportunitiesRepository: Repository<CommercialOpportunity>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
    private readonly activityCalendarSyncService: ActivityCalendarSyncService,
  ) {}

  async create(dto: CreateActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedRelations(dto.contactId ?? null, dto.propertyId ?? null, dto.appraisalRequestId ?? null, teamId);
    this.assertPropertySearchPayload(dto.activityType, dto.externalUrl);
    const draftTitle =
      dto.activityType === ActivityType.APPRAISAL_REQUEST
        ? buildAppraisalRequestActivityTitle(dto.appraisalPropertyAddress ?? null)
        : readOptionalString(dto.title) ?? buildDefaultActivityTitle(dto.activityType);
    const preview =
      dto.activityType === ActivityType.PROPERTY_SEARCH
        ? await this.resolvePropertySearchPreview(dto.externalUrl?.trim() || null, draftTitle, null)
        : createEmptyActivityPreview();
    const nextTitle =
      dto.activityType === ActivityType.PROPERTY_SEARCH
        ? preview.title?.trim() || draftTitle
        : draftTitle;

    let appraisalRequestId = dto.appraisalRequestId ?? null;

    if (dto.activityType === ActivityType.APPRAISAL_REQUEST) {
      if (!dto.contactId) {
        throw new BadRequestException('La actividad de prelisting requiere un contacto');
      }
      if (!dto.appraisalPropertyAddress?.trim()) {
        throw new BadRequestException('La actividad de prelisting requiere direccion de la propiedad');
      }

      const request = await this.appraisalRequestsRepository.save(
        this.appraisalRequestsRepository.create({
          teamId,
          ownerUserId: user.sub,
          contactId: dto.contactId,
          propertyAddress: dto.appraisalPropertyAddress.trim(),
          publicToken: createPublicFormToken(),
          expiresAt: createAppraisalRequestExpiration(),
          submittedAt: null,
        }),
      );
      appraisalRequestId = request.id;
    }

    const commercialOpportunity = await this.resolveOpportunityForActivityDraft({
      teamId,
      contactId: dto.contactId ?? null,
      propertyId: dto.propertyId ?? null,
      appraisalRequestId,
      activityType: dto.activityType,
    });

    const activity = this.activitiesRepository.create({
      ...dto,
      teamId,
      ownerUserId: user.sub,
      googleEventId: null,
      googleSyncStatus: 'PENDING',
      lastSyncedAt: null,
      googleSyncError: null,
      activityDate: new Date(dto.activityDate),
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      contactId: dto.contactId ?? null,
      propertyId: dto.propertyId ?? null,
      appraisalRequestId,
      commercialOpportunityId: commercialOpportunity?.id ?? null,
      title: nextTitle,
      externalUrl:
        dto.activityType === ActivityType.PROPERTY_SEARCH ||
        dto.activityType === ActivityType.RESERVATION ||
        dto.activityType === ActivityType.VISIT
          ? dto.externalUrl?.trim() || null
          : null,
      externalPreviewImageUrl: preview.imageUrl,
      externalPreviewTitle: preview.title,
      externalPreviewDescription: preview.description,
      externalPreviewDomain: preview.domain,
      externalPreviewFetchedAt: preview.fetchedAt,
      whatsappComment: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.whatsappComment?.trim() || null : null,
      whatsappSharedAt: dto.whatsappSharedAt ? new Date(dto.whatsappSharedAt) : null,
      propertySearchLiked: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.propertySearchLiked ?? null : null,
      reservationData:
        dto.activityType === ActivityType.RESERVATION
          ? sanitizeReservationData(dto.reservationData, user.name ?? null)
          : null,
    });

    const saved = await this.activitiesRepository.save(activity);

    if (dto.activityType === ActivityType.APPRAISAL_REQUEST && appraisalRequestId) {
      const opportunity = await this.upsertSaleOpportunityFromAppraisal({
        teamId,
        ownerUserId: user.sub,
        contactId: dto.contactId ?? null,
        appraisalRequestId,
        sourceActivityId: saved.id,
        propertyId: dto.propertyId ?? null,
        propertyAddress: dto.appraisalPropertyAddress?.trim() || null,
      });

      if (saved.commercialOpportunityId !== opportunity.id) {
        saved.commercialOpportunityId = opportunity.id;
        await this.activitiesRepository.save(saved);
      }
    }

    if (
      dto.activityType === ActivityType.RESERVATION &&
      saved.commercialOpportunityId
    ) {
      await this.markOpportunityAsReserved(saved.commercialOpportunityId);
    }

    await this.activityCalendarSyncService.syncById(saved.id, 'create');
    return this.findOne(saved.id, user);
  }

  async findAll(query: QueryActivitiesDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const followUpDayStart = new Date();
    followUpDayStart.setHours(0, 0, 0, 0);
    const followUpDayEnd = new Date(followUpDayStart);
    followUpDayEnd.setDate(followUpDayEnd.getDate() + 1);
    const qb = this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.contact', 'contact')
      .leftJoinAndSelect('activity.property', 'property')
      .leftJoinAndSelect('activity.appraisalRequest', 'appraisalRequest')
      .leftJoinAndSelect('activity.commercialOpportunity', 'commercialOpportunity')
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

    if (query.whatsappShareStatus) {
      qb.andWhere('activity.activityType = :shareActivityType', {
        shareActivityType: ActivityType.PROPERTY_SEARCH,
      });

      if (query.whatsappShareStatus === 'PENDING') {
        qb.andWhere('activity.whatsappSharedAt IS NULL');
      } else {
        qb.andWhere('activity.whatsappSharedAt IS NOT NULL');
      }
    }

    if (query.propertyId) {
      qb.andWhere('activity.propertyId = :propertyId', { propertyId: query.propertyId });
    }

    if (query.nextFollowUpStatus) {
      qb.andWhere('activity.nextFollowUpDate IS NOT NULL');

      if (query.nextFollowUpStatus === 'DUE_TODAY') {
        qb.andWhere('activity.nextFollowUpDate >= :followUpDayStart', {
          followUpDayStart: followUpDayStart.toISOString(),
        });
        qb.andWhere('activity.nextFollowUpDate < :followUpDayEnd', {
          followUpDayEnd: followUpDayEnd.toISOString(),
        });
      } else {
        qb.andWhere('activity.nextFollowUpDate < :followUpDayStart', {
          followUpDayStart: followUpDayStart.toISOString(),
        });
      }
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
      relations: {
        contact: true,
        property: true,
        appraisalRequest: true,
        commercialOpportunity: true,
      },
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
      throw new BadRequestException('La actividad de prelisting no puede cambiar de tipo');
    }

    const nextActivityType = dto.activityType ?? activity.activityType;
    const nextContactId = dto.contactId === undefined ? activity.contactId : dto.contactId ?? null;
    const nextPropertyId = dto.propertyId === undefined ? activity.propertyId : dto.propertyId ?? null;
    const nextAppraisalRequestId = activity.appraisalRequestId;
    await this.assertScopedRelations(nextContactId ?? null, nextPropertyId ?? null, nextAppraisalRequestId ?? null, teamId);
    this.assertPropertySearchPayload(nextActivityType, dto.externalUrl ?? activity.externalUrl ?? undefined);
    const draftTitle =
      nextActivityType === ActivityType.APPRAISAL_REQUEST
        ? buildAppraisalRequestActivityTitle(
            dto.appraisalPropertyAddress ?? activity.appraisalRequest?.propertyAddress ?? null,
          )
        : readOptionalString(dto.title) ??
          readOptionalString(activity.title) ??
          buildDefaultActivityTitle(nextActivityType);
    const nextExternalUrl =
      nextActivityType === ActivityType.PROPERTY_SEARCH ||
      nextActivityType === ActivityType.RESERVATION ||
      nextActivityType === ActivityType.VISIT
        ? dto.externalUrl === undefined
          ? activity.externalUrl
          : dto.externalUrl?.trim() || null
        : null;
    const preview =
      nextActivityType === ActivityType.PROPERTY_SEARCH
        ? await this.resolvePropertySearchPreview(nextExternalUrl, draftTitle, activity)
        : createEmptyActivityPreview();
    const nextTitle =
      nextActivityType === ActivityType.PROPERTY_SEARCH
        ? preview.title?.trim() || draftTitle
        : draftTitle;

    if (nextActivityType === ActivityType.APPRAISAL_REQUEST) {
      if (!nextContactId) {
        throw new BadRequestException('La actividad de prelisting requiere un contacto');
      }

      if (activity.appraisalRequest) {
        activity.appraisalRequest.contactId = nextContactId;
        if (dto.appraisalPropertyAddress !== undefined) {
          const propertyAddress = dto.appraisalPropertyAddress.trim();
          if (!propertyAddress) {
            throw new BadRequestException('La actividad de prelisting requiere direccion de la propiedad');
          }
          activity.appraisalRequest.propertyAddress = propertyAddress;
        }
        await this.appraisalRequestsRepository.save(activity.appraisalRequest);
      }
    }

    const linkedOpportunity = await this.resolveOpportunityForActivityDraft({
      teamId,
      contactId: nextContactId,
      propertyId: nextPropertyId,
      appraisalRequestId: nextAppraisalRequestId,
      activityType: nextActivityType,
    });

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
      commercialOpportunityId:
        nextActivityType === ActivityType.APPRAISAL_REQUEST
          ? activity.commercialOpportunityId
          : linkedOpportunity?.id ?? null,
      title: nextTitle,
      externalUrl: nextExternalUrl,
      externalPreviewImageUrl: preview.imageUrl,
      externalPreviewTitle: preview.title,
      externalPreviewDescription: preview.description,
      externalPreviewDomain: preview.domain,
      externalPreviewFetchedAt: preview.fetchedAt,
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
      reservationData:
        nextActivityType !== ActivityType.RESERVATION
          ? null
          : dto.reservationData === undefined
            ? activity.reservationData
            : sanitizeReservationData(dto.reservationData, user.name ?? null),
    });

    await this.activitiesRepository.save(activity);

    if (nextActivityType === ActivityType.APPRAISAL_REQUEST && nextAppraisalRequestId) {
      const opportunity = await this.upsertSaleOpportunityFromAppraisal({
        teamId,
        ownerUserId: activity.ownerUserId,
        contactId: nextContactId,
        appraisalRequestId: nextAppraisalRequestId,
        sourceActivityId: activity.id,
        propertyId: nextPropertyId,
        propertyAddress:
          activity.appraisalRequest?.propertyAddress ??
          dto.appraisalPropertyAddress?.trim() ??
          null,
      });

      if (activity.commercialOpportunityId !== opportunity.id) {
        activity.commercialOpportunityId = opportunity.id;
        await this.activitiesRepository.save(activity);
      }
    }

    if (
      nextActivityType === ActivityType.RESERVATION &&
      activity.commercialOpportunityId
    ) {
      await this.markOpportunityAsReserved(activity.commercialOpportunityId);
    }

    await this.activityCalendarSyncService.syncById(activity.id, 'update');
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

    if (
      activity.activityType !== ActivityType.PROPERTY_SEARCH &&
      activity.activityType !== ActivityType.RESERVATION
    ) {
      throw new BadRequestException(
        'Solo las actividades de busqueda de propiedad y reservas se pueden compartir por WhatsApp',
      );
    }

    if (
      (activity.activityType === ActivityType.PROPERTY_SEARCH ||
        activity.activityType === ActivityType.RESERVATION) &&
      !activity.externalUrl
    ) {
      throw new BadRequestException('La actividad no tiene link para compartir');
    }

    if (activity.activityType === ActivityType.PROPERTY_SEARCH) {
      activity.whatsappComment = dto.whatsappComment?.trim() || activity.whatsappComment;
    }
    activity.whatsappSharedAt = new Date();
    await this.activitiesRepository.save(activity);
    await this.activityCalendarSyncService.syncById(activity.id, 'update');
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

    await this.activityCalendarSyncService.deleteExternal(activity);

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
        throw new NotFoundException('Prelisting no encontrado');
      }
    }
  }

  private assertPropertySearchPayload(activityType: ActivityType, externalUrl?: string) {
    if (activityType === ActivityType.PROPERTY_SEARCH && !externalUrl?.trim()) {
      throw new BadRequestException('La actividad de busqueda de propiedad requiere un link');
    }
  }

  private async markOpportunityAsReserved(commercialOpportunityId: number) {
    const opportunity = await this.opportunitiesRepository.findOne({
      where: { id: commercialOpportunityId },
    });

    if (!opportunity || opportunity.status !== CommercialOpportunityStatus.OPEN) {
      return;
    }

    if (opportunity.stage !== CommercialOpportunityStage.RESERVED) {
      opportunity.stage = CommercialOpportunityStage.RESERVED;
      await this.opportunitiesRepository.save(opportunity);
    }
  }

  private async resolvePropertySearchPreview(
    externalUrl: string | null,
    fallbackTitle: string | null,
    currentActivity: Activity | null,
  ): Promise<ActivityPreviewSnapshot> {
    if (!externalUrl) {
      return createEmptyActivityPreview();
    }

    const hasSameUrl = currentActivity?.externalUrl?.trim() === externalUrl;
    const fallback = {
      imageUrl: null,
      title: fallbackTitle?.trim() || (hasSameUrl ? currentActivity?.externalPreviewTitle : null) || null,
      description: hasSameUrl ? currentActivity?.externalPreviewDescription ?? null : null,
      domain: extractDomain(externalUrl),
      fetchedAt: hasSameUrl ? currentActivity?.externalPreviewFetchedAt ?? null : null,
    } satisfies ActivityPreviewSnapshot;

    if (
      hasSameUrl &&
      (currentActivity.externalPreviewImageUrl ||
        currentActivity.externalPreviewTitle ||
        currentActivity.externalPreviewDescription ||
        currentActivity.externalPreviewDomain)
    ) {
      return {
        imageUrl: currentActivity.externalPreviewImageUrl,
        title: currentActivity.externalPreviewTitle ?? fallback.title,
        description: currentActivity.externalPreviewDescription,
        domain: currentActivity.externalPreviewDomain ?? fallback.domain,
        fetchedAt: currentActivity.externalPreviewFetchedAt,
      };
    }

    try {
      const html = await fetchActivityPreviewHtml(externalUrl);
      const parsed = parseActivityPreviewMetadata(html, externalUrl);
      const fetchedAt =
        parsed.imageUrl || parsed.title || parsed.description ? new Date() : fallback.fetchedAt;

      return {
        imageUrl: parsed.imageUrl,
        title: parsed.title ?? fallback.title,
        description: parsed.description ?? null,
        domain: parsed.domain ?? fallback.domain,
        fetchedAt,
      };
    } catch {
      return fallback;
    }
  }

  private async resolveOpportunityForActivityDraft(params: {
    teamId: number;
    contactId: number | null;
    propertyId: number | null;
    appraisalRequestId: number | null;
    activityType: ActivityType;
  }) {
    if (params.activityType === ActivityType.VISIT && params.contactId) {
      return this.opportunitiesRepository.findOne({
        where: {
          teamId: params.teamId,
          contactId: params.contactId,
          operationType: OperationType.BUY,
          status: CommercialOpportunityStatus.OPEN,
        },
        order: { updatedAt: 'DESC' },
      });
    }

    if (params.appraisalRequestId) {
      return this.opportunitiesRepository.findOne({
        where: {
          teamId: params.teamId,
          appraisalRequestId: params.appraisalRequestId,
        },
      });
    }

    if (params.propertyId) {
      return this.opportunitiesRepository.findOne({
        where: {
          teamId: params.teamId,
          propertyId: params.propertyId,
        },
        order: { updatedAt: 'DESC' },
      });
    }

    if (
      params.contactId &&
      (params.activityType === ActivityType.SALE_DEED ||
        params.activityType === ActivityType.PURCHASE_DEED)
    ) {
      return this.opportunitiesRepository.findOne({
        where: {
          teamId: params.teamId,
          contactId: params.contactId,
          operationType:
            params.activityType === ActivityType.SALE_DEED
              ? OperationType.SALE
              : OperationType.BUY,
          status: CommercialOpportunityStatus.OPEN,
        },
        order: { updatedAt: 'DESC' },
      });
    }

    return null;
  }

  private async upsertSaleOpportunityFromAppraisal(params: {
    teamId: number;
    ownerUserId: number;
    contactId: number | null;
    appraisalRequestId: number;
    sourceActivityId: number;
    propertyId: number | null;
    propertyAddress: string | null;
  }) {
    if (!params.contactId) {
      throw new BadRequestException(
        'La oportunidad comercial de venta requiere contacto',
      );
    }

    const existing = await this.opportunitiesRepository.findOne({
      where: {
        teamId: params.teamId,
        appraisalRequestId: params.appraisalRequestId,
      },
    });

    const stage = params.propertyId
      ? CommercialOpportunityStage.PROPERTY_READY
      : CommercialOpportunityStage.PRELISTING_SENT;
    const title = params.propertyAddress?.trim()
      ? `Venta - ${params.propertyAddress.trim()}`
      : 'Venta - Prelisting';

    if (existing) {
      existing.contactId = params.contactId;
      existing.sourceActivityId = params.sourceActivityId;
      existing.propertyId = params.propertyId ?? null;
      existing.stage = stage;
      existing.status = CommercialOpportunityStatus.OPEN;
      existing.title = title;
      existing.closedAt = null;
      existing.lostReason = null;
      return this.opportunitiesRepository.save(existing);
    }

    return this.opportunitiesRepository.save(
      this.opportunitiesRepository.create({
        teamId: params.teamId,
        ownerUserId: params.ownerUserId,
        contactId: params.contactId,
        operationType: OperationType.SALE,
        stage,
        status: CommercialOpportunityStatus.OPEN,
        isExternalBuyerLead: false,
        sourceActivityId: params.sourceActivityId,
        searchRequirementId: null,
        appraisalRequestId: params.appraisalRequestId,
        propertyId: params.propertyId ?? null,
        title,
        summary: null,
        lostReason: null,
        closedAt: null,
      }),
    );
  }
}

function sanitizeReservationData(
  value: Record<string, unknown> | undefined,
  defaultAgentName: string | null,
): ReservationActivityData | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return {
    agentName: readOptionalString(value.agentName) ?? defaultAgentName,
    operationType: readEnumValue<OperationType>(value.operationType, [
      OperationType.SALE,
      OperationType.BUY,
      OperationType.RENT,
    ]),
    operationAmount: readOptionalNumber(value.operationAmount),
    operationCurrency: readEnumValue<CurrencyType>(value.operationCurrency, [
      CurrencyType.USD,
      CurrencyType.ARS,
    ]),
    propertyAddress: readOptionalString(value.propertyAddress),
    propertyNeighborhood: readOptionalString(value.propertyNeighborhood),
    propertyType: readEnumValue<PropertyType>(value.propertyType, [
      PropertyType.HOUSE,
      PropertyType.APARTMENT,
      PropertyType.PH,
      PropertyType.LAND,
      PropertyType.OFFICE,
      PropertyType.COMMERCIAL,
      PropertyType.OTHER,
    ]),
    sidesCount: readOptionalInteger(value.sidesCount),
    commissionPercent: readOptionalNumber(value.commissionPercent),
    reservationAmount: readOptionalNumber(value.reservationAmount),
    reservationCurrency: readEnumValue<CurrencyType>(value.reservationCurrency, [
      CurrencyType.USD,
      CurrencyType.ARS,
    ]),
    sharedWithRealEstate: readOptionalBoolean(value.sharedWithRealEstate),
    conformed: readOptionalBoolean(value.conformed),
    credit: readOptionalBoolean(value.credit),
    relocation: readOptionalBoolean(value.relocation),
    estimatedClosingMonth: readOptionalString(value.estimatedClosingMonth),
    observations: readOptionalString(value.observations),
  };
}

function readOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function readOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readOptionalInteger(value: unknown) {
  const numeric = readOptionalNumber(value);
  return numeric === null ? null : Math.trunc(numeric);
}

function readOptionalBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  }

  return null;
}

function readEnumValue<T extends string>(value: unknown, allowedValues: T[]) {
  return typeof value === 'string' && allowedValues.includes(value as T)
    ? (value as T)
    : null;
}

type ActivityPreviewSnapshot = {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
  fetchedAt: Date | null;
};

function createEmptyActivityPreview(): ActivityPreviewSnapshot {
  return {
    imageUrl: null,
    title: null,
    description: null,
    domain: null,
    fetchedAt: null,
  };
}

async function fetchActivityPreviewHtml(url: string) {
  try {
    return await fetchActivityPreviewHtmlWithFetch(url);
  } catch (error) {
    if (!requiresBrowserPreview(url, error)) {
      throw error;
    }

    return fetchActivityPreviewHtmlWithBrowser(url);
  }
}

async function fetchActivityPreviewHtmlWithFetch(url: string) {
  const normalizedUrl = normalizeActivityPreviewRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(normalizedUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        Referer: `${requestOrigin}/`,
        Origin: requestOrigin,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`preview-fetch:${response.status}:${normalizedUrl}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchActivityPreviewHtmlWithBrowser(url: string) {
  const normalizedUrl = normalizeActivityPreviewRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const timeout = Number.parseInt(process.env.PORTAL_BROWSER_TIMEOUT_MS ?? '25000', 10);
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      locale: 'es-AR',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 1600 },
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        Referer: `${requestOrigin}/`,
        Origin: requestOrigin,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (/mercadolibre\.com\.ar/i.test(normalizedUrl)) {
      await context.addCookies([
        {
          name: '_bm_skipml',
          value: 'true',
          domain: '.mercadolibre.com.ar',
          path: '/',
          expires: Math.floor(Date.now() / 1000) + 300,
        },
      ]);
    }

    const page = await context.newPage();
    const response = await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    if (response && !response.ok()) {
      throw new Error(`preview-browser:${response.status()}:${normalizedUrl}`);
    }

    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 10000) }).catch(() => {});
    const html = await page.content();
    await context.close();
    return html;
  } finally {
    await browser.close();
  }
}

function normalizeActivityPreviewRequestUrl(url: string) {
  return url.replace('://www.zonaprop.com.ar', '://zonaprop.com.ar');
}

function requiresBrowserPreview(url: string, error: unknown) {
  if (url.includes('zonaprop.com.ar') || url.includes('mercadolibre.com.ar')) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /preview-fetch:403:|preview-fetch:429:|preview-fetch:503:/i.test(error.message);
}

function buildDefaultActivityTitle(activityType: ActivityType) {
  const titles: Record<ActivityType, string> = {
    [ActivityType.CALL]: 'Llamada',
    [ActivityType.WHATSAPP]: 'WhatsApp',
    [ActivityType.EMAIL]: 'Email',
    [ActivityType.INSTAGRAM]: 'Instagram',
    [ActivityType.MEETING]: 'Reunion',
    [ActivityType.VISIT]: 'Visita',
    [ActivityType.NOTE]: 'Nota',
    [ActivityType.FOLLOW_UP]: 'Seguimiento',
    [ActivityType.PROPERTY_SEARCH]: 'Busqueda de propiedad',
    [ActivityType.APPRAISAL_REQUEST]: 'Prelisting',
    [ActivityType.MARKET_ANALYSIS]: 'Analisis de mercado',
    [ActivityType.PHOTO_SESSION]: 'Sesion de fotos',
    [ActivityType.RESERVATION]: 'Reserva',
    [ActivityType.SALE_DEED]: 'Escritura de venta',
    [ActivityType.PURCHASE_DEED]: 'Escritura de compra',
  };

  return titles[activityType];
}
