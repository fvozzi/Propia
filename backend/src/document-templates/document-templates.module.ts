import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { DocumentTemplate } from './document-template.entity';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesService } from './document-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentTemplate, Contact, Property, User]),
  ],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
