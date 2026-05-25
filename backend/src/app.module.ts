import { Module } from '@nestjs/common';
import { AppraisalRequestsModule } from './appraisal-requests/appraisal-requests.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from './activities/activities.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BuyerPropertyCandidatesModule } from './buyer-property-candidates/buyer-property-candidates.module';
import { CalendarModule } from './calendar/calendar.module';
import { ContactsModule } from './contacts/contacts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { buildDataSourceOptions } from './database/typeorm.config';
import { PropertiesModule } from './properties/properties.module';
import { SearchRequirementsModule } from './search-requirements/search-requirements.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => buildDataSourceOptions(configService),
    }),
    AuthModule,
    AppraisalRequestsModule,
    BuyerPropertyCandidatesModule,
    CalendarModule,
    ContactsModule,
    PropertiesModule,
    SearchRequirementsModule,
    ActivitiesModule,
    VisitsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
