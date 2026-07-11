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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommercialOpportunitiesService } from './commercial-opportunities.service';
import { CreateCommercialOpportunityDto } from './dto/create-commercial-opportunity.dto';
import { QueryCommercialOpportunitiesDto } from './dto/query-commercial-opportunities.dto';
import { UpdateCommercialOpportunityDto } from './dto/update-commercial-opportunity.dto';

@UseGuards(JwtAuthGuard)
@Controller('commercial-opportunities')
export class CommercialOpportunitiesController {
  constructor(
    private readonly commercialOpportunitiesService: CommercialOpportunitiesService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateCommercialOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commercialOpportunitiesService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: QueryCommercialOpportunitiesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commercialOpportunitiesService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commercialOpportunitiesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommercialOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commercialOpportunitiesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commercialOpportunitiesService.remove(id, user);
  }
}
