import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { paginate } from '../common/pagination';
import { Contact } from '../contacts/contact.entity';
import { PropertyPhoto } from './property-photo.entity';
import { Property } from './property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertiesDto } from './dto/query-properties.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(PropertyPhoto)
    private readonly photosRepository: Repository<PropertyPhoto>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
  ) {}

  async create(dto: CreatePropertyDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertOwnerContact(dto.ownerContactId ?? null, teamId);

    const property = this.propertiesRepository.create({
      ...dto,
      teamId,
      ownerUserId: user.sub,
      ownerContactId: dto.ownerContactId ?? null,
      photos: (dto.photos ?? []).map((photo) => this.photosRepository.create(photo)),
    });

    return this.propertiesRepository.save(property);
  }

  async findAll(query: QueryPropertiesDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.propertiesRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.photos', 'photos')
      .leftJoinAndSelect('property.ownerContact', 'ownerContact')
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

  async update(id: number, dto: UpdatePropertyDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const property = await this.propertiesRepository.findOne({
      where: { id, teamId },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const nextOwnerContactId =
      dto.ownerContactId === undefined ? property.ownerContactId : dto.ownerContactId;
    await this.assertOwnerContact(nextOwnerContactId ?? null, teamId);

    const { photos, ...rest } = dto;
    Object.assign(property, {
      ...rest,
      ownerContactId: nextOwnerContactId ?? null,
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
}
