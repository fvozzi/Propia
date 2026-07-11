import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { FinanceConfigController } from './finance-config.controller';
import { FinanceConfig } from './finance-config.entity';
import { FinancialEntriesController } from './financial-entries.controller';
import { FinancialEntry } from './financial-entry.entity';
import { FinancesService } from './finances.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceConfig,
      FinancialEntry,
      Activity,
      SearchRequirement,
      CommercialOpportunity,
    ]),
  ],
  controllers: [FinanceConfigController, FinancialEntriesController],
  providers: [FinancesService],
  exports: [FinancesService],
})
export class FinancesModule {}
