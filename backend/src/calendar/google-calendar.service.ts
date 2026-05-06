import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository } from 'typeorm';
import { GoogleCalendarConnection } from '../auth/google-calendar-connection.entity';
import { Visit } from '../visits/visit.entity';

@Injectable()
export class GoogleCalendarService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(GoogleCalendarConnection)
    private readonly connectionsRepository: Repository<GoogleCalendarConnection>,
  ) {}

  async findActiveConnectionForUser(userId: number) {
    return this.connectionsRepository.findOne({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  async disconnectUser(userId: number) {
    const connection = await this.findActiveConnectionForUser(userId);

    if (!connection) {
      return { success: true };
    }

    connection.isActive = false;
    await this.connectionsRepository.save(connection);

    return { success: true };
  }

  async syncVisitCreate(userId: number, visit: Visit) {
    const connection = await this.findActiveConnectionForUser(userId);

    if (!connection) {
      return {
        googleEventId: null,
        googleSyncStatus: 'NOT_CONNECTED',
        lastSyncedAt: null,
        googleSyncError: null,
      };
    }

    const calendar = await this.createCalendarClient(connection);
    const response = await calendar.events.insert({
      calendarId: connection.calendarId,
      requestBody: this.buildVisitEvent(visit),
    });

    return {
      googleEventId: response.data.id ?? null,
      googleSyncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
      googleSyncError: null,
    };
  }

  async syncVisitUpdate(userId: number, visit: Visit) {
    const connection = await this.findActiveConnectionForUser(userId);

    if (!connection) {
      return {
        googleSyncStatus: 'NOT_CONNECTED',
      };
    }

    if (!visit.googleEventId) {
      return this.syncVisitCreate(userId, visit);
    }

    const calendar = await this.createCalendarClient(connection);
    await calendar.events.update({
      calendarId: connection.calendarId,
      eventId: visit.googleEventId,
      requestBody: this.buildVisitEvent(visit),
    });

    return {
      googleSyncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
      googleSyncError: null,
    };
  }

  async syncVisitDelete(userId: number, visit: Visit) {
    const connection = await this.findActiveConnectionForUser(userId);

    if (!connection || !visit.googleEventId) {
      return;
    }

    const calendar = await this.createCalendarClient(connection);
    await calendar.events.delete({
      calendarId: connection.calendarId,
      eventId: visit.googleEventId,
    });
  }

  private async createCalendarClient(connection: GoogleCalendarConnection) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken ?? undefined,
      refresh_token: connection.refreshToken ?? undefined,
      expiry_date: connection.expiryDate ?? undefined,
      scope: connection.scope ?? undefined,
      token_type: connection.tokenType ?? undefined,
    });

    oauth2Client.on('tokens', async (tokens) => {
      connection.accessToken = tokens.access_token ?? connection.accessToken;
      connection.refreshToken = tokens.refresh_token ?? connection.refreshToken;
      connection.expiryDate = tokens.expiry_date ?? connection.expiryDate;
      connection.scope = tokens.scope ?? connection.scope;
      connection.tokenType = tokens.token_type ?? connection.tokenType;
      await this.connectionsRepository.save(connection);
    });

    return google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  private buildVisitEvent(visit: Visit) {
    const endDate = new Date(visit.scheduledAt);
    endDate.setHours(endDate.getHours() + 1);

    const propertyTitle = visit.property?.title ?? `Property #${visit.propertyId}`;
    const propertyAddress = visit.property?.address
      ? `${visit.property.address}, ${visit.property.city}`
      : 'Address pending';
    const contactName = visit.contact?.displayName ?? `Contact #${visit.contactId}`;

    return {
      summary: `Property visit - ${propertyTitle}`,
      description: [
        `Contact: ${contactName}`,
        `Property: ${propertyTitle}`,
        `Address: ${propertyAddress}`,
        `Status: ${visit.status}`,
        visit.notes ? `Notes: ${visit.notes}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      location: propertyAddress,
      start: {
        dateTime: visit.scheduledAt.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
    };
  }
}
