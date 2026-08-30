import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
} from '../../common/enums';

export class CreateCommercialOpportunityDto {
  @Type(() => Number)
  @IsInt()
  contactId: number;

  @IsEnum(OperationType)
  operationType: OperationType;

  @IsOptional()
  @IsEnum(CommercialOpportunityStage)
  stage?: CommercialOpportunityStage;

  @IsOptional()
  @IsEnum(CommercialOpportunityStatus)
  status?: CommercialOpportunityStatus;

  @IsOptional()
  @IsBoolean()
  isExternalBuyerLead?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceActivityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  searchRequirementId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  appraisalRequestId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsDateString()
  closedAt?: string;
}
