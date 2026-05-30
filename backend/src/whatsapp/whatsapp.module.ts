import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../auth/team.entity';
import { Activity } from '../activities/activity.entity';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappMessage } from './whatsapp-message.entity';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Team, Activity, WhatsappMessage])],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
