import { describe, expect, it } from 'vitest';
import {
  buildContactPhoneMatchKeys,
  type GoogleContactGroupDescriptor,
  buildGoogleContactCandidate,
  normalizeContactPhone,
} from './google-contact-sync.use-case';

describe('google-contact-sync use case', () => {
  it('normalizes phone numbers to digits for deduplication', () => {
    expect(normalizeContactPhone('+54 9 11 5555-1234')).toBe('5491155551234');
    expect(normalizeContactPhone('011 15 5555 1234')).toBe('0111555551234');
    expect(normalizeContactPhone('')).toBeNull();
    expect(normalizeContactPhone(null)).toBeNull();
  });

  it('builds equivalent phone match keys for common argentinian mobile formats', () => {
    expect(buildContactPhoneMatchKeys('+54 9 11 5555-1234')).toContain('5491155551234');
    expect(buildContactPhoneMatchKeys('011 15 5555 1234')).toContain('5491155551234');
    expect(buildContactPhoneMatchKeys('11 5555 1234')).toContain('5491155551234');
  });

  it('builds a contact candidate from the primary google values', () => {
    expect(
      buildGoogleContactCandidate({
        names: [
          {
            displayName: 'Victoria Test',
            givenName: 'Victoria',
            familyName: 'Test',
            metadata: { primary: true },
          },
        ],
        phoneNumbers: [
          {
            value: '+54 9 11 5555-1234',
            canonicalForm: '+5491155551234',
            metadata: { primary: true },
          },
        ],
        emailAddresses: [{ value: 'victoria@test.com', metadata: { primary: true } }],
        biographies: [{ value: 'Cliente de referencia', metadata: { primary: true } }],
      }),
    ).toMatchObject({
      firstName: 'Victoria',
      lastName: 'Test',
      displayName: 'Victoria Test',
      phone: '+5491155551234',
      whatsapp: '+5491155551234',
      email: 'victoria@test.com',
      notes: 'Cliente de referencia',
      birthday: null,
      googleTags: [],
      normalizedPhone: '5491155551234',
    });
  });

  it('falls back to display name when the contact has no structured given name', () => {
    expect(
      buildGoogleContactCandidate({
        names: [{ displayName: 'Facundo Vozzi', metadata: { primary: true } }],
        phoneNumbers: [{ value: '11 4444 5555', metadata: { primary: true } }],
      }),
    ).toMatchObject({
      firstName: 'Facundo',
      lastName: 'Vozzi',
      displayName: 'Facundo Vozzi',
      normalizedPhone: '1144445555',
    });
  });

  it('extracts birthday and tags from google contacts data', () => {
    const groups = new Map<string, GoogleContactGroupDescriptor>([
      [
        'contactGroups/myContacts',
        { name: 'myContacts', groupType: 'SYSTEM_CONTACT_GROUP' },
      ],
      [
        'contactGroups/coworkers',
        { name: 'coworkers', groupType: 'SYSTEM_CONTACT_GROUP' },
      ],
      [
        'contactGroups/no-contactables',
        { name: 'No Contactables', groupType: 'USER_CONTACT_GROUP' },
      ],
      [
        'contactGroups/referidos',
        { name: 'Referidos', groupType: 'USER_CONTACT_GROUP' },
      ],
    ]);

    expect(
      buildGoogleContactCandidate(
        {
          names: [{ displayName: 'Lucia P', metadata: { primary: true } }],
          phoneNumbers: [{ value: '+54 9 11 1234-5678', metadata: { primary: true } }],
          birthdays: [{ date: { month: 8, day: 14 } }],
          memberships: [
            {
              contactGroupMembership: {
                contactGroupResourceName: 'contactGroups/myContacts',
              },
            },
            {
              contactGroupMembership: {
                contactGroupResourceName: 'contactGroups/coworkers',
              },
            },
            {
              contactGroupMembership: {
                contactGroupResourceName: 'contactGroups/no-contactables',
              },
            },
            {
              contactGroupMembership: {
                contactGroupResourceName: 'contactGroups/referidos',
              },
            },
          ],
        },
        groups,
      ),
    ).toMatchObject({
      birthday: '--08-14',
      googleTags: ['Trabajo', 'No Contactables', 'Referidos'],
    });
  });
});
