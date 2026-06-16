import { PartialType } from '@nestjs/mapped-types';
import { CreateActivityGoalDto } from './create-activity-goal.dto';

export class UpdateActivityGoalDto extends PartialType(CreateActivityGoalDto) {}
