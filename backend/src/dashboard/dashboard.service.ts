import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Activity } from '../activities/activity.entity';
import { ActivityGoal } from '../activity-goals/activity-goal.entity';
import {
  ActivityType,
  CommercialOpportunityStatus,
  PropertyStatus,
  SearchRequirementStatus,
} from '../common/enums';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { buildOpportunityPipelineGroups } from '../use-cases/commercial-opportunity-pipeline.use-case';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(ActivityGoal)
    private readonly activityGoalsRepository: Repository<ActivityGoal>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(SearchRequirement)
    private readonly requirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(CommercialOpportunity)
    private readonly opportunitiesRepository: Repository<CommercialOpportunity>,
  ) {}

  async getToday(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const weekStart = getStartOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      followUpsDueToday,
      overdueFollowUps,
      visitsToday,
      activePropertiesCount,
      activeSearchRequirementsCount,
      pendingBuyerPropertyShares,
      activeOpportunities,
      activityGoals,
    ] =
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
        this.activitiesRepository
          .createQueryBuilder('activity')
          .leftJoinAndSelect('activity.contact', 'contact')
          .leftJoinAndSelect('activity.property', 'property')
          .where('activity.teamId = :teamId', { teamId })
          .andWhere('activity.activityType = :activityType', {
            activityType: ActivityType.VISIT,
          })
          .andWhere('activity.activityDate >= :start', { start: start.toISOString() })
          .andWhere('activity.activityDate < :end', { end: end.toISOString() })
          .orderBy('activity.activityDate', 'ASC')
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
        this.activitiesRepository
          .createQueryBuilder('activity')
          .leftJoinAndSelect('activity.contact', 'contact')
          .leftJoinAndSelect('activity.property', 'property')
          .where('activity.teamId = :teamId', { teamId })
          .andWhere('activity.activityType = :activityType', {
            activityType: ActivityType.PROPERTY_SEARCH,
          })
          .andWhere('activity.whatsappSharedAt IS NULL')
          .orderBy('activity.activityDate', 'DESC')
          .getMany(),
        this.opportunitiesRepository.find({
          where: {
            teamId,
            status: Not(CommercialOpportunityStatus.ARCHIVED),
          },
          relations: {
            contact: true,
            property: true,
            appraisalRequest: true,
            searchRequirement: true,
          },
          order: {
            updatedAt: 'DESC',
          },
        }),
        this.activityGoalsRepository.find({
          where: { teamId },
          order: { activityType: 'ASC', createdAt: 'ASC' },
        }),
      ]);

    const opportunityIds = activeOpportunities.map(
      (opportunity) => opportunity.id,
    );
    const opportunityActivities =
      opportunityIds.length > 0
        ? await this.activitiesRepository.find({
            where: {
              teamId,
              commercialOpportunityId: In(opportunityIds),
              activityType: In([
                ActivityType.PROPERTY_SEARCH,
                ActivityType.VISIT,
                ActivityType.RESERVATION,
              ]),
            },
          })
        : [];

    const opportunityPipelineGroups = buildOpportunityPipelineGroups(
      activeOpportunities,
      opportunityActivities,
    );
    const weeklyActivityGoals = await this.buildWeeklyActivityGoals(
      teamId,
      activityGoals,
      weekStart,
      weekEnd,
    );

    return {
      followUpsDueToday,
      overdueFollowUps,
      visitsToday,
      activePropertiesCount,
      activeSearchRequirementsCount,
      pendingBuyerPropertySharesCount: pendingBuyerPropertyShares.length,
      pendingBuyerPropertyShares,
      weeklyActivityGoals,
      opportunityPipelineGroups,
    };
  }

  private async buildWeeklyActivityGoals(
    teamId: number,
    goals: ActivityGoal[],
    weekStart: Date,
    weekEnd: Date,
  ) {
    if (goals.length === 0) {
      return [];
    }

    const counts = await this.activitiesRepository
      .createQueryBuilder('activity')
      .select('activity.activityType', 'activityType')
      .addSelect('COUNT(*)', 'count')
      .where('activity.teamId = :teamId', { teamId })
      .andWhere('activity.activityDate >= :weekStart', {
        weekStart: weekStart.toISOString(),
      })
      .andWhere('activity.activityDate < :weekEnd', {
        weekEnd: weekEnd.toISOString(),
      })
      .andWhere('activity.activityType IN (:...activityTypes)', {
        activityTypes: goals.map((goal) => goal.activityType),
      })
      .groupBy('activity.activityType')
      .getRawMany<{ activityType: ActivityType; count: string }>();

    const countByType = new Map(
      counts.map((row) => [row.activityType, Number(row.count)]),
    );

    return goals.map((goal) => {
      const completedCount = countByType.get(goal.activityType) ?? 0;
      return {
        goalId: goal.id,
        activityType: goal.activityType,
        targetCount: goal.targetCount,
        completedCount,
        remainingCount: Math.max(goal.targetCount - completedCount, 0),
      };
    });
  }
}

function getStartOfWeek(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}
