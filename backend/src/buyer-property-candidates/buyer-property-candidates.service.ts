import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { BuyerPropertyShareStatus } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import {
  registerBuyerPropertyCandidate,
  shareBuyerPropertyCandidate,
} from '../use-cases/buyer-property-search.use-case';
import { BuyerPropertyCandidate } from './buyer-property-candidate.entity';
import { CreateBuyerPropertyCandidateDto } from './dto/create-buyer-property-candidate.dto';
import { ShareBuyerPropertyCandidateDto } from './dto/share-buyer-property-candidate.dto';
import { UpdateBuyerPropertyCandidateDto } from './dto/update-buyer-property-candidate.dto';

@Injectable()
export class BuyerPropertyCandidatesService {
  constructor(
    @InjectRepository(BuyerPropertyCandidate)
    private readonly candidatesRepository: Repository<BuyerPropertyCandidate>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
  ) {}

  async create(dto: CreateBuyerPropertyCandidateDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedContact(dto.contactId, teamId);
    const searchRequirementId = dto.searchRequirementId
      ? await this.assertScopedSearchRequirement(dto.searchRequirementId, dto.contactId, teamId)
      : null;
    const propertyId = dto.propertyId
      ? await this.assertScopedProperty(dto.propertyId, teamId)
      : null;

    const candidate = registerBuyerPropertyCandidate({
      contactId: dto.contactId,
      portal: dto.portal,
      url: dto.url,
      title: dto.title,
      internalNotes: dto.internalNotes,
      createdAt: new Date().toISOString(),
    });

    const created = this.candidatesRepository.create({
      contactId: candidate.contactId,
      portal: candidate.portal,
      url: candidate.url,
      title: candidate.title,
      internalNotes: candidate.internalNotes,
      shareStatus: BuyerPropertyShareStatus.PENDING_WHATSAPP,
      createdAt: new Date(candidate.createdAt),
      sharedAt: null,
      searchRequirementId,
      propertyId,
      shareComments: dto.shareComments?.trim() || null,
      workflowStatus: dto.workflowStatus,
      agentName: dto.agentName?.trim() || null,
      agentWhatsapp: dto.agentWhatsapp?.trim() || null,
      proposedScheduleOptions: dto.proposedScheduleOptions?.trim() || null,
      workflowNotes: dto.workflowNotes?.trim() || null,
      scheduledVisitAt: null,
      lastContactedAt: null,
      teamId,
      ownerUserId: user.sub,
    });

    return this.candidatesRepository.save(created);
  }

  async share(id: number, dto: ShareBuyerPropertyCandidateDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const candidate = await this.requireScopedCandidate(id, teamId);

    const shared = shareBuyerPropertyCandidate(
      {
        contactId: candidate.contactId,
        portal: candidate.portal,
        url: candidate.url,
        title: candidate.title,
        internalNotes: candidate.internalNotes,
        shareComments: candidate.shareComments,
        shareStatus: candidate.shareStatus,
        createdAt: candidate.createdAt.toISOString(),
        sharedAt: candidate.sharedAt?.toISOString() ?? null,
      },
      {
        comments: dto.shareComments ?? candidate.shareComments ?? undefined,
        sharedAt: new Date().toISOString(),
      },
    );

    Object.assign(candidate, {
      shareComments: shared.shareComments,
      shareStatus: BuyerPropertyShareStatus.SHARED_WHATSAPP,
      sharedAt: shared.sharedAt ? new Date(shared.sharedAt) : null,
    });

    return this.candidatesRepository.save(candidate);
  }

  async update(id: number, dto: UpdateBuyerPropertyCandidateDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const candidate = await this.requireScopedCandidate(id, teamId);
    const nextRequirementId =
      dto.searchRequirementId === undefined
        ? candidate.searchRequirementId
        : dto.searchRequirementId
          ? await this.assertScopedSearchRequirement(dto.searchRequirementId, candidate.contactId, teamId)
          : null;
    const nextPropertyId =
      dto.propertyId === undefined
        ? candidate.propertyId
        : dto.propertyId
          ? await this.assertScopedProperty(dto.propertyId, teamId)
          : null;

    Object.assign(candidate, {
      searchRequirementId: nextRequirementId,
      propertyId: nextPropertyId,
      portal: dto.portal?.trim() ?? candidate.portal,
      url: dto.url?.trim() ?? candidate.url,
      title: dto.title?.trim() ?? candidate.title,
      internalNotes:
        dto.internalNotes === undefined ? candidate.internalNotes : dto.internalNotes?.trim() || null,
      shareComments:
        dto.shareComments === undefined ? candidate.shareComments : dto.shareComments?.trim() || null,
      workflowStatus: dto.workflowStatus ?? candidate.workflowStatus,
      agentName: dto.agentName === undefined ? candidate.agentName : dto.agentName?.trim() || null,
      agentWhatsapp:
        dto.agentWhatsapp === undefined ? candidate.agentWhatsapp : dto.agentWhatsapp?.trim() || null,
      proposedScheduleOptions:
        dto.proposedScheduleOptions === undefined
          ? candidate.proposedScheduleOptions
          : dto.proposedScheduleOptions?.trim() || null,
      scheduledVisitAt:
        dto.scheduledVisitAt === undefined
          ? candidate.scheduledVisitAt
          : dto.scheduledVisitAt
            ? new Date(dto.scheduledVisitAt)
            : null,
      workflowNotes:
        dto.workflowNotes === undefined ? candidate.workflowNotes : dto.workflowNotes?.trim() || null,
      lastContactedAt:
        dto.lastContactedAt === undefined
          ? candidate.lastContactedAt
          : dto.lastContactedAt
            ? new Date(dto.lastContactedAt)
            : null,
    });

    return this.candidatesRepository.save(candidate);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const candidate = await this.requireScopedCandidate(id, teamId);
    await this.candidatesRepository.remove(candidate);
    return { success: true };
  }

  private async requireScopedCandidate(id: number, teamId: number) {
    const candidate = await this.candidatesRepository.findOne({
      where: { id, teamId },
      relations: {
        property: true,
        searchRequirement: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidato de propiedad no encontrado');
    }

    return candidate;
  }

  private async assertScopedContact(contactId: number, teamId: number) {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
  }

  private async assertScopedSearchRequirement(searchRequirementId: number, contactId: number, teamId: number) {
    const requirement = await this.requirementsRepository.findOne({
      where: { id: searchRequirementId, contactId, teamId },
    });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    return requirement.id;
  }

  private async assertScopedProperty(propertyId: number, teamId: number) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, teamId },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    return property.id;
  }
}
