import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Activity } from '../activities/activity.entity';
import { PropertyStatus, SearchRequirementStatus } from '../common/enums';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { Visit } from '../visits/visit.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(Visit)
    private readonly visitsRepository: Repository<Visit>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
  ) {}

  async getToday(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [followUpsDueToday, overdueFollowUps, visitsToday, activePropertiesCount, activeSearchRequirementsCount] =
      await Promise.all([
        this.activitiesRepository
          .createQueryBuilder('activity')
          .leftJoinAndSelect('activity.contact', 'contact')
          .leftJoinAndSelect('activity.property', 'property')
          .where('activity.teamId = :teamId', { teamId })
          .andWhere('activity.nextFollowUpDate >= :start', { start: start.toISOString() })
          .andWhere('activity.nextFollowUpDate < :end', { end: end.toISOString() })
          .orderBy('activity.nextFollowUpDate', 'ASC')
          .getMany(),
        this.activitiesRepository
          .createQueryBuilder('activity')
          .leftJoinAndSelect('activity.contact', 'contact')
          .leftJoinAndSelect('activity.property', 'property')
          .where('activity.teamId = :teamId', { teamId })
          .andWhere('activity.nextFollowUpDate IS NOT NULL')
          .andWhere('activity.nextFollowUpDate < :start', { start: start.toISOString() })
          .orderBy('activity.nextFollowUpDate', 'ASC')
          .getMany(),
        this.visitsRepository
          .createQueryBuilder('visit')
          .leftJoinAndSelect('visit.contact', 'contact')
          .leftJoinAndSelect('visit.property', 'property')
          .where('visit.teamId = :teamId', { teamId })
          .andWhere('visit.scheduledAt >= :start', { start: start.toISOString() })
          .andWhere('visit.scheduledAt < :end', { end: end.toISOString() })
          .orderBy('visit.scheduledAt', 'ASC')
          .getMany(),
        this.propertiesRepository.count({
          where: { status: PropertyStatus.ACTIVE, teamId },
        }),
        this.requirementsRepository.count({
          where: {
            status: SearchRequirementStatus.ACTIVE,
            teamId,
          },
        }),
      ]);

    return {
      followUpsDueToday,
      overdueFollowUps,
      visitsToday,
      activePropertiesCount,
      activeSearchRequirementsCount,
    };
  }
}
