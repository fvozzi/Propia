import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { GoogleCalendarService } from '../calendar/google-calendar.service';
import { paginate } from '../common/pagination';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
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
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(dto: CreateVisitDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedRelations(dto.contactId, dto.propertyId, teamId);

    const visit = this.visitsRepository.create({
      teamId,
      ownerUserId: user.sub,
      propertyId: dto.propertyId,
      contactId: dto.contactId,
      scheduledAt: new Date(dto.scheduledAt),
      status: dto.status,
      notes: dto.notes?.trim() || null,
      externalUrl: dto.externalUrl?.trim() || null,
      googleSyncStatus: 'PENDING',
    });

    const savedVisit = await this.visitsRepository.save(visit);
    return this.syncVisit(savedVisit.id, user, 'create');
  }

  async findAll(query: QueryVisitsDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const qb = this.visitsRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.contact', 'contact')
      .leftJoinAndSelect('visit.property', 'property')
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
      relations: { contact: true, property: true },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    return visit;
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
    const nextPropertyId = dto.propertyId ?? visit.propertyId;
    await this.assertScopedRelations(nextContactId, nextPropertyId, teamId);

    Object.assign(visit, {
      propertyId: nextPropertyId,
      contactId: nextContactId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : visit.scheduledAt,
      status: dto.status ?? visit.status,
      notes: dto.notes === undefined ? visit.notes : dto.notes?.trim() || null,
      externalUrl:
        dto.externalUrl === undefined ? visit.externalUrl : dto.externalUrl?.trim() || null,
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
      relations: { contact: true, property: true },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    try {
      await this.googleCalendarService.syncVisitDelete(user.sub, visit);
    } catch {
      // Ignore remote delete failures to preserve local delete.
    }

    await this.visitsRepository.remove(visit);
    return { success: true };
  }

  private async syncVisit(
    visitId: number,
    user: AuthenticatedUser,
    mode: 'create' | 'update',
  ) {
    const teamId = requireActiveTeamId(user);
    const visit = await this.visitsRepository.findOne({
      where: { id: visitId, teamId },
      relations: { contact: true, property: true },
    });

    if (!visit) {
      throw new NotFoundException('Visita no encontrada');
    }

    try {
      const result =
        mode === 'create'
          ? await this.googleCalendarService.syncVisitCreate(user.sub, visit)
          : await this.googleCalendarService.syncVisitUpdate(user.sub, visit);

      Object.assign(visit, result);
    } catch (error) {
      visit.googleSyncStatus = 'ERROR';
      visit.googleSyncError = error instanceof Error ? error.message : 'Unknown sync error';
    }

    await this.visitsRepository.save(visit);
    return this.findOne(visitId, user);
  }

  private async assertScopedRelations(contactId: number, propertyId: number, teamId: number) {
    const [contact, property] = await Promise.all([
      this.contactsRepository.findOne({ where: { id: contactId, teamId } }),
      this.propertiesRepository.findOne({
        where: { id: propertyId, teamId },
      }),
    ]);

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }
  }
}
