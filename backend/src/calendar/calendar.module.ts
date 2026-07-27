import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { GoogleCalendarConnection } from '../auth/google-calendar-connection.entity';
import { Contact } from '../contacts/contact.entity';
import { Visit } from '../visits/visit.entity';
import { CalendarAgendaService } from './calendar-agenda.service';
import { CalendarController } from './calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GoogleCalendarConnection, Contact, Activity, Visit]),
  ],
  controllers: [CalendarController],
  providers: [GoogleCalendarService, CalendarAgendaService],
  exports: [GoogleCalendarService],
})
export class CalendarModule {}
