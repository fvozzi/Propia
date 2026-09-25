import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { GoogleCalendarService } from '../calendar/google-calendar.service';
import { paginate } from '../common/pagination';
import { BuyerPropertyCandidateWorkflowStatus } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import {
  buildVisitCalendarIcs,
  sanitizeSharedPropertyUrl,
} from '../use-cases/visit-share-links.use-case';
import { CreateVisitDto } from './dto/create-visit.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { Visit } from './visit.entity';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly visitsRepository: Repository<Visit>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(BuyerPropertyCandidate)
    private readonly candidatesRepository: Repository<BuyerPropertyCandidate>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(dto: CreateVisitDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const relations = await this.resolveScopedRelations(dto, teamId);
    const candidate = relations.candidate;
    const propertyId = dto.propertyId ?? candidate?.propertyId ?? null;
    const externalPropertyTitle =
      dto.externalPropertyTitle?.trim() || candidate?.title || null;

    const visit = this.visitsRepository.create({
      teamId,
      ownerUserId: user.sub,
      publicToken: createVisitPublicToken(),
      propertyId,
      contactId: dto.contactId,
      colleagueContactId: relations.colleagueContact?.id ?? null,
      colleagueName:
        dto.colleagueName?.trim() ||
        relations.colleagueContact?.displayName ||
        candidate?.agentName ||
        null,
      colleagueWhatsapp:
        dto.colleagueWhatsapp?.trim() ||
        relations.colleagueContact?.whatsapp?.trim() ||
        relations.colleagueContact?.phone?.trim() ||
        candidate?.agentWhatsapp ||
        null,
      searchRequirementId:
        dto.searchRequirementId ?? candidate?.searchRequirementId ?? null,
      buyerPropertyCandidateId: candidate?.id ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      status: dto.status,
      notes: dto.notes?.trim() || null,
      externalUrl: dto.externalUrl?.trim() || candidate?.url || null,
      externalPropertyTitle,
      externalPropertyAddress:
        dto.externalPropertyAddress?.trim() ||
        formatCandidateAddress(candidate) ||
        null,
      googleSyncStatus: 'PENDING',
    });

    const savedVisit = await this.visitsRepository.save(visit);
    if (candidate) {
      candidate.workflowStatus =
        BuyerPropertyCandidateWorkflowStatus.VISIT_SCHEDULED;
      candidate.scheduledVisitAt = savedVisit.scheduledAt;
      await this.candidatesRepository.save(candidate);
    }
    return this.syncVisit(savedVisit.id, user, 'create');
  }

  async findAll(query: QueryVisitsDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.visitsRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.contact', 'contact')
      .leftJoinAndSelect('visit.property', 'property')
      .leftJoinAndSelect('visit.colleagueContact', 'colleagueContact')
      .leftJoinAndSelect('visit.searchRequirement', 'searchRequirement')
      .leftJoinAndSelect('visit.buyerPropertyCandidate', 'buyerPropertyCandidate')
      .where('visit.teamId = :teamId', { teamId })
      .orderBy('visit.scheduledAt', 'ASC');

    if (query.date) {
      qb.andWhere('DATE(visit.scheduledAt) = :visitDate', { visitDate: query.date });
    }

    if (query.status) {
      qb.andWhere('visit.status = :status', { status: query.status });
    }

    if (query.fromDate) {
      qb.andWhere('DATE(visit.scheduledAt) >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('DATE(visit.scheduledAt) <= :toDate', { toDate: query.toDate });
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const visit = await this.visitsRepository.findOne({
      where: { id, teamId },
      relations: {
        contact: true,
        property: true,
        colleagueContact: true,
        searchRequirement: true,
        buyerPropertyCandidate: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    return visit;
  }

  async findPublicPropertyUrl(publicToken: string) {
    const visit = await this.findPublicVisit(publicToken);
    const propertyUrl =
      visit.externalUrl?.trim() || visit.property?.publicationUrl?.trim() || null;

    if (!propertyUrl) {
      throw new NotFoundException('La visita no tiene un link de propiedad');
    }

    return sanitizeSharedPropertyUrl(propertyUrl);
  }

  async buildPublicCalendar(publicToken: string) {
    const visit = await this.findPublicVisit(publicToken);
    return buildVisitCalendarIcs(visit);
  }

  async update(id: number, dto: UpdateVisitDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const visit = await this.visitsRepository.findOne({
      where: { id, teamId },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    const nextContactId = dto.contactId ?? visit.contactId;
    const relations = await this.resolveScopedRelations(
      {
        contactId: nextContactId,
        propertyId:
          dto.propertyId === undefined ? visit.propertyId : dto.propertyId,
        colleagueContactId:
          dto.colleagueContactId === undefined
            ? visit.colleagueContactId
            : dto.colleagueContactId,
        searchRequirementId:
          dto.searchRequirementId === undefined
            ? visit.searchRequirementId
            : dto.searchRequirementId,
        buyerPropertyCandidateId:
          dto.buyerPropertyCandidateId === undefined
            ? visit.buyerPropertyCandidateId
            : dto.buyerPropertyCandidateId,
        externalPropertyTitle:
          dto.externalPropertyTitle === undefined
            ? visit.externalPropertyTitle ?? undefined
            : dto.externalPropertyTitle,
      },
      teamId,
    );
    const candidate = relations.candidate;
    const nextPropertyId =
      dto.propertyId === undefined
        ? visit.propertyId ?? candidate?.propertyId ?? null
        : dto.propertyId ?? candidate?.propertyId ?? null;
    Object.assign(visit, {
      propertyId: nextPropertyId,
      contactId: nextContactId,
      colleagueContactId:
        dto.colleagueContactId === undefined
          ? visit.colleagueContactId
          : relations.colleagueContact?.id ?? null,
      colleagueName:
        dto.colleagueName === undefined
          ? visit.colleagueName
          : dto.colleagueName?.trim() ||
            relations.colleagueContact?.displayName ||
            candidate?.agentName ||
            null,
      colleagueWhatsapp:
        dto.colleagueWhatsapp === undefined
          ? visit.colleagueWhatsapp
          : dto.colleagueWhatsapp?.trim() ||
            relations.colleagueContact?.whatsapp?.trim() ||
            relations.colleagueContact?.phone?.trim() ||
            candidate?.agentWhatsapp ||
            null,
      searchRequirementId:
        dto.searchRequirementId === undefined
          ? visit.searchRequirementId
          : dto.searchRequirementId ?? candidate?.searchRequirementId ?? null,
      buyerPropertyCandidateId:
        dto.buyerPropertyCandidateId === undefined
          ? visit.buyerPropertyCandidateId
          : candidate?.id ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : visit.scheduledAt,
      status: dto.status ?? visit.status,
      notes: dto.notes === undefined ? visit.notes : dto.notes?.trim() || null,
      externalUrl:
        dto.externalUrl === undefined
          ? visit.externalUrl
          : dto.externalUrl?.trim() || candidate?.url || null,
      externalPropertyTitle:
        dto.externalPropertyTitle === undefined
          ? visit.externalPropertyTitle
          : dto.externalPropertyTitle?.trim() || candidate?.title || null,
      externalPropertyAddress:
        dto.externalPropertyAddress === undefined
          ? visit.externalPropertyAddress
          : dto.externalPropertyAddress?.trim() ||
            formatCandidateAddress(candidate) ||
            null,
      googleSyncStatus: 'PENDING',
      googleSyncError: null,
    });
    await this.visitsRepository.save(visit);

    return this.syncVisit(id, user, 'update');
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const visit = await this.visitsRepository.findOne({
      where: { id, teamId },
      relations: {
        contact: true,
        property: true,
        colleagueContact: true,
        searchRequirement: true,
        buyerPropertyCandidate: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    try {
      await this.googleCalendarService.syncVisitDelete(visit.ownerUserId, visit);
    } catch {
      // Ignore remote delete failures to preserve local delete.
    }

    await this.visitsRepository.remove(visit);
    return { success: true };
  }

  async syncCalendar(id: number, user: AuthenticatedUser) {
    return this.syncVisit(id, user, 'update');
  }

  private async syncVisit(
    visitId: number,
    user: AuthenticatedUser,
    mode: 'create' | 'update',
  ) {
    const teamId = requireActiveTeamId(user);
    const visit = await this.visitsRepository.findOne({
      where: { id: visitId, teamId },
      relations: {
        contact: true,
        property: true,
        colleagueContact: true,
        searchRequirement: true,
        buyerPropertyCandidate: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    try {
      const result =
        mode === 'create'
          ? await this.googleCalendarService.syncVisitCreate(visit.ownerUserId, visit)
          : await this.googleCalendarService.syncVisitUpdate(visit.ownerUserId, visit);

      Object.assign(visit, result);
    } catch (error) {
      visit.googleSyncStatus = 'ERROR';
      visit.googleSyncError = error instanceof Error ? error.message : 'Unknown sync error';
    }

    await this.visitsRepository.save(visit);
    return this.findOne(visitId, user);
  }

  private async findPublicVisit(publicToken: string) {
    const visit = await this.visitsRepository.findOne({
      where: { publicToken },
      relations: {
        contact: true,
        property: true,
        colleagueContact: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    return visit;
  }

  private async resolveScopedRelations(
    dto: Pick<CreateVisitDto, 'contactId'> & Partial<CreateVisitDto>,
    teamId: number,
  ) {
    const candidate = dto.buyerPropertyCandidateId
      ? await this.candidatesRepository.findOne({
          where: {
            id: dto.buyerPropertyCandidateId,
            teamId,
            contactId: dto.contactId,
          },
          relations: { property: true },
        })
      : null;
    const propertyId = dto.propertyId ?? candidate?.propertyId ?? null;
    const searchRequirementId =
      dto.searchRequirementId ?? candidate?.searchRequirementId ?? null;
    const [contact, property, colleagueContact, searchRequirement] =
      await Promise.all([
        this.contactsRepository.findOne({
          where: { id: dto.contactId, teamId },
        }),
        propertyId
          ? this.propertiesRepository.findOne({
              where: { id: propertyId, teamId },
            })
          : Promise.resolve(null),
        dto.colleagueContactId
          ? this.contactsRepository.findOne({
              where: { id: dto.colleagueContactId, teamId },
            })
          : Promise.resolve(null),
        searchRequirementId
          ? this.requirementsRepository.findOne({
              where: {
                id: searchRequirementId,
                teamId,
                contactId: dto.contactId,
              },
            })
          : Promise.resolve(null),
      ]);

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    if (propertyId && !property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    if (dto.colleagueContactId && !colleagueContact) {
      throw new NotFoundException('Colega no encontrado');
    }

    if (dto.buyerPropertyCandidateId && !candidate) {
      throw new NotFoundException('Propiedad de la busqueda no encontrada');
    }

    if (searchRequirementId && !searchRequirement) {
      throw new NotFoundException('Busqueda de propiedad no encontrada');
    }

    if (
      !propertyId &&
      !dto.externalPropertyTitle?.trim() &&
      !candidate?.title?.trim()
    ) {
      throw new NotFoundException(
        'La visita necesita una propiedad del CRM o un titulo externo de propiedad',
      );
    }

    return { contact, property, colleagueContact, searchRequirement, candidate };
  }
}

function formatCandidateAddress(candidate: BuyerPropertyCandidate | null) {
  if (!candidate?.property?.address) {
    return null;
  }

  return [candidate.property.address, candidate.property.city]
    .filter(Boolean)
    .join(', ');
}

function createVisitPublicToken() {
  return randomBytes(9).toString('base64url');
}
