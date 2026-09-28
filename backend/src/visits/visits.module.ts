import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import { Visit } from './visit.entity';
import { PublicVisitsController, VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { UrlShortenerService } from './url-shortener.service';

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
  controllers: [VisitsController, PublicVisitsController],
  providers: [VisitsService, UrlShortenerService],
  exports: [VisitsService, TypeOrmModule],
})
export class VisitsModule {}
