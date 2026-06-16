import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityGoal } from './activity-goal.entity';
import { ActivityGoalsController } from './activity-goals.controller';
import { ActivityGoalsService } from './activity-goals.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityGoal])],
  controllers: [ActivityGoalsController],
  providers: [ActivityGoalsService],
  exports: [ActivityGoalsService, TypeOrmModule],
})
export class ActivityGoalsModule {}
