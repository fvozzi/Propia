import { describe, expect, it } from 'vitest';
import {
  buildVisitCalendarIcs,
  buildVisitGoogleCalendarUrl,
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

  it('builds a Google Calendar destination with the visit details', () => {
    const calendarUrl = buildVisitGoogleCalendarUrl({
      scheduledAt: new Date('2026-09-28T14:00:00.000Z'),
      status: 'SCHEDULED',
      contactId: 4,
      externalPropertyTitle: 'Departamento en Caballito',
      externalPropertyAddress: 'Del Barco Centenera 350, CABA',
      externalUrl: 'https://www.zonaprop.com.ar/depto?utm_source=share',
      colleagueName: 'Laura Colega',
      notes: 'Tocar timbre 4',
    });
    const url = new URL(calendarUrl);

    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20260928T140000Z/20260928T150000Z');
    expect(url.searchParams.get('location')).toBe('Del Barco Centenera 350, CABA');
    expect(url.searchParams.get('details')).toContain('Colega: Laura Colega');
    expect(url.searchParams.get('details')).toContain('https://www.zonaprop.com.ar/depto');
    expect(url.searchParams.get('details')).not.toContain('utm_source');
  });
});
