import { Type } from 'class-transformer';
import {
  IsDateString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ActivityType } from '../../common/enums';

export class CreateActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contactId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  appraisalRequestId?: number;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  externalUrl?: string;

  @IsOptional()
  @IsString()
  whatsappComment?: string;

  @IsOptional()
  @IsDateString()
  whatsappSharedAt?: string;

  @IsOptional()
  @IsBoolean()
  propertySearchLiked?: boolean;

  @IsDateString()
  activityDate: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}
