import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type { GoogleCalendarService } from '../calendar/google-calendar.service';
import { VisitStatus } from '../common/enums';
import type { Contact } from '../contacts/contact.entity';
import type { Property } from '../properties/property.entity';
import type { Visit } from './visit.entity';
import { VisitsService } from './visits.service';

vi.mock('./visit.entity', () => ({ Visit: class Visit {} }));
vi.mock('../contacts/contact.entity', () => ({ Contact: class Contact {} }));
vi.mock('../properties/property.entity', () => ({ Property: class Property {} }));
vi.mock('../calendar/google-calendar.service', () => ({ GoogleCalendarService: class GoogleCalendarService {} }));

function setup() {
  const visit = { id: 91, teamId: 3, ownerUserId: 7, contactId: 11, propertyId: null,
    externalPropertyTitle: 'Calle 123', googleEventId: 'existing-event', googleSyncStatus: 'ERROR' } as Visit;
  const repository = {
    findOne: vi.fn().mockResolvedValue(visit),
    create: vi.fn((value) => Object.assign(visit, value)),
    save: vi.fn(async (value) => value),
  };
  const contacts = { findOne: vi.fn().mockResolvedValue({ id: 11 }) };
  const properties = { findOne: vi.fn() };
  const google = {
    syncVisitCreate: vi.fn().mockResolvedValue({ googleSyncStatus: 'SYNCED', googleSyncError: null }),
    syncVisitUpdate: vi.fn().mockResolvedValue({ googleSyncStatus: 'SYNCED', googleSyncError: null }),
  };
  const service = new VisitsService(repository as unknown as Repository<Visit>, contacts as unknown as Repository<Contact>,
    properties as unknown as Repository<Property>, google as unknown as GoogleCalendarService);
  const user: AuthenticatedUser = { sub: 7, email: 'test@example.com', appRole: 'USER', activeTeamId: 3 };
  return { visit, repository, properties, google, service, user };
}

describe('VisitsService unified calendar flow', () => {
  it('creates and syncs an external visit without a CRM property', async () => {
    const { service, user, properties, google } = setup();
    const saved = await service.create({ contactId: 11, propertyId: null,
      externalPropertyTitle: 'Calle 123', externalPropertyAddress: 'Calle 123',
      scheduledAt: '2026-09-16T14:00:00Z', status: VisitStatus.SCHEDULED }, user);
    expect(saved.propertyId).toBeNull();
    expect(saved.googleSyncStatus).toBe('SYNCED');
    expect(properties.findOne).not.toHaveBeenCalled();
    expect(google.syncVisitCreate).toHaveBeenCalledWith(7, saved);
  });

  it('retries on the original owner calendar when a teammate edits the visit', async () => {
    const { service, user, visit, repository, google } = setup();
    const saved = await service.syncCalendar(91, { ...user, sub: 8 });
    expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 91, teamId: 3 } }));
    expect(google.syncVisitUpdate).toHaveBeenCalledWith(7, visit);
    expect(saved.googleEventId).toBe('existing-event');
    expect(saved.googleSyncStatus).toBe('SYNCED');
    expect(google.syncVisitCreate).not.toHaveBeenCalled();
  });

  it('rejects retries for visits outside the active team before contacting Google', async () => {
    const { service, user, repository, google } = setup();
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.syncCalendar(91, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(google.syncVisitUpdate).not.toHaveBeenCalled();
  });
});
