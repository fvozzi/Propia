import { PartialType } from '@nestjs/mapped-types';
import { CreateSearchRequirementDto } from './create-search-requirement.dto';

export class UpdateSearchRequirementDto extends PartialType(CreateSearchRequirementDto) {}
