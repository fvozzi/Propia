import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { ExternalListing } from './external-listing.entity';
import { ExternalSearchService } from './external-search.service';
import { PortalSearchRun } from './portal-search-run.entity';
import { PortalSourceConfig } from './portal-source-config.entity';
import { PortalSourceConfigsController } from './portal-source-configs.controller';
import { RequirementPortalMatch } from './requirement-portal-match.entity';
import { SearchRequirementExternalSearchController } from './search-requirement-external-search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortalSourceConfig,
      ExternalListing,
      RequirementPortalMatch,
      PortalSearchRun,
      SearchRequirement,
      BuyerPropertyCandidate,
      Activity,
    ]),
  ],
  controllers: [PortalSourceConfigsController, SearchRequirementExternalSearchController],
  providers: [ExternalSearchService],
  exports: [ExternalSearchService, TypeOrmModule],
})
export class ExternalSearchModule {}
