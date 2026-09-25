import { describe, expect, it } from 'vitest';
import { buildVisitCalendarEvent } from './google-calendar-visit.use-case';

describe('google calendar visit use case', () => {
  it('includes colleague, property address and listing link', () => {
    const event = buildVisitCalendarEvent({
      scheduledAt: new Date('2026-09-25T18:00:00.000Z'),
      status: 'SCHEDULED',
      contactId: 10,
      contact: { displayName: 'Cliente Comprador' },
      colleagueContact: { displayName: 'Laura Colega' },
      externalPropertyTitle: 'Departamento en Palermo',
      externalPropertyAddress: 'Guatemala 4500, CABA',
      externalUrl: 'https://example.com/departamento',
    });

    expect(event.summary).toBe(
      'Visita a propiedad de colega - Departamento en Palermo',
    );
    expect(event.location).toBe('Guatemala 4500, CABA');
    expect(event.description).toContain('Colega: Laura Colega');
    expect(event.description).toContain('Direccion: Guatemala 4500, CABA');
    expect(event.description).toContain(
      'Link de la propiedad: https://example.com/departamento',
    );
  });
});
