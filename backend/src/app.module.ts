import { Module } from '@nestjs/common';
import { ActivityGoalsModule } from './activity-goals/activity-goals.module';
import { AppraisalRequestsModule } from './appraisal-requests/appraisal-requests.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from './activities/activities.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BuyerPropertyCandidatesModule } from './buyer-property-candidates/buyer-property-candidates.module';
import { CalendarModule } from './calendar/calendar.module';
import { CommercialOpportunitiesModule } from './commercial-opportunities/commercial-opportunities.module';
import { ContactsModule } from './contacts/contacts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { buildDataSourceOptions } from './database/typeorm.config';
import { DocumentTemplatesModule } from './document-templates/document-templates.module';
import { ExternalSearchModule } from './external-search/external-search.module';
import { FinancesModule } from './finances/finances.module';
import { PropertiesModule } from './properties/properties.module';
import { SearchRequirementsModule } from './search-requirements/search-requirements.module';
import { VisitsModule } from './visits/visits.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

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
    ActivityGoalsModule,
    AppraisalRequestsModule,
    BuyerPropertyCandidatesModule,
    CalendarModule,
    CommercialOpportunitiesModule,
    ContactsModule,
    PropertiesModule,
    SearchRequirementsModule,
    ExternalSearchModule,
    DocumentTemplatesModule,
    FinancesModule,
    ActivitiesModule,
    VisitsModule,
    DashboardModule,
    WhatsappModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
