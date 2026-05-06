import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(dto: CreateContactDto) {
    const contact = this.contactsRepository.create({
      ...dto,
      roles: (dto.roles ?? []).map((role) => this.rolesRepository.create({ role })),
    });

    return this.contactsRepository.save(contact);
  }

  async findAll(query: QueryContactsDto) {
    const qb = this.contactsRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.roles', 'roles')
      .orderBy('contact.updatedAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        `(contact.firstName ILIKE :search
          OR contact.lastName ILIKE :search
          OR contact.displayName ILIKE :search
          OR contact.phone ILIKE :search
          OR contact.email ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    return paginate(qb, query);
  }

  async findOne(id: number) {
    const contact = await this.contactsRepository.findOne({
      where: { id },
      relations: {
        roles: true,
        searchRequirements: true,
        activities: {
          property: true,
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
      },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    return contact;
  }

  async update(id: number, dto: UpdateContactDto) {
    const contact = await this.contactsRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    const { roles, ...rest } = dto;
    Object.assign(contact, rest);
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

    return this.findOne(id);
  }

  async remove(id: number) {
    const contact = await this.contactsRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.contactsRepository.remove(contact);
    return { success: true };
  }
}
