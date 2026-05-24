import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ActivityType } from '../../common/enums';

export class QueryActivitiesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contactId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
