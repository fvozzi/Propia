import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { Visit } from './visit.entity';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [TypeOrmModule.forFeature([Visit]), CalendarModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService, TypeOrmModule],
})
export class VisitsModule {}
