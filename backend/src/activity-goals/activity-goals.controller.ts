import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityGoalsService } from './activity-goals.service';
import { CreateActivityGoalDto } from './dto/create-activity-goal.dto';
import { UpdateActivityGoalDto } from './dto/update-activity-goal.dto';

@UseGuards(JwtAuthGuard)
@Controller('activity-goals')
export class ActivityGoalsController {
  constructor(private readonly activityGoalsService: ActivityGoalsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.activityGoalsService.findAll(user);
  }

  @Post()
  create(@Body() dto: CreateActivityGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.activityGoalsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityGoalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activityGoalsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.activityGoalsService.remove(id, user);
  }
}
