import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from './search-requirement.entity';
import { SearchRequirementsController } from './search-requirements.controller';
import { SearchRequirementsService } from './search-requirements.service';

@Module({
  imports: [TypeOrmModule.forFeature([SearchRequirement, Contact, Property])],
  controllers: [SearchRequirementsController],
  providers: [SearchRequirementsService],
  exports: [SearchRequirementsService, TypeOrmModule],
})
export class SearchRequirementsModule {}
