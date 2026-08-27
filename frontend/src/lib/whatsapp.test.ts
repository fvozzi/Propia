import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBirthdayWhatsappMessage,
  buildBuyerSearchAgentMessage,
  buildWhatsAppPickerUrl,
  buildPropertySearchMessage,
  buildReservationTreasuryWhatsappMessage,
  buildVisitWhatsappMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from './whatsapp';

describe('whatsapp helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });
  });

  it('builds the property search message from comment and link', () => {
    expect(
      buildPropertySearchMessage({
        whatsappComment: 'Te comparto esta opcion',
        externalUrl: 'https://zonaprop.com.ar/publicacion',
      }),
    ).toBe('Te comparto esta opcion\n\nhttps://zonaprop.com.ar/publicacion');
  });

  it('builds a birthday greeting message', () => {
    expect(buildBirthdayWhatsappMessage('Victoria')).toBe(
      'Feliz cumpleaños Victoria! Espero que tengas un gran día.',
    );
  });

  it('builds the visit confirmation message with schedule, address and link', () => {
    expect(
      buildVisitWhatsappMessage({
        scheduledAt: '2026-05-11T14:30:00.000Z',
        status: 'SCHEDULED',
        notes: null,
        externalUrl: 'https://www.zonaprop.com.ar/propiedades/clasificado/ejemplo.html',
        property: {
          address: 'Av Dorrego 1653 timbre 5',
          neighborhood: 'Palermo Hollywood',
          city: 'CABA',
        },
      }),
    ).toBe(
      [
        '✅ VISITA CONFIRMADA',
        '🗓️ LUNES 11/05/2026',
        '🕒 11:30 hs',
        '📍 Av Dorrego 1653 timbre 5, Palermo Hollywood',
        '🔗 https://www.zonaprop.com.ar/propiedades/clasificado/ejemplo.html',
      ].join('\n'),
    );
  });

  it('builds the full treasury reservation message for manual WhatsApp Web sending', () => {
    expect(
      buildReservationTreasuryWhatsappMessage(
        {
          externalUrl: 'https://drive.google.com/file/d/reserva-caballito/view',
          description: null,
          reservationData: {
            agentName: 'Victoria Arque',
            operationType: 'BUY',
            operationAmount: 92000,
            operationCurrency: 'USD',
            propertyAddress: 'Av. La Plata 249 11 B',
            propertyNeighborhood: 'Caballito',
            propertyType: 'APARTMENT',
            sidesCount: 1,
            commissionPercent: 2,
            reservationAmount: 1400,
            reservationCurrency: 'USD',
            sharedWithRealEstate: true,
            conformed: false,
            credit: false,
            relocation: false,
            estimatedClosingMonth: 'Agosto',
            observations: '75% Lila, 25% Victoria',
          },
          property: {
            address: 'Av. La Plata 249 11 B',
            neighborhood: 'Caballito',
          },
        },
        'Victoria Arque',
      ),
    ).toBe(
      [
        '* Agente: Victoria Arque',
        '* Monto operación: U$S 92.000',
        '* Dirección: Av. La Plata 249 11 B',
        '* Barrio: Caballito',
        '* Operación: Compra',
        '* Puntas: 1',
        '* Porcentaje: 2%',
        '* Cuánto dejaron de reserva: U$S 1.400',
        '* Compartida con Inmobiliaria: Si',
        '* Conformada: No',
        '* Crédito: No',
        '* Tipo propiedad: Departamento',
        '* Reubicación: No',
        '* Mes estimado de Cierre: Agosto',
        '* Documento reserva: https://drive.google.com/file/d/reserva-caballito/view',
        '* Observaciones: 75% Lila, 25% Victoria',
      ].join('\n'),
    );
  });

  it('prefers whatsapp over phone for the contact number', () => {
    expect(
      getContactWhatsappPhone({
        whatsapp: '+5491130276632',
        phone: '1130276632',
      }),
    ).toBe('+5491130276632');
  });

  it('uses the desktop share url and keeps the original phone value', () => {
    const url = buildWhatsAppShareUrl(
      { whatsapp: '+5491130276632', phone: null },
      'Hola Facu',
    );

    expect(url).toContain('https://api.whatsapp.com/send/?');
    expect(decodeURIComponent(url)).toContain('phone=+5491130276632');
    expect(decodeURIComponent(url)).toContain('text=Hola+Facu');
  });

  it('uses whatsapp://send on mobile and normalizes an argentinian local number', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Tablet)',
      configurable: true,
    });

    const url = buildWhatsAppShareUrl(
      { whatsapp: '11 3027-6632', phone: null },
      'Hola desde Android',
    );

    expect(url).toContain('whatsapp://send?');
    expect(decodeURIComponent(url)).toContain('phone=5491130276632');
  });

  it('builds a picker url without recipient on desktop', () => {
    const url = buildWhatsAppPickerUrl('Hola grupo');

    expect(url).toContain('https://wa.me/?');
    expect(decodeURIComponent(url)).toContain('text=Hola+grupo');
    expect(url).not.toContain('phone=');
  });

  it('throws on mobile when the number is ambiguous', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Tablet)',
      configurable: true,
    });

    expect(() =>
      buildWhatsAppShareUrl({ whatsapp: '62064745', phone: null }, 'Hola'),
    ).toThrow(
      'El WhatsApp del contacto debe incluir un numero argentino valido con codigo de area para abrir la app en Android.',
    );
  });

  it('opens web shares in a new browser tab', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    openWhatsAppShareUrl('https://api.whatsapp.com/send/?phone=5491130276632&text=Hola');

    expect(appendSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('builds the buyer search agent message with agent identity, title and url', () => {
    expect(
      buildBuyerSearchAgentMessage({
        agentName: 'Victoria',
        teamName: 'C21',
        candidateTitle: 'Incas 2380',
        candidateUrl: 'https://zonaprop.com.ar/aviso',
      }),
    ).toBe(
      [
        'Hola, soy Victoria de C21.',
        'Te escribo por,',
        '',
        'Propiedad: Incas 2380',
        'URL: https://zonaprop.com.ar/aviso',
        '',
        'Tengo un comprador interesado, quisiera consultar disponibilidad y posibles horarios para visitarla.',
      ].join('\n'),
    );
  });
});
