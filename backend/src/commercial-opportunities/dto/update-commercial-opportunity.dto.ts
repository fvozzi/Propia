import { PartialType } from '@nestjs/mapped-types';
import { CreateCommercialOpportunityDto } from './create-commercial-opportunity.dto';

export class UpdateCommercialOpportunityDto extends PartialType(
  CreateCommercialOpportunityDto,
) {}
