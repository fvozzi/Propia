import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { BuyerPropertyShareStatus } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import {
  registerBuyerPropertyCandidate,
  shareBuyerPropertyCandidate,
} from '../use-cases/buyer-property-search.use-case';
import { BuyerPropertyCandidate } from './buyer-property-candidate.entity';
import { CreateBuyerPropertyCandidateDto } from './dto/create-buyer-property-candidate.dto';
import { ShareBuyerPropertyCandidateDto } from './dto/share-buyer-property-candidate.dto';

@Injectable()
export class BuyerPropertyCandidatesService {
  constructor(
    @InjectRepository(BuyerPropertyCandidate)
    private readonly candidatesRepository: Repository<BuyerPropertyCandidate>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
  ) {}

  async create(dto: CreateBuyerPropertyCandidateDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedContact(dto.contactId, teamId);
    const searchRequirementId = dto.searchRequirementId
      ? await this.assertScopedSearchRequirement(dto.searchRequirementId, dto.contactId, teamId)
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
      shareComments: dto.shareComments?.trim() || null,
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

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const candidate = await this.requireScopedCandidate(id, teamId);
    await this.candidatesRepository.remove(candidate);
    return { success: true };
  }

  private async requireScopedCandidate(id: number, teamId: number) {
    const candidate = await this.candidatesRepository.findOne({
      where: { id, teamId },
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
}
