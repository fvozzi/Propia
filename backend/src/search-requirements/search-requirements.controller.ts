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
import { CreateSearchRequirementDto } from './dto/create-search-requirement.dto';
import { QuerySearchRequirementsDto } from './dto/query-search-requirements.dto';
import { UpdateSearchRequirementDto } from './dto/update-search-requirement.dto';
import { SearchRequirementsService } from './search-requirements.service';

@UseGuards(JwtAuthGuard)
@Controller('search-requirements')
export class SearchRequirementsController {
  constructor(private readonly searchRequirementsService: SearchRequirementsService) {}

  @Post()
  create(@Body() dto: CreateSearchRequirementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.searchRequirementsService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: QuerySearchRequirementsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.searchRequirementsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.searchRequirementsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSearchRequirementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.searchRequirementsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.searchRequirementsService.remove(id, user);
  }
}
