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
import { CreateVisitDto } from './dto/create-visit.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { VisitsService } from './visits.service';

@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  create(@Body() dto: CreateVisitDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryVisitsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVisitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visitsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.visitsService.remove(id, user);
  }
}
