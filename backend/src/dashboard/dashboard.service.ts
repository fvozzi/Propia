import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Activity } from '../activities/activity.entity';
import { ActivityType, PropertyStatus, SearchRequirementStatus } from '../common/enums';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { buildRequirementPipelineGroups } from '../use-cases/requirement-pipeline.use-case';
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
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
  ) {}

  async getToday(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [
      followUpsDueToday,
      overdueFollowUps,
      visitsToday,
      activePropertiesCount,
      activeSearchRequirementsCount,
      pendingBuyerPropertyShares,
      activeRequirements,
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
        this.requirementsRepository.find({
          where: {
            status: SearchRequirementStatus.ACTIVE,
            teamId,
          },
          relations: {
            contact: true,
            property: true,
          },
          order: {
            updatedAt: 'DESC',
          },
        }),
      ]);

    const requirementContactIds = [...new Set(activeRequirements.map((requirement) => requirement.contactId))];
    const [propertySearchActivities, appraisalRequests] =
      requirementContactIds.length > 0
        ? await Promise.all([
            this.activitiesRepository.find({
              where: {
                teamId,
                activityType: ActivityType.PROPERTY_SEARCH,
                contactId: In(requirementContactIds),
              },
            }),
            this.appraisalRequestsRepository.find({
              where: {
                teamId,
                contactId: In(requirementContactIds),
              },
            }),
          ])
        : [[], []];

    const requirementPipelineGroups = buildRequirementPipelineGroups(
      activeRequirements,
      propertySearchActivities,
      appraisalRequests,
    );

    return {
      followUpsDueToday,
      overdueFollowUps,
      visitsToday,
      activePropertiesCount,
      activeSearchRequirementsCount,
      pendingBuyerPropertySharesCount: pendingBuyerPropertyShares.length,
      pendingBuyerPropertyShares,
      requirementPipelineGroups,
    };
  }
}
