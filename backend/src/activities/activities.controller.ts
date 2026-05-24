import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { ShareActivityDto } from './dto/share-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryActivitiesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.update(id, dto, user);
  }

  @Patch(':id/share')
  share(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShareActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.share(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.activitiesService.remove(id, user);
  }
}
