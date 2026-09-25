import { describe, expect, it } from 'vitest';
import {
  buildVisitCalendarIcs,
  sanitizeSharedPropertyUrl,
} from './visit-share-links.use-case';

describe('visit share links', () => {
  it('removes portal tracking parameters without changing the property path', () => {
    expect(
      sanitizeSharedPropertyUrl(
        'https://www.zonaprop.com.ar/propiedades/depto.html?n_src=listado&n_pos=5&utm_source=share&dato=util',
      ),
    ).toBe('https://www.zonaprop.com.ar/propiedades/depto.html?dato=util');
  });

  it('builds a portable calendar event with the visit details', () => {
    const calendar = buildVisitCalendarIcs({
      publicToken: 'abc123',
      scheduledAt: new Date('2026-09-28T14:00:00.000Z'),
      status: 'SCHEDULED',
      contactId: 4,
      externalPropertyTitle: 'Departamento en Caballito',
      externalPropertyAddress: 'Del Barco Centenera 350, CABA',
      externalUrl: 'https://www.zonaprop.com.ar/depto?utm_source=share',
      colleagueName: 'Laura Colega',
      notes: 'Tocar timbre 4',
    });

    expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
    expect(calendar).toContain('DTSTART:20260928T140000Z');
    expect(calendar).toContain('DTEND:20260928T150000Z');
    expect(calendar).toContain('LOCATION:Del Barco Centenera 350\\, CABA');
    expect(calendar).toContain('Colega: Laura Colega');
    expect(calendar).toContain('https://www.zonaprop.com.ar/depto');
    expect(calendar).not.toContain('utm_source');
  });
});
