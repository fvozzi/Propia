import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import { Visit } from './visit.entity';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Visit,
      Contact,
      Property,
      SearchRequirement,
      BuyerPropertyCandidate,
    ]),
    CalendarModule,
  ],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService, TypeOrmModule],
})
export class VisitsModule {}
