import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancesService } from './finances.service';
import { UpdateFinanceConfigDto } from './dto/update-finance-config.dto';

@UseGuards(JwtAuthGuard)
@Controller('finance-config')
export class FinanceConfigController {
  constructor(private readonly financesService: FinancesService) {}

  @Get()
  findOne(@CurrentUser() user: AuthenticatedUser) {
    return this.financesService.getConfig(user);
  }

  @Patch()
  update(
    @Body() dto: UpdateFinanceConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financesService.updateConfig(dto, user);
  }
}
