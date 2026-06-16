import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  requireActiveTeamId,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { ActivityGoal } from './activity-goal.entity';
import { CreateActivityGoalDto } from './dto/create-activity-goal.dto';
import { UpdateActivityGoalDto } from './dto/update-activity-goal.dto';

@Injectable()
export class ActivityGoalsService {
  constructor(
    @InjectRepository(ActivityGoal)
    private readonly activityGoalsRepository: Repository<ActivityGoal>,
  ) {}

  async findAll(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    return this.activityGoalsRepository.find({
      where: { teamId },
      order: { activityType: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(dto: CreateActivityGoalDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertUniqueGoal(teamId, dto.activityType);

    const goal = this.activityGoalsRepository.create({
      teamId,
      activityType: dto.activityType,
      targetCount: dto.targetCount,
    });

    return this.activityGoalsRepository.save(goal);
  }

  async update(id: number, dto: UpdateActivityGoalDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const goal = await this.requireScopedGoal(id, teamId);
    const nextActivityType = dto.activityType ?? goal.activityType;

    if (nextActivityType !== goal.activityType) {
      await this.assertUniqueGoal(teamId, nextActivityType, goal.id);
    }

    goal.activityType = nextActivityType;
    goal.targetCount = dto.targetCount ?? goal.targetCount;
    return this.activityGoalsRepository.save(goal);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const goal = await this.requireScopedGoal(id, teamId);
    await this.activityGoalsRepository.remove(goal);
    return { success: true };
  }

  private async requireScopedGoal(id: number, teamId: number) {
    const goal = await this.activityGoalsRepository.findOne({
      where: { id, teamId },
    });

    if (!goal) {
      throw new NotFoundException('Objetivo de actividad no encontrado');
    }

    return goal;
  }

  private async assertUniqueGoal(
    teamId: number,
    activityType: ActivityGoal['activityType'],
    ignoreGoalId?: number,
  ) {
    const existing = await this.activityGoalsRepository.findOne({
      where: { teamId, activityType },
    });

    if (existing && existing.id !== ignoreGoalId) {
      throw new ConflictException(
        'Ya existe un objetivo semanal para este tipo de actividad',
      );
    }
  }
}
