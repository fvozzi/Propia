import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { CalendarModule } from '../calendar/calendar.module';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ActivityCalendarSyncService } from './activity-calendar-sync.service';
import { Activity } from './activity.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      Contact,
      Property,
      AppraisalRequest,
      CommercialOpportunity,
    ]),
    CalendarModule,
    WhatsappModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityCalendarSyncService],
  exports: [ActivitiesService, ActivityCalendarSyncService, TypeOrmModule],
})
export class ActivitiesModule {}
