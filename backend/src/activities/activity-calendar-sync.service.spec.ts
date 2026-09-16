import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ActivityType } from '../common/enums';
import { GoogleCalendarService } from '../calendar/google-calendar.service';
import { Activity } from './activity.entity';
import { ActivityCalendarSyncService } from './activity-calendar-sync.service';
import { ActivitiesService } from './activities.service';

vi.mock('./activity.entity', () => ({ Activity: class Activity {} }));
vi.mock('../contacts/contact.entity', () => ({ Contact: class Contact {} }));
vi.mock('../properties/property.entity', () => ({ Property: class Property {} }));
vi.mock('../appraisal-requests/appraisal-request.entity', () => ({ AppraisalRequest: class AppraisalRequest {} }));
vi.mock('../commercial-opportunities/commercial-opportunity.entity', () => ({ CommercialOpportunity: class CommercialOpportunity {} }));
vi.mock('../calendar/google-calendar.service', () => ({ GoogleCalendarService: class GoogleCalendarService {} }));
vi.mock('playwright', () => ({ chromium: {} }));

function setup(activityType: ActivityType) {
  const activity = {
    id: 42, teamId: 3, ownerUserId: 7, activityType,
    title: 'Actividad de prueba', activityDate: new Date('2026-09-16T15:00:00Z'),
    googleEventId: null, googleSyncStatus: 'PENDING', googleSyncError: null,
  } as Activity;
  const repository = {
    findOne: vi.fn().mockResolvedValue(activity),
    save: vi.fn(async (value) => value),
  };
  const google = {
    syncActivityCreate: vi.fn().mockResolvedValue({ googleEventId: 'google-42', googleSyncStatus: 'SYNCED', googleSyncError: null }),
    syncActivityUpdate: vi.fn().mockResolvedValue({ googleEventId: 'google-42', googleSyncStatus: 'SYNCED', googleSyncError: null }),
    syncActivityDelete: vi.fn(),
  };
  const sync = new ActivityCalendarSyncService(
    repository as unknown as Repository<Activity>,
    google as unknown as GoogleCalendarService,
  );
  return { activity, repository, google, sync };
}

describe('activity calendar synchronization', () => {
  it.each([ActivityType.VISIT, ActivityType.SALE_DEED, ActivityType.PURCHASE_DEED])(
    'sends %s to Google on creation and update', async (activityType) => {
      const { activity, repository, google, sync } = setup(activityType);
      await sync.syncById(activity.id, 'create');
      expect(google.syncActivityCreate).toHaveBeenCalledWith(7, activity);
      expect(activity.googleSyncStatus).toBe('SYNCED');
      await sync.syncById(activity.id, 'update');
      expect(google.syncActivityUpdate).toHaveBeenCalledWith(7, activity);
      expect(repository.save).toHaveBeenCalledTimes(2);
    },
  );

  it('records a failed deed sync and clears the error on a successful retry', async () => {
    const { activity, google, sync } = setup(ActivityType.SALE_DEED);
    google.syncActivityCreate.mockRejectedValueOnce(new Error('Google unavailable'));
    await sync.syncById(42, 'create');
    expect(activity).toMatchObject({ googleSyncStatus: 'ERROR', googleSyncError: 'Google unavailable' });
    await sync.syncById(42, 'update');
    expect(activity).toMatchObject({ googleSyncStatus: 'SYNCED', googleSyncError: null });
  });

  it('does not synchronize activities outside the schedulable types', async () => {
    const { activity, google, sync } = setup(ActivityType.NOTE);
    await sync.syncById(42, 'create');
    expect(activity.googleSyncStatus).toBe('SKIPPED');
    expect(google.syncActivityCreate).not.toHaveBeenCalled();
  });

  it('checks team access before a manual retry and returns its persisted status', async () => {
    const { activity, repository, google, sync } = setup(ActivityType.SALE_DEED);
    const unusedRepository = {} as never;
    const service = new ActivitiesService(
      repository as unknown as Repository<Activity>, unusedRepository, unusedRepository,
      unusedRepository, unusedRepository, sync,
    );
    const user: AuthenticatedUser = { sub: 7, email: 'test@example.com', appRole: 'USER', activeTeamId: 3 };
    const result = await service.syncCalendar(42, user);
    expect(repository.findOne.mock.calls[0][0]).toMatchObject({ where: { id: 42, teamId: 3 } });
    expect(result.googleSyncStatus).toBe('SYNCED');
    expect(google.syncActivityUpdate).toHaveBeenCalledTimes(1);

    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.syncCalendar(42, { ...user, activeTeamId: 9 })).rejects.toBeInstanceOf(NotFoundException);
    expect(google.syncActivityUpdate).toHaveBeenCalledTimes(1);
  });
});
