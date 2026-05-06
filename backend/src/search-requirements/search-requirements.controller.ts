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
  create(@Body() dto: CreateSearchRequirementDto) {
    return this.searchRequirementsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QuerySearchRequirementsDto) {
    return this.searchRequirementsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.searchRequirementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSearchRequirementDto,
  ) {
    return this.searchRequirementsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.searchRequirementsService.remove(id);
  }
}
