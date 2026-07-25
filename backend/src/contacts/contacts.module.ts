import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCalendarConnection } from '../auth/google-calendar-connection.entity';
import { ContactRole } from './contact-role.entity';
import { Contact } from './contact.entity';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, ContactRole, GoogleCalendarConnection])],
  providers: [ContactsService],
  controllers: [ContactsController],
  exports: [ContactsService, TypeOrmModule],
})
export class ContactsModule {}
