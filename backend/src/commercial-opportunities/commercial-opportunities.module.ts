import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { CommercialOpportunity } from './commercial-opportunity.entity';
import { CommercialOpportunitiesController } from './commercial-opportunities.controller';
import { CommercialOpportunitiesService } from './commercial-opportunities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommercialOpportunity,
      Contact,
      Activity,
      SearchRequirement,
      AppraisalRequest,
      Property,
    ]),
  ],
  controllers: [CommercialOpportunitiesController],
  providers: [CommercialOpportunitiesService],
  exports: [CommercialOpportunitiesService, TypeOrmModule],
})
export class CommercialOpportunitiesModule {}
