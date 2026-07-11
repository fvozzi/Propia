import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { ActivityCalendarSyncService } from '../activities/activity-calendar-sync.service';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { paginate } from '../common/pagination';
import { Contact } from '../contacts/contact.entity';
import {
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
  SearchRequirementStatus,
} from '../common/enums';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { calculateAppraisalAreas, summarizeAppraisalAnswers } from '../use-cases/appraisal-initial-intake.use-case';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { Visit } from '../visits/visit.entity';
import { buildPropertyMapItems } from '../use-cases/property-map.use-case';
import { PropertyPhoto } from './property-photo.entity';
import { Property } from './property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertiesDto } from './dto/query-properties.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

type PropertyDraftPayload = Partial<CreatePropertyDto> & {
  description?: string | null;
  neighborhood?: string | null;
  expenses?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  rooms?: number | null;
  coveredArea?: number | null;
  semiCoveredArea?: number | null;
  uncoveredArea?: number | null;
  totalArea?: number | null;
  weightedArea?: number | null;
  floor?: number | null;
  amenities?: string | null;
  ageYears?: number | null;
  hasGarage?: boolean | null;
  ownerContactId?: number | null;
  appraisalRequestId?: number | null;
  privateNotes?: string | null;
};

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(PropertyPhoto)
    private readonly photosRepository: Repository<PropertyPhoto>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(CommercialOpportunity)
    private readonly opportunitiesRepository: Repository<CommercialOpportunity>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(Visit)
    private readonly visitsRepository: Repository<Visit>,
    private readonly activityCalendarSyncService: ActivityCalendarSyncService,
  ) {}

  async create(dto: CreatePropertyDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const appraisalRequest = dto.appraisalRequestId
      ? await this.assertScopedAppraisalRequest(dto.appraisalRequestId, teamId)
      : null;
    const draft = this.applyAppraisalDefaults(dto, appraisalRequest);
    this.assertAppraisalOwnerConsistency(draft.ownerContactId ?? null, appraisalRequest);
    await this.assertOwnerContact(draft.ownerContactId ?? null, teamId);

    const property = this.propertiesRepository.create({
      ...draft,
      teamId,
      ownerUserId: user.sub,
      ownerContactId: draft.ownerContactId ?? null,
      appraisalRequestId: appraisalRequest?.id ?? draft.appraisalRequestId ?? null,
      photos: (draft.photos ?? []).map((photo) => this.photosRepository.create(photo)),
    });

    const saved = await this.propertiesRepository.save(property);
    await this.syncAppraisalActivity(saved.id, saved.appraisalRequestId ?? null, teamId);
    await this.linkSaleRequirement(saved, teamId);
    await this.syncCommercialOpportunity(saved, teamId, user.sub);
    return this.findOne(saved.id, user);
  }

  async findAll(query: QueryPropertiesDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.propertiesRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.photos', 'photos')
      .leftJoinAndSelect('property.ownerContact', 'ownerContact')
      .leftJoinAndSelect('property.appraisalRequest', 'appraisalRequest')
      .where('property.teamId = :teamId', { teamId })
      .orderBy('property.updatedAt', 'DESC');

    if (query.status) {
      qb.andWhere('property.status = :status', { status: query.status });
    }

    if (query.operationType) {
      qb.andWhere('property.operationType = :operationType', {
        operationType: query.operationType,
      });
    }

    if (query.propertyType) {
      qb.andWhere('property.propertyType = :propertyType', {
        propertyType: query.propertyType,
      });
    }

    if (query.neighborhood) {
      qb.andWhere('property.neighborhood ILIKE :neighborhood', {
        neighborhood: `%${query.neighborhood}%`,
      });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('property.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('property.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const property = await this.propertiesRepository.findOne({
      where: { id, teamId },
      relations: {
        photos: true,
        ownerContact: {
          roles: true,
        },
        appraisalRequest: {
          contact: true,
        },
        activities: {
          contact: true,
        },
        visits: {
          contact: true,
        },
      },
      order: {
        photos: {
          orderIndex: 'ASC',
        },
        activities: {
          activityDate: 'DESC',
        },
        visits: {
          scheduledAt: 'DESC',
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    return property;
  }

  async findMapItems(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const [properties, visits] = await Promise.all([
      this.propertiesRepository.find({
        where: { teamId },
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          neighborhood: true,
          operationType: true,
          propertyType: true,
          status: true,
          price: true,
          currency: true,
        },
      }),
      this.visitsRepository.find({
        where: { teamId },
        select: {
          propertyId: true,
          scheduledAt: true,
          status: true,
        },
      }),
    ]);

    return buildPropertyMapItems(properties, visits);
  }

  async update(id: number, dto: UpdatePropertyDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const property = await this.propertiesRepository.findOne({
      where: { id, teamId },
      relations: { appraisalRequest: true },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const nextAppraisalRequestId =
      dto.appraisalRequestId === undefined ? property.appraisalRequestId : dto.appraisalRequestId;
    const appraisalRequest = nextAppraisalRequestId
      ? await this.assertScopedAppraisalRequest(nextAppraisalRequestId, teamId, property.id)
      : null;
    const { photos, ...rest } = dto;
    const draftSource = {
      ...property,
      ...rest,
      appraisalRequestId: nextAppraisalRequestId ?? undefined,
    } as PropertyDraftPayload;
    const draft = this.applyAppraisalDefaults(draftSource, appraisalRequest);
    const nextOwnerContactId = draft.ownerContactId ?? null;
    this.assertAppraisalOwnerConsistency(nextOwnerContactId, appraisalRequest);
    await this.assertOwnerContact(nextOwnerContactId ?? null, teamId);

    Object.assign(property, {
      ...rest,
      ...draft,
      ownerContactId: nextOwnerContactId ?? null,
      appraisalRequestId: appraisalRequest?.id ?? nextAppraisalRequestId ?? null,
    });
    await this.propertiesRepository.save(property);

    if (photos) {
      await this.photosRepository
        .createQueryBuilder()
        .delete()
        .from(PropertyPhoto)
        .where('"propertyId" = :id', { id })
        .execute();

      if (photos.length > 0) {
        await this.photosRepository.save(
          photos.map((photo) =>
            this.photosRepository.create({
              ...photo,
              property,
            }),
          ),
        );
      }
    }

    await this.syncAppraisalActivity(property.id, property.appraisalRequestId ?? null, teamId);
    await this.linkSaleRequirement(property, teamId);
    await this.syncCommercialOpportunity(property, teamId, property.ownerUserId);
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const property = await this.propertiesRepository.findOne({
      where: { id, teamId },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    await this.propertiesRepository.remove(property);
    return { success: true };
  }

  private async assertOwnerContact(contactId: number | null, teamId: number | null) {
    if (!contactId || !teamId) {
      return;
    }

    const contact = await this.contactsRepository.findOne({
      where: { id: contactId, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto propietario no encontrado');
    }
  }

  private async assertScopedAppraisalRequest(appraisalRequestId: number, teamId: number, propertyId?: number) {
    const appraisalRequest = await this.appraisalRequestsRepository.findOne({
      where: { id: appraisalRequestId, teamId },
      relations: { properties: true },
    });

    if (!appraisalRequest) {
      throw new NotFoundException('Prelisting no encontrado');
    }

    if (!appraisalRequest.submittedAt) {
      throw new BadRequestException('El prelisting seleccionado todavia no fue respondido');
    }

    const linkedProperty = appraisalRequest.properties.find((item) => item.id !== propertyId);
    if (linkedProperty) {
      throw new BadRequestException('El prelisting seleccionado ya esta vinculado a otra propiedad');
    }

    return appraisalRequest;
  }

  private assertAppraisalOwnerConsistency(ownerContactId: number | null, appraisalRequest: AppraisalRequest | null) {
    if (!appraisalRequest || !ownerContactId) {
      return;
    }

    if (ownerContactId !== appraisalRequest.contactId) {
      throw new BadRequestException('La propiedad vinculada a una tasacion debe conservar el mismo contacto propietario');
    }
  }

  private applyAppraisalDefaults(dto: PropertyDraftPayload, appraisalRequest: AppraisalRequest | null) {
    const coveredArea = dto.coveredArea ?? appraisalRequest?.coveredArea ?? null;
    const semiCoveredArea = dto.semiCoveredArea ?? appraisalRequest?.semiCoveredArea ?? null;
    const uncoveredArea = dto.uncoveredArea ?? appraisalRequest?.uncoveredArea ?? null;
    const computedAreas = calculateAppraisalAreas({
      coveredArea,
      semiCoveredArea,
      uncoveredArea,
    });
    const privateNotes =
      dto.privateNotes !== undefined
        ? dto.privateNotes
        : appraisalRequest
          ? this.buildPropertyPrivateNotes(appraisalRequest)
          : undefined;

    return {
      ...dto,
      address: dto.address ?? appraisalRequest?.propertyAddress ?? undefined,
      city: dto.city ?? appraisalRequest?.city ?? undefined,
      neighborhood: dto.neighborhood ?? appraisalRequest?.neighborhood ?? undefined,
      operationType: dto.operationType ?? appraisalRequest?.operationType ?? undefined,
      propertyType: dto.propertyType ?? appraisalRequest?.propertyType ?? undefined,
      expenses: dto.expenses ?? appraisalRequest?.expenses ?? undefined,
      bedrooms: dto.bedrooms ?? appraisalRequest?.bedrooms ?? undefined,
      bathrooms: dto.bathrooms ?? appraisalRequest?.bathrooms ?? undefined,
      rooms: dto.rooms ?? appraisalRequest?.rooms ?? undefined,
      coveredArea: coveredArea ?? undefined,
      semiCoveredArea: semiCoveredArea ?? undefined,
      uncoveredArea: uncoveredArea ?? undefined,
      totalArea: dto.totalArea ?? appraisalRequest?.totalArea ?? computedAreas.totalArea ?? undefined,
      weightedArea: dto.weightedArea ?? appraisalRequest?.weightedArea ?? computedAreas.weightedArea ?? undefined,
      floor: dto.floor ?? appraisalRequest?.floor ?? undefined,
      amenities: dto.amenities ?? appraisalRequest?.amenities ?? undefined,
      orientation: dto.orientation ?? appraisalRequest?.orientation ?? undefined,
      disposition: dto.disposition ?? appraisalRequest?.disposition ?? undefined,
      ageYears: dto.ageYears ?? appraisalRequest?.ageYears ?? undefined,
      hasGarage: dto.hasGarage ?? appraisalRequest?.hasGarage ?? undefined,
      ownerContactId: dto.ownerContactId ?? appraisalRequest?.contactId ?? undefined,
      privateNotes,
      appraisalRequestId: dto.appraisalRequestId ?? appraisalRequest?.id ?? undefined,
    };
  }

  private buildPropertyPrivateNotes(appraisalRequest: AppraisalRequest) {
    const noteSections = [
      appraisalRequest.conditionNotes?.trim()
        ? `Estado y mejoras: ${appraisalRequest.conditionNotes.trim()}`
        : null,
      appraisalRequest.valuationReason?.trim()
        ? `Motivo de tasacion: ${appraisalRequest.valuationReason.trim()}`
        : null,
      appraisalRequest.availabilityNotes?.trim()
        ? `Disponibilidad: ${appraisalRequest.availabilityNotes.trim()}`
        : null,
      appraisalRequest.additionalNotes?.trim()
        ? `Notas adicionales: ${appraisalRequest.additionalNotes.trim()}`
        : null,
    ].filter((value): value is string => Boolean(value));

    if (noteSections.length > 0) {
      return noteSections.join('\n\n');
    }

    const summary = summarizeAppraisalAnswers(appraisalRequest);
    return summary.trim() || null;
  }

  private async syncAppraisalActivity(propertyId: number, appraisalRequestId: number | null, teamId: number) {
    if (appraisalRequestId) {
      const linkedActivity = await this.activitiesRepository.findOne({
        where: { appraisalRequestId, teamId },
      });

      if (linkedActivity) {
        linkedActivity.propertyId = propertyId;
        await this.activitiesRepository.save(linkedActivity);
        await this.activityCalendarSyncService.syncById(linkedActivity.id, 'update');
      }
    }

    const orphanActivities = await this.activitiesRepository.find({
      where: { propertyId, teamId },
    });

    const staleActivities = orphanActivities.filter(
      (activity) => activity.appraisalRequestId !== null && activity.appraisalRequestId !== appraisalRequestId,
    );

    if (staleActivities.length > 0) {
      staleActivities.forEach((activity) => {
        activity.propertyId = null;
      });
      await this.activitiesRepository.save(staleActivities);
      await this.activityCalendarSyncService.syncMany(staleActivities.map((activity) => activity.id));
    }
  }

  private async linkSaleRequirement(property: Property, teamId: number) {
    if (!property.ownerContactId || property.operationType !== OperationType.SALE) {
      return;
    }

    const matchingRequirements = await this.requirementsRepository.find({
      where: {
        teamId,
        contactId: property.ownerContactId,
        operationType: OperationType.SALE,
        status: SearchRequirementStatus.ACTIVE,
      },
      order: { createdAt: 'ASC' },
    });

    const unlinkedRequirements = matchingRequirements.filter((requirement) => !requirement.propertyId);
    if (unlinkedRequirements.length !== 1) {
      return;
    }

    unlinkedRequirements[0].propertyId = property.id;
    await this.requirementsRepository.save(unlinkedRequirements[0]);
  }

  private async syncCommercialOpportunity(
    property: Property,
    teamId: number,
    ownerUserId: number,
  ) {
    if (!property.ownerContactId || property.operationType !== OperationType.SALE) {
      return;
    }

    const linkedRequirement = await this.requirementsRepository.findOne({
      where: {
        teamId,
        propertyId: property.id,
        operationType: OperationType.SALE,
      },
      order: { createdAt: 'ASC' },
    });

    const opportunity =
      (property.appraisalRequestId
        ? await this.opportunitiesRepository.findOne({
            where: {
              teamId,
              appraisalRequestId: property.appraisalRequestId,
            },
          })
        : null) ??
      (linkedRequirement
        ? await this.opportunitiesRepository.findOne({
            where: {
              teamId,
              searchRequirementId: linkedRequirement.id,
            },
          })
        : null) ??
      (await this.opportunitiesRepository.findOne({
        where: {
          teamId,
          propertyId: property.id,
        },
      }));

    const title = property.title?.trim()
      ? `Venta - ${property.title.trim()}`
      : `Venta - ${property.address}`;

    if (opportunity) {
      opportunity.contactId = property.ownerContactId;
      opportunity.propertyId = property.id;
      opportunity.operationType = OperationType.SALE;
      opportunity.stage = CommercialOpportunityStage.PROPERTY_READY;
      opportunity.status = CommercialOpportunityStatus.OPEN;
      opportunity.title = title;
      if (linkedRequirement) {
        opportunity.searchRequirementId = linkedRequirement.id;
      }
      await this.opportunitiesRepository.save(opportunity);
      return;
    }

    await this.opportunitiesRepository.save(
      this.opportunitiesRepository.create({
        teamId,
        ownerUserId,
        contactId: property.ownerContactId,
        operationType: OperationType.SALE,
        stage: CommercialOpportunityStage.PROPERTY_READY,
        status: CommercialOpportunityStatus.OPEN,
        sourceActivityId: null,
        searchRequirementId: linkedRequirement?.id ?? null,
        appraisalRequestId: property.appraisalRequestId ?? null,
        propertyId: property.id,
        title,
        summary: property.privateNotes?.trim() || null,
        lostReason: null,
        closedAt: null,
      }),
    );
  }
}
