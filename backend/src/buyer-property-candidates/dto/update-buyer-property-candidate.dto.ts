import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { BuyerPropertyCandidateWorkflowStatus } from '../../common/enums';

export class UpdateBuyerPropertyCandidateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  searchRequirementId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number | null;

  @IsOptional()
  @IsString()
  portal?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  url?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsString()
  shareComments?: string | null;

  @IsOptional()
  @IsEnum(BuyerPropertyCandidateWorkflowStatus)
  workflowStatus?: BuyerPropertyCandidateWorkflowStatus;

  @IsOptional()
  @IsString()
  agentName?: string | null;

  @IsOptional()
  @IsString()
  agentWhatsapp?: string | null;

  @IsOptional()
  @IsString()
  proposedScheduleOptions?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledVisitAt?: string | null;

  @IsOptional()
  @IsString()
  workflowNotes?: string | null;

  @IsOptional()
  @IsDateString()
  lastContactedAt?: string | null;
}
