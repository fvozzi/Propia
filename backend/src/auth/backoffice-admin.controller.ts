import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { BackofficeGuard } from './backoffice.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BackofficeAdminService } from './backoffice-admin.service';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

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
}
