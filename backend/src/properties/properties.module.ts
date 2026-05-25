import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { Contact } from '../contacts/contact.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { Visit } from '../visits/visit.entity';
import { PropertyPhoto } from './property-photo.entity';
import { Property } from './property.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, PropertyPhoto, Contact, AppraisalRequest, SearchRequirement, Activity, Visit])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService, TypeOrmModule],
})
export class PropertiesModule {}
