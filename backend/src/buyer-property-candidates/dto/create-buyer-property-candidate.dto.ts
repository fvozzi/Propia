import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBuyerPropertyCandidateDto {
  @Type(() => Number)
  @IsInt()
  contactId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  searchRequirementId?: number;

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
}
