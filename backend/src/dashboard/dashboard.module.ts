import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { ActivityGoal } from '../activity-goals/activity-goal.entity';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { Visit } from '../visits/visit.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityGoal,
      Visit,
      Property,
      SearchRequirement,
      CommercialOpportunity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
