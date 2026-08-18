import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import { BuyerPropertyCandidateWorkflowStatus } from '../../common/enums';

export class CreateBuyerPropertyCandidateDto {
  @Type(() => Number)
  @IsInt()
  contactId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  searchRequirementId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsString()
  portal: string;

  @IsUrl({
    require_protocol: true,
  })
  url: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  shareComments?: string;

  @IsOptional()
  @IsEnum(BuyerPropertyCandidateWorkflowStatus)
  workflowStatus?: BuyerPropertyCandidateWorkflowStatus;

  @IsOptional()
  @IsString()
  agentName?: string;

  @IsOptional()
  @IsString()
  agentWhatsapp?: string;

  @IsOptional()
  @IsString()
  proposedScheduleOptions?: string;

  @IsOptional()
  @IsString()
  workflowNotes?: string;
}
