import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { Activity } from './activity.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, Contact, Property])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService, TypeOrmModule],
})
export class ActivitiesModule {}
