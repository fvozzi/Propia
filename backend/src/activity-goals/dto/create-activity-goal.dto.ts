import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { ActivityType } from '../../common/enums';

export class CreateActivityGoalDto {
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetCount: number;
}
