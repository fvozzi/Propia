import { describe, expect, it } from 'vitest';
import { ActivityType } from '../common/enums';
import { buildActivityCalendarEvent } from './google-calendar-activity.use-case';

describe('google-calendar-activity use case', () => {
  it('builds a property search event with link and feedback', () => {
    const event = buildActivityCalendarEvent(
      {
        activityType: ActivityType.PROPERTY_SEARCH,
        title: 'Depto 3 ambientes',
        description: 'Mira la distribucion',
        externalUrl: 'https://example.com/publicacion',
        whatsappComment: 'Te lo comparto para revisar',
        whatsappSharedAt: new Date('2026-05-25T12:00:00.000Z'),
        propertySearchLiked: true,
        activityDate: new Date('2026-05-25T10:00:00.000Z'),
        nextFollowUpDate: new Date('2026-05-26T10:00:00.000Z'),
        contact: { displayName: 'Luciano Perez' },
        property: {
          title: 'PH reciclado con patio',
          address: 'Av. Directorio 1200',
          city: 'Buenos Aires',
        },
      },
      { frontendUrl: 'https://app.propiacrm.ar' },
    );

    expect(event.summary).toBe('Busqueda de propiedad - Depto 3 ambientes');
    expect(event.location).toBe('Av. Directorio 1200, Buenos Aires');
    expect(event.description).toContain('Contacto: Luciano Perez');
    expect(event.description).toContain('Link: https://example.com/publicacion');
    expect(event.description).toContain('Respuesta del cliente: Le gusto');
    expect(event.end.dateTime).toBe('2026-05-25T11:00:00.000Z');
  });

  it('builds an appraisal request event with public form link', () => {
    const event = buildActivityCalendarEvent(
      {
        activityType: ActivityType.APPRAISAL_REQUEST,
        title: 'Prelisting · Arcos 2100',
        activityDate: new Date('2026-05-25T09:00:00.000Z'),
        contact: { displayName: 'Susi' },
        appraisalRequest: {
          publicToken: 'abc123',
          propertyAddress: 'Arcos 2100',
          city: 'Buenos Aires',
          expiresAt: new Date('2026-05-27T09:00:00.000Z'),
          submittedAt: null,
        },
      },
      { frontendUrl: 'https://app.propiacrm.ar/' },
    );

    expect(event.summary).toBe('Prelisting · Arcos 2100');
    expect(event.location).toBe('Arcos 2100, Buenos Aires');
    expect(event.description).toContain('Formulario publico: https://app.propiacrm.ar/prelisting/abc123');
    expect(event.description).toContain('Estado de solicitud: Pendiente');
  });
});
