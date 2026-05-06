import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(dto: CreateSearchRequirementDto) {
    const requirement = this.requirementsRepository.create(dto);
    return this.requirementsRepository.save(requirement);
  }

  async findAll(query: QuerySearchRequirementsDto) {
    const qb = this.requirementsRepository
      .createQueryBuilder('requirement')
      .leftJoinAndSelect('requirement.contact', 'contact')
      .orderBy('requirement.updatedAt', 'DESC');

    if (query.contactId) {
      qb.andWhere('requirement.contactId = :contactId', { contactId: query.contactId });
    }

    if (query.status) {
      qb.andWhere('requirement.status = :status', { status: query.status });
    }

    return paginate(qb, query);
  }

  async findOne(id: number) {
    const requirement = await this.requirementsRepository.findOne({
      where: { id },
      relations: { contact: true },
    });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    return requirement;
  }

  async update(id: number, dto: UpdateSearchRequirementDto) {
    const requirement = await this.requirementsRepository.findOne({ where: { id } });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    Object.assign(requirement, dto);
    await this.requirementsRepository.save(requirement);
    return this.findOne(id);
  }

  async remove(id: number) {
    const requirement = await this.requirementsRepository.findOne({ where: { id } });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    await this.requirementsRepository.remove(requirement);
    return { success: true };
  }
}
