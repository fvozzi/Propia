import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { Visit } from './visit.entity';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [TypeOrmModule.forFeature([Visit, Contact, Property]), CalendarModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService, TypeOrmModule],
})
export class VisitsModule {}
