import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { SCHEDULABLE_ACTIVITY_TYPES } from '../activities/schedulable-activity-types';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { Contact } from '../contacts/contact.entity';
import { Visit } from '../visits/visit.entity';
import { CalendarAgendaService } from './calendar-agenda.service';
import { GoogleCalendarService } from './google-calendar.service';

vi.mock('../activities/activity.entity', () => ({ Activity: class Activity {} }));
vi.mock('../contacts/contact.entity', () => ({ Contact: class Contact {} }));
vi.mock('../visits/visit.entity', () => ({ Visit: class Visit {} }));
vi.mock('./google-calendar.service', () => ({
  GoogleCalendarService: class GoogleCalendarService {},
}));

function queryBuilder<T>(items: T[]) {
  const builder = {
    leftJoinAndSelect: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    orderBy: vi.fn(),
    getMany: vi.fn().mockResolvedValue(items),
  };

  builder.leftJoinAndSelect.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  return builder;
}

describe('CalendarAgendaService', () => {
  it('returns every local schedulable item using the same activity types as Google sync', async () => {
    const activity = { id: 1, activityType: 'VISIT' } as Activity;
    const visit = { id: 2 } as Visit;
    const activitiesQuery = queryBuilder([activity]);
    const visitsQuery = queryBuilder([visit]);
    const activitiesRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(activitiesQuery),
    };
    const visitsRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(visitsQuery),
    };
    const contactsRepository = { find: vi.fn().mockResolvedValue([]) };
    const googleCalendarService = {
      findActiveConnectionForUser: vi.fn().mockResolvedValue(null),
    };
    const service = new CalendarAgendaService(
      contactsRepository as unknown as Repository<Contact>,
      activitiesRepository as unknown as Repository<Activity>,
      visitsRepository as unknown as Repository<Visit>,
      googleCalendarService as unknown as GoogleCalendarService,
    );
    const user: AuthenticatedUser = {
      sub: 7,
      email: 'agent@example.com',
      appRole: 'USER',
      activeTeamId: 3,
    };

    const result = await service.findAgenda(
      { fromDate: '2026-09-01', toDate: '2026-09-30' },
      user,
    );

    expect(result.activities).toEqual([activity]);
    expect(result.visits).toEqual([visit]);
    expect(activitiesQuery.andWhere).toHaveBeenCalledWith(
      'activity.activityType IN (:...activityTypes)',
      { activityTypes: [...SCHEDULABLE_ACTIVITY_TYPES] },
    );
    expect(activitiesQuery.andWhere).toHaveBeenCalledWith(
      'activity.activityDate >= :from',
      { from: '2026-09-01T03:00:00.000Z' },
    );
    expect(activitiesQuery.andWhere).toHaveBeenCalledWith(
      'activity.activityDate <= :to',
      { to: '2026-10-01T02:59:59.999Z' },
    );
    expect(googleCalendarService.findActiveConnectionForUser).toHaveBeenCalledWith(7);
  });
});
