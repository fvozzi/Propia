import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { paginate } from '../common/pagination';
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactRole } from './contact-role.entity';
import { Contact } from './contact.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(ContactRole)
    private readonly rolesRepository: Repository<ContactRole>,
  ) {}

  async create(dto: CreateContactDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contactFields = this.normalizeContactFields(dto);
    const contact = this.contactsRepository.create({
      ...contactFields,
      teamId,
      ownerUserId: user.sub,
      roles: (dto.roles ?? []).map((role) => this.rolesRepository.create({ role })),
    });

    return this.contactsRepository.save(contact);
  }

  async findAll(query: QueryContactsDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.contactsRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.roles', 'roles')
      .where('contact.teamId = :teamId', { teamId })
      .orderBy('contact.updatedAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        `(contact.firstName ILIKE :search
          OR contact.lastName ILIKE :search
          OR contact.displayName ILIKE :search
          OR contact."documentNumber" ILIKE :search
          OR contact.phone ILIKE :search
          OR contact.email ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contact = await this.contactsRepository.findOne({
      where: { id, teamId },
      relations: {
        roles: true,
        searchRequirements: {
          property: true,
        },
        propertyCandidates: {
          searchRequirement: true,
        },
        activities: {
          property: true,
        },
        commercialOpportunities: {
          property: true,
          searchRequirement: true,
          appraisalRequest: true,
        },
        visits: {
          property: true,
        },
        ownedProperties: true,
      },
      order: {
        activities: {
          activityDate: 'DESC',
        },
        visits: {
          scheduledAt: 'DESC',
        },
        propertyCandidates: {
          createdAt: 'DESC',
        },
        commercialOpportunities: {
          updatedAt: 'DESC',
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    return contact;
  }

  async update(id: number, dto: UpdateContactDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contact = await this.contactsRepository.findOne({
      where: { id, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    const { roles, ...rest } = dto;
    const contactFields = this.normalizeContactFields({
      firstName: rest.firstName ?? contact.firstName,
      lastName: rest.lastName ?? contact.lastName,
      displayName: rest.displayName ?? contact.displayName,
      phone: rest.phone ?? contact.phone ?? undefined,
      whatsapp: rest.whatsapp ?? contact.whatsapp ?? undefined,
      email: rest.email ?? contact.email ?? undefined,
      documentNumber: rest.documentNumber ?? contact.documentNumber ?? undefined,
      source: rest.source ?? contact.source ?? undefined,
      notes: rest.notes ?? contact.notes ?? undefined,
    });
    Object.assign(contact, contactFields);
    const saved = await this.contactsRepository.save(contact);

    if (roles) {
      await this.rolesRepository
        .createQueryBuilder()
        .delete()
        .from(ContactRole)
        .where('"contactId" = :id', { id })
        .execute();

      if (roles.length > 0) {
        await this.rolesRepository.save(
          roles.map((role) => this.rolesRepository.create({ role, contact: saved })),
        );
      }
    }

    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contact = await this.contactsRepository.findOne({
      where: { id, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.contactsRepository.remove(contact);
    return { success: true };
  }

  private normalizeContactFields(dto: Pick<
    CreateContactDto,
    | 'firstName'
    | 'lastName'
    | 'displayName'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'documentNumber'
    | 'source'
    | 'notes'
  >) {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName?.trim() ?? '';
    const displayName = dto.displayName?.trim() || [firstName, lastName].filter(Boolean).join(' ');

    return {
      firstName,
      lastName,
      displayName,
      phone: dto.phone ?? null,
      whatsapp: dto.whatsapp ?? null,
      email: dto.email ?? null,
      documentNumber: dto.documentNumber ?? null,
      source: dto.source ?? null,
      notes: dto.notes ?? null,
    };
  }
}
