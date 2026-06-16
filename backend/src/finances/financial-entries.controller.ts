import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancesService } from './finances.service';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('financial-entries')
export class FinancialEntriesController {
  constructor(private readonly financesService: FinancesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.financesService.findAllEntries(user);
  }

  @Post()
  create(
    @Body() dto: CreateFinancialEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financesService.createEntry(dto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financesService.removeEntry(id, user);
  }
}
