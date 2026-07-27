import { IsDateString } from 'class-validator';

export class QueryCalendarAgendaDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}
