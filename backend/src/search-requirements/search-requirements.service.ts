import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { paginate } from '../common/pagination';
import { Contact } from '../contacts/contact.entity';
import { CreateSearchRequirementDto } from './dto/create-search-requirement.dto';
import { QuerySearchRequirementsDto } from './dto/query-search-requirements.dto';
import { UpdateSearchRequirementDto } from './dto/update-search-requirement.dto';
import { SearchRequirement } from './search-requirement.entity';

@Injectable()
export class SearchRequirementsService {
  constructor(
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
  ) {}

  async create(dto: CreateSearchRequirementDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedContact(dto.contactId, teamId);

    const requirement = this.requirementsRepository.create({
      ...dto,
      teamId,
      ownerUserId: user.sub,
    });
    return this.requirementsRepository.save(requirement);
  }

  async findAll(query: QuerySearchRequirementsDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.requirementsRepository
      .createQueryBuilder('requirement')
      .leftJoinAndSelect('requirement.contact', 'contact')
      .where('requirement.teamId = :teamId', { teamId })
      .orderBy('requirement.updatedAt', 'DESC');

    if (query.contactId) {
      qb.andWhere('requirement.contactId = :contactId', { contactId: query.contactId });
    }

    if (query.status) {
      qb.andWhere('requirement.status = :status', { status: query.status });
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const requirement = await this.requirementsRepository.findOne({
      where: { id, teamId },
      relations: { contact: true },
    });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    return requirement;
  }

  async update(id: number, dto: UpdateSearchRequirementDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const requirement = await this.requirementsRepository.findOne({
      where: { id, teamId },
    });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    const nextContactId = dto.contactId ?? requirement.contactId;
    await this.assertScopedContact(nextContactId, teamId);

    Object.assign(requirement, dto);
    await this.requirementsRepository.save(requirement);
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const requirement = await this.requirementsRepository.findOne({
      where: { id, teamId },
    });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    await this.requirementsRepository.remove(requirement);
    return { success: true };
  }

  private async assertScopedContact(contactId: number, teamId: number) {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
  }
}
