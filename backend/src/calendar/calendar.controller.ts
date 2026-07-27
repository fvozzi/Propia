import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarAgendaService } from './calendar-agenda.service';
import { QueryCalendarAgendaDto } from './dto/query-calendar-agenda.dto';

@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarAgendaService: CalendarAgendaService) {}

  @Get('agenda')
  findAgenda(
    @Query() query: QueryCalendarAgendaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarAgendaService.findAgenda(query, user);
  }
}
