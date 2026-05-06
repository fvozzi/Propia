import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from './activities/activities.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
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
