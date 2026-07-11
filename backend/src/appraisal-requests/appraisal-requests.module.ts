import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { Activity } from '../activities/activity.entity';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Contact } from '../contacts/contact.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import {
  AppraisalRequestsController,
  PublicAppraisalRequestsController,
} from './appraisal-requests.controller';
import { AppraisalRequest } from './appraisal-request.entity';
import { AppraisalRequestsService } from './appraisal-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppraisalRequest,
      Contact,
      Activity,
      CommercialOpportunity,
    ]),
    ActivitiesModule,
    WhatsappModule,
  ],
  providers: [AppraisalRequestsService],
  controllers: [AppraisalRequestsController, PublicAppraisalRequestsController],
  exports: [AppraisalRequestsService, TypeOrmModule],
})
export class AppraisalRequestsModule {}
