import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import {
  requireActiveTeamId,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  hasGoogleScope,
} from '../auth/google-scopes';
import { Contact } from '../contacts/contact.entity';
import { Visit } from '../visits/visit.entity';
import { GoogleCalendarService } from './google-calendar.service';
import { QueryCalendarAgendaDto } from './dto/query-calendar-agenda.dto';

type CalendarBirthdayItem = {
  id: string;
  contactId: number;
  displayName: string;
  phone: string | null;
  whatsapp: string | null;
  date: string;
  birthday: string;
};

type CalendarGoogleEventItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  description: string | null;
  externalUrl: string | null;
};

@Injectable()
export class CalendarAgendaService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(Visit)
    private readonly visitsRepository: Repository<Visit>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async findAgenda(query: QueryCalendarAgendaDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const range = normalizeDateRange(query.fromDate, query.toDate);
    const [birthdays, googleEvents] = await Promise.all([
      this.findBirthdays(teamId, range.from, range.to),
      this.findGoogleCalendarEvents(teamId, user.sub, range.from, range.to),
    ]);

    return {
      birthdays,
      googleEvents: googleEvents.items,
      googleCalendarConnected: googleEvents.connected,
      googleCalendarPermissionGranted: googleEvents.permissionGranted,
    };
  }

  private async findBirthdays(teamId: number, from: Date, to: Date) {
    const contacts = await this.contactsRepository.find({
      where: { teamId },
      select: {
        id: true,
        displayName: true,
        phone: true,
        whatsapp: true,
        birthday: true,
      },
      order: {
        displayName: 'ASC',
      },
    });

    const items: CalendarBirthdayItem[] = [];

    contacts.forEach((contact) => {
      const birthdayParts = parseBirthday(contact.birthday);
      if (!birthdayParts) {
        return;
      }

      for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
        const occurrence = buildBirthdayOccurrence(year, birthdayParts.month, birthdayParts.day);
        if (!occurrence) {
          continue;
        }

        if (occurrence < from || occurrence > to) {
          continue;
        }

        items.push({
          id: `birthday-${contact.id}-${formatDateKeyUtc(occurrence)}`,
          contactId: contact.id,
          displayName: contact.displayName,
          phone: contact.phone,
          whatsapp: contact.whatsapp,
          date: formatDateKeyUtc(occurrence),
          birthday: contact.birthday!,
        });
      }
    });

    return items.sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }

      return left.displayName.localeCompare(right.displayName, 'es');
    });
  }

  private async findGoogleCalendarEvents(
    teamId: number,
    userId: number,
    from: Date,
    to: Date,
  ) {
    const connection = await this.googleCalendarService.findActiveConnectionForUser(userId);

    if (!connection) {
      return {
        connected: false,
        permissionGranted: false,
        items: [] as CalendarGoogleEventItem[],
      };
    }

    const permissionGranted = hasGoogleScope(
      connection.scope,
      GOOGLE_CALENDAR_EVENTS_SCOPE,
    );

    if (!permissionGranted) {
      return {
        connected: true,
        permissionGranted: false,
        items: [] as CalendarGoogleEventItem[],
      };
    }

    const [googleEvents, syncedGoogleEventIds] = await Promise.all([
      this.googleCalendarService.listPrimaryEvents(connection, from, to),
      this.findSyncedGoogleEventIds(teamId, from, to),
    ]);

    const filteredItems = googleEvents
      .filter((event) => event.id && !syncedGoogleEventIds.has(event.id))
      .map((event) => mapGoogleEvent(event))
      .filter((event): event is CalendarGoogleEventItem => Boolean(event));

    return {
      connected: true,
      permissionGranted: true,
      items: filteredItems,
    };
  }

  private async findSyncedGoogleEventIds(teamId: number, from: Date, to: Date) {
    const nextDay = new Date(to);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const [activities, visits] = await Promise.all([
      this.activitiesRepository
        .createQueryBuilder('activity')
        .select('activity.googleEventId', 'googleEventId')
        .where('activity.teamId = :teamId', { teamId })
        .andWhere('activity.googleEventId IS NOT NULL')
        .andWhere('activity.activityDate >= :from', { from: from.toISOString() })
        .andWhere('activity.activityDate < :to', { to: nextDay.toISOString() })
        .getRawMany<{ googleEventId: string | null }>(),
      this.visitsRepository
        .createQueryBuilder('visit')
        .select('visit.googleEventId', 'googleEventId')
        .where('visit.teamId = :teamId', { teamId })
        .andWhere('visit.googleEventId IS NOT NULL')
        .andWhere('visit.scheduledAt >= :from', { from: from.toISOString() })
        .andWhere('visit.scheduledAt < :to', { to: nextDay.toISOString() })
        .getRawMany<{ googleEventId: string | null }>(),
    ]);

    return new Set(
      [...activities, ...visits]
        .map((item) => item.googleEventId?.trim())
        .filter((value): value is string => Boolean(value)),
    );
  }
}

function normalizeDateRange(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T23:59:59.999Z`);
  return { from, to };
}

function parseBirthday(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const yearlessMatch = value.match(/^--(\d{2})-(\d{2})$/);
  if (yearlessMatch) {
    return {
      month: Number(yearlessMatch[1]),
      day: Number(yearlessMatch[2]),
    };
  }

  const fullMatch = value.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!fullMatch) {
    return null;
  }

  return {
    month: Number(fullMatch[1]),
    day: Number(fullMatch[2]),
  };
}

function buildBirthdayOccurrence(year: number, month: number, day: number) {
  const occurrence = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  if (
    occurrence.getUTCFullYear() !== year ||
    occurrence.getUTCMonth() !== month - 1 ||
    occurrence.getUTCDate() !== day
  ) {
    return null;
  }

  return occurrence;
}

function formatDateKeyUtc(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapGoogleEvent(event: {
  id: string | null | undefined;
  summary: string | null | undefined;
  description: string | null | undefined;
  htmlLink: string | null | undefined;
  startDateTime: string | null | undefined;
  startDate: string | null | undefined;
  endDateTime: string | null | undefined;
  endDate: string | null | undefined;
}) {
  const startsAt = event.startDateTime ?? event.startDate;
  if (!event.id || !startsAt) {
    return null;
  }

  const allDay = !event.startDateTime;

  return {
    id: event.id,
    title: event.summary?.trim() || 'Google Calendar',
    startsAt: allDay ? `${event.startDate}T00:00:00` : event.startDateTime!,
    endsAt: allDay
      ? event.endDate
        ? `${event.endDate}T00:00:00`
        : null
      : event.endDateTime ?? null,
    allDay,
    description: event.description?.trim() || null,
    externalUrl: event.htmlLink?.trim() || null,
  };
}
