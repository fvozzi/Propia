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
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePortalSourceConfigDto } from './dto/create-portal-source-config.dto';
import { UpdatePortalSourceConfigDto } from './dto/update-portal-source-config.dto';
import { ExternalSearchService } from './external-search.service';

@UseGuards(JwtAuthGuard)
@Controller('portal-source-configs')
export class PortalSourceConfigsController {
  constructor(private readonly externalSearchService: ExternalSearchService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.externalSearchService.listPortalSourceConfigs(user);
  }

  @Post()
  create(@Body() dto: CreatePortalSourceConfigDto, @CurrentUser() user: AuthenticatedUser) {
    return this.externalSearchService.createPortalSourceConfig(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePortalSourceConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.updatePortalSourceConfig(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.externalSearchService.removePortalSourceConfig(id, user);
  }
}
