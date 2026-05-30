import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BackofficeGuard } from './backoffice.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BackofficeAdminService } from './backoffice-admin.service';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { CreatePortalSourceConfigDto } from '../external-search/dto/create-portal-source-config.dto';
import { UpdatePortalSourceConfigDto } from '../external-search/dto/update-portal-source-config.dto';

@UseGuards(JwtAuthGuard, BackofficeGuard)
@Controller('admin/backoffice')
export class BackofficeAdminController {
  constructor(private readonly backofficeAdminService: BackofficeAdminService) {}

  @Get('overview')
  getOverview() {
    return this.backofficeAdminService.getOverview();
  }

  @Get('accounts')
  listAccounts() {
    return this.backofficeAdminService.listAccounts();
  }

  @Patch('accounts/:id')
  updateAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminAccountDto,
  ) {
    return this.backofficeAdminService.updateAccount(id, dto);
  }

  @Get('portal-source-configs')
  listPortalSourceConfigs() {
    return this.backofficeAdminService.listPortalSourceConfigs();
  }

  @Post('accounts/:id/portal-source-configs')
  createPortalSourceConfig(
    @Param('id', ParseIntPipe) accountId: number,
    @Body() dto: CreatePortalSourceConfigDto,
  ) {
    return this.backofficeAdminService.createPortalSourceConfig(accountId, dto);
  }

  @Patch('portal-source-configs/:id')
  updatePortalSourceConfig(
    @Param('id', ParseIntPipe) configId: number,
    @Body() dto: UpdatePortalSourceConfigDto,
  ) {
    return this.backofficeAdminService.updatePortalSourceConfig(configId, dto);
  }

  @Post('portal-source-configs/:id/delete')
  deletePortalSourceConfig(@Param('id', ParseIntPipe) configId: number) {
    return this.backofficeAdminService.deletePortalSourceConfig(configId);
  }
}
