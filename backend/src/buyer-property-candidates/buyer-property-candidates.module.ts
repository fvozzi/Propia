import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/contact.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { BuyerPropertyCandidate } from './buyer-property-candidate.entity';
import { BuyerPropertyCandidatesController } from './buyer-property-candidates.controller';
import { BuyerPropertyCandidatesService } from './buyer-property-candidates.service';

@Module({
  imports: [TypeOrmModule.forFeature([BuyerPropertyCandidate, Contact, SearchRequirement])],
  controllers: [BuyerPropertyCandidatesController],
  providers: [BuyerPropertyCandidatesService],
  exports: [BuyerPropertyCandidatesService, TypeOrmModule],
})
export class BuyerPropertyCandidatesModule {}
