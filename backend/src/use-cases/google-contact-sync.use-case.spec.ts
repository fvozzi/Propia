import { describe, expect, it } from 'vitest';
import {
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
});
