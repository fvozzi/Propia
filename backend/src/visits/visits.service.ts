import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleCalendarService } from '../calendar/google-calendar.service';
import { paginate } from '../common/pagination';
import { CreateVisitDto } from './dto/create-visit.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { Visit } from './visit.entity';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly visitsRepository: Repository<Visit>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(dto: CreateVisitDto, userId: number) {
    const visit = this.visitsRepository.create({
      ...dto,
      scheduledAt: new Date(dto.scheduledAt),
      googleSyncStatus: 'PENDING',
    });

    const savedVisit = await this.visitsRepository.save(visit);
    return this.syncVisit(savedVisit.id, userId, 'create');
  }

  async findAll(query: QueryVisitsDto) {
    const qb = this.visitsRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.contact', 'contact')
      .leftJoinAndSelect('visit.property', 'property')
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

  async findOne(id: number) {
    const visit = await this.visitsRepository.findOne({
      where: { id },
      relations: { contact: true, property: true },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    return visit;
  }

  async update(id: number, dto: UpdateVisitDto, userId: number) {
    const visit = await this.visitsRepository.findOne({ where: { id } });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    Object.assign(visit, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : visit.scheduledAt,
      googleSyncStatus: 'PENDING',
      googleSyncError: null,
    });
    await this.visitsRepository.save(visit);

    return this.syncVisit(id, userId, 'update');
  }

  async remove(id: number, userId: number) {
    const visit = await this.visitsRepository.findOne({
      where: { id },
      relations: { contact: true, property: true },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    try {
      await this.googleCalendarService.syncVisitDelete(userId, visit);
    } catch {
      // Ignore remote delete failures to preserve local delete.
    }

    await this.visitsRepository.remove(visit);
    return { success: true };
  }

  private async syncVisit(
    visitId: number,
    userId: number,
    mode: 'create' | 'update',
  ) {
    const visit = await this.visitsRepository.findOne({
      where: { id: visitId },
      relations: { contact: true, property: true },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    try {
      const result =
        mode === 'create'
          ? await this.googleCalendarService.syncVisitCreate(userId, visit)
          : await this.googleCalendarService.syncVisitUpdate(userId, visit);

      Object.assign(visit, result);
    } catch (error) {
      visit.googleSyncStatus = 'ERROR';
      visit.googleSyncError = error instanceof Error ? error.message : 'Unknown sync error';
    }

    await this.visitsRepository.save(visit);
    return this.findOne(visitId);
  }
}
