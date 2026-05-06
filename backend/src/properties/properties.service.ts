import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(dto: CreatePropertyDto) {
    const property = this.propertiesRepository.create({
      ...dto,
      ownerContactId: dto.ownerContactId ?? null,
      photos: (dto.photos ?? []).map((photo) => this.photosRepository.create(photo)),
    });

    return this.propertiesRepository.save(property);
  }

  async findAll(query: QueryPropertiesDto) {
    const qb = this.propertiesRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.photos', 'photos')
      .leftJoinAndSelect('property.ownerContact', 'ownerContact')
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

  async findOne(id: number) {
    const property = await this.propertiesRepository.findOne({
      where: { id },
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

  async update(id: number, dto: UpdatePropertyDto) {
    const property = await this.propertiesRepository.findOne({ where: { id } });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const { photos, ...rest } = dto;
    Object.assign(property, {
      ...rest,
      ownerContactId: dto.ownerContactId ?? property.ownerContactId,
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

    return this.findOne(id);
  }

  async remove(id: number) {
    const property = await this.propertiesRepository.findOne({ where: { id } });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    await this.propertiesRepository.remove(property);
    return { success: true };
  }
}
