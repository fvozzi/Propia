import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type { GoogleCalendarService } from '../calendar/google-calendar.service';
import { VisitStatus } from '../common/enums';
import type { Contact } from '../contacts/contact.entity';
import type { Property } from '../properties/property.entity';
import type { SearchRequirement } from '../search-requirements/search-requirement.entity';
import type { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import type { Visit } from './visit.entity';
import { VisitsService } from './visits.service';

vi.mock('./visit.entity', () => ({ Visit: class Visit {} }));
vi.mock('../contacts/contact.entity', () => ({ Contact: class Contact {} }));
vi.mock('../properties/property.entity', () => ({ Property: class Property {} }));
vi.mock('../search-requirements/search-requirement.entity', () => ({ SearchRequirement: class SearchRequirement {} }));
vi.mock('../buyer-property-candidates/buyer-property-candidate.entity', () => ({ BuyerPropertyCandidate: class BuyerPropertyCandidate {} }));
vi.mock('../calendar/google-calendar.service', () => ({ GoogleCalendarService: class GoogleCalendarService {} }));

function setup() {
  const visit = { id: 91, teamId: 3, ownerUserId: 7, contactId: 11, propertyId: null,
    externalPropertyTitle: 'Calle 123', googleEventId: 'existing-event', googleSyncStatus: 'ERROR' } as Visit;
  const repository = {
    findOne: vi.fn().mockResolvedValue(visit),
    create: vi.fn((value) => Object.assign(visit, value)),
    save: vi.fn(async (value) => value),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const contacts = { findOne: vi.fn().mockResolvedValue({ id: 11 }) };
  const properties = { findOne: vi.fn() };
  const requirements = { findOne: vi.fn() };
  const candidates = { findOne: vi.fn(), save: vi.fn(async (value) => value) };
  const google = {
    syncVisitCreate: vi.fn().mockResolvedValue({ googleSyncStatus: 'SYNCED', googleSyncError: null }),
    syncVisitUpdate: vi.fn().mockResolvedValue({ googleSyncStatus: 'SYNCED', googleSyncError: null }),
    syncVisitDelete: vi.fn().mockResolvedValue(undefined),
  };
  const service = new VisitsService(repository as unknown as Repository<Visit>, contacts as unknown as Repository<Contact>,
    properties as unknown as Repository<Property>, requirements as unknown as Repository<SearchRequirement>,
    candidates as unknown as Repository<BuyerPropertyCandidate>, google as unknown as GoogleCalendarService);
  const user: AuthenticatedUser = { sub: 7, email: 'test@example.com', appRole: 'USER', activeTeamId: 3 };
  return { visit, repository, properties, requirements, candidates, google, service, user };
}

describe('VisitsService unified calendar flow', () => {
  it('deletes the linked Google event from the owner calendar before removing a visit', async () => {
    const { service, user, visit, repository, google } = setup();
    await service.remove(91, { ...user, sub: 8 });
    expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 91, teamId: 3 } }));
    expect(google.syncVisitDelete).toHaveBeenCalledWith(7, visit);
    expect(repository.remove).toHaveBeenCalledWith(visit);
    expect(google.syncVisitDelete.mock.invocationCallOrder[0]).toBeLessThan(repository.remove.mock.invocationCallOrder[0]);
  });

  it('does not delete a visit outside the active team', async () => {
    const { service, user, repository, google } = setup();
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.remove(91, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
    expect(google.syncVisitDelete).not.toHaveBeenCalled();
  });

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

  it('prefills property and colleague data from a buyer search candidate', async () => {
    const { service, user, candidates, requirements, properties } = setup();
    candidates.findOne.mockResolvedValue({
      id: 44,
      teamId: 3,
      contactId: 11,
      propertyId: 22,
      searchRequirementId: 33,
      title: 'Departamento en Palermo',
      url: 'https://example.com/depto',
      agentName: 'Laura Colega',
      agentWhatsapp: '5491112345678',
      property: { id: 22, address: 'Guatemala 4500', city: 'CABA' },
    });
    properties.findOne.mockResolvedValue({ id: 22 });
    requirements.findOne.mockResolvedValue({ id: 33 });

    const saved = await service.create({
      contactId: 11,
      buyerPropertyCandidateId: 44,
      scheduledAt: '2026-09-16T14:00:00Z',
      status: VisitStatus.SCHEDULED,
    }, user);

    expect(saved.propertyId).toBe(22);
    expect(saved.searchRequirementId).toBe(33);
    expect(saved.colleagueName).toBe('Laura Colega');
    expect(saved.externalPropertyAddress).toBe('Guatemala 4500, CABA');
    expect(saved.externalUrl).toBe('https://example.com/depto');
    expect(candidates.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowStatus: 'VISIT_SCHEDULED',
        scheduledVisitAt: new Date('2026-09-16T14:00:00Z'),
      }),
    );
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
