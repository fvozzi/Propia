import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { Contact } from '../contacts/contact.entity';
import {
  AppraisalRequestsController,
  PublicAppraisalRequestsController,
} from './appraisal-requests.controller';
import { AppraisalRequest } from './appraisal-request.entity';
import { AppraisalRequestsService } from './appraisal-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppraisalRequest, Contact, Activity])],
  providers: [AppraisalRequestsService],
  controllers: [AppraisalRequestsController, PublicAppraisalRequestsController],
  exports: [AppraisalRequestsService, TypeOrmModule],
})
export class AppraisalRequestsModule {}
