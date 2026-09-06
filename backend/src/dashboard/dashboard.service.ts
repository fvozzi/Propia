import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Activity } from '../activities/activity.entity';
import { ActivityGoal } from '../activity-goals/activity-goal.entity';
import {
  ActivityType,
  CommercialOpportunityStatus,
  FinancialEntryType,
  PropertyStatus,
  SearchRequirementStatus,
} from '../common/enums';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { FinancialEntry } from '../finances/financial-entry.entity';
import { BnaExchangeRatesService } from '../exchange-rates/bna-exchange-rates.service';
import { getArgentinaDateKey } from '../exchange-rates/bna-exchange-rate.parser';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { buildOpportunityPipelineGroups } from '../use-cases/commercial-opportunity-pipeline.use-case';
import {
  buildFinancialHistory,
  type FinancialHistoryRow,
} from '../use-cases/financial-history.use-case';
import {
  buildFinancialSummary,
  type FinancialSummaryRow,
} from '../use-cases/financial-summary.use-case';

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
    @InjectRepository(FinancialEntry)
    private readonly financialEntriesRepository: Repository<FinancialEntry>,
    private readonly bnaExchangeRatesService: BnaExchangeRatesService,
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
      financialSummaryRows,
      financialHistoryRows,
      effectiveExchangeRate,
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
        this.financialEntriesRepository
          .createQueryBuilder('entry')
          .select('entry.currency', 'currency')
          .addSelect('entry.entryType', 'entryType')
          .addSelect('SUM(entry.amount)', 'total')
          .where('entry.teamId = :teamId', { teamId })
          .andWhere('entry.entryType IN (:...entryTypes)', {
            entryTypes: [FinancialEntryType.INCOME, FinancialEntryType.EXPENSE],
          })
          .groupBy('entry.currency')
          .addGroupBy('entry.entryType')
          .getRawMany<FinancialSummaryRow>(),
        this.financialEntriesRepository
          .createQueryBuilder('entry')
          .select(
            `TO_CHAR(entry."entryDate" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD')`,
            'date',
          )
          .addSelect('entry.currency', 'currency')
          .addSelect('entry.entryType', 'entryType')
          .addSelect('SUM(entry.amount)', 'total')
          .where('entry.teamId = :teamId', { teamId })
          .andWhere('entry.entryType IN (:...entryTypes)', {
            entryTypes: [FinancialEntryType.INCOME, FinancialEntryType.EXPENSE],
          })
          .groupBy(
            `TO_CHAR(entry."entryDate" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD')`,
          )
          .addGroupBy('entry.currency')
          .addGroupBy('entry.entryType')
          .orderBy(
            `TO_CHAR(entry."entryDate" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD')`,
            'ASC',
          )
          .getRawMany<FinancialHistoryRow>(),
        this.bnaExchangeRatesService.getTodayEffectiveRate(),
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

    const financialHistoryPoints = buildFinancialHistory(
      financialHistoryRows,
      getArgentinaDateKey(new Date()),
    );
    const historicalExchangeRates =
      await this.bnaExchangeRatesService.getEffectiveRatesForDates(
        financialHistoryPoints.map((point) => point.date),
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
      financialSummary: buildFinancialSummary(financialSummaryRows),
      financialHistory: {
        points: financialHistoryPoints.map((point) => ({
          ...point,
          exchangeRate: historicalExchangeRates[point.date] ?? null,
        })),
        exchangeRate: effectiveExchangeRate,
      },
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
