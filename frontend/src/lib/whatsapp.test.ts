import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBirthdayWhatsappMessage,
  buildBuyerSearchAgentMessage,
  buildExpenseBreakdownWhatsappMessage,
  buildPropertySearchMessage,
  buildReservationTreasuryWhatsappMessage,
  buildVisitWhatsappMessage,
  buildWhatsAppPickerUrl,
  buildWhatsAppShareUrl,
  calculateExpenseBreakdown,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from './whatsapp';
import type { ExpenseBreakdownChecklistData } from '../types';

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
      'Feliz cumpleanos Victoria! Espero que tengas un gran dia.',
    );
  });

  it('builds the visit confirmation message with schedule, address and link', () => {
    const message = buildVisitWhatsappMessage({
        scheduledAt: '2026-05-11T14:30:00.000Z',
        status: 'SCHEDULED',
        notes: null,
        colleagueName: 'Laura Colega',
        colleagueWhatsapp: '5491112345678',
        externalUrl: 'https://www.zonaprop.com.ar/propiedades/clasificado/ejemplo.html',
        property: {
          title: 'Av Dorrego 1653',
          address: 'Av Dorrego 1653 timbre 5',
          neighborhood: 'Palermo Hollywood',
          city: 'CABA',
        },
      });

    expect(message).toContain('VISITA CONFIRMADA');
    expect(message).toContain('Fecha: lunes 11/05/2026');
    expect(message).toContain('Hora: 11:30 hs');
    expect(message).toContain('Colega: Laura Colega');
    expect(message).toContain(
      'Propiedad: Av Dorrego 1653 timbre 5, Palermo Hollywood',
    );
    expect(message).toContain(
      'URL: https://www.zonaprop.com.ar/propiedades/clasificado/ejemplo.html',
    );
    expect(message).toContain(
      'Agendar en mi calendario: https://calendar.google.com/calendar/render?',
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
        '* Monto operacion: U$S 92.000',
        '* Direccion: Av. La Plata 249 11 B',
        '* Barrio: Caballito',
        '* Operacion: Compra',
        '* Puntas: 1',
        '* Porcentaje: 2%',
        '* Cuanto dejaron de reserva: U$S 1.400',
        '* Compartida con Inmobiliaria: Si',
        '* Conformada: No',
        '* Credito: No',
        '* Tipo propiedad: Departamento',
        '* Reubicacion: No',
        '* Mes estimado de Cierre: Agosto',
        '* Documento reserva: https://drive.google.com/file/d/reserva-caballito/view',
        '* Observaciones: 75% Lila, 25% Victoria',
      ].join('\n'),
    );
  });

  it('calculates a reduced VAT expense breakdown', () => {
    expect(
      calculateExpenseBreakdown({
        operationType: 'SALE',
        operationAmount: 150000,
        operationCurrency: 'USD',
        propertyAddress: 'Nicolas Avellaneda 613 3A',
        commissionPercent: 3,
        vatPercent: 21,
        invoicedVatAmount: 100,
        amountAlreadyPaid: null,
        notaryExpenses: null,
        observations: null,
      }),
    ).toEqual({
      commissionAmount: 4500,
      standardVatAmount: 945,
      vatAmount: 100,
      total: 4600,
      amountAlreadyPaid: 0,
      balance: 4600,
    });
  });

  it('builds the purchase expense checklist message with the paid balance', () => {
    expect(
      buildExpenseBreakdownWhatsappMessage({
        description: null,
        contact: { firstName: 'Victoria', displayName: 'Victoria Arque' },
        property: { address: 'Nicolas Avellaneda 613 3A' },
        expenseBreakdownData: {
          operationType: 'BUY',
          operationAmount: 150000,
          operationCurrency: 'USD',
          propertyAddress: 'Nicolas Avellaneda 613 3A',
          commissionPercent: 4,
          vatPercent: 21,
          invoicedVatAmount: 150,
          amountAlreadyPaid: 7450,
          notaryExpenses: null,
          observations: null,
        },
      }),
    ).toContain('*Compra - Nicolas Avellaneda 613 3A*');
    expect(
      buildExpenseBreakdownWhatsappMessage({
        description: null,
        contact: { firstName: 'Victoria', displayName: 'Victoria Arque' },
        property: { address: 'Nicolas Avellaneda 613 3A' },
        expenseBreakdownData: {
          operationType: 'BUY',
          operationAmount: 150000,
          operationCurrency: 'USD',
          propertyAddress: 'Nicolas Avellaneda 613 3A',
          commissionPercent: 4,
          vatPercent: 21,
          invoicedVatAmount: 150,
          amountAlreadyPaid: 7450,
          notaryExpenses: null,
          observations: null,
        },
      }),
    ).toContain('Saldo a favor para compensar en la escritura: U$S 1.300');
  });

  it('keeps reservation, reinforcement, total delivered and money location separate', () => {
    const message = buildExpenseBreakdownWhatsappMessage({
      description: null,
      contact: { firstName: 'Victoria', displayName: 'Victoria Arque' },
      property: { address: 'Nicolas Avellaneda 613 3A' },
      expenseBreakdownData: {
        operationType: 'BUY',
        operationAmount: 129000,
        operationCurrency: 'USD',
        propertyAddress: 'Nicolas Avellaneda 613 3A',
        commissionPercent: 4,
        vatPercent: 21,
        invoicedVatAmount: null,
        amountAlreadyPaid: null,
        notaryExpenses: null,
        observations: null,
        checklist: {
          counterpartyRealEstateAgency: 'Remax Urbana',
          reservationDate: '2025-04-25',
          reservationAmount: 1000,
          reservationHeldBy: 'Remax Urbana',
          reinforcementDate: '2025-05-10',
          reinforcementAmount: 6450,
          totalDeliveredAmount: 7450,
          allMoneyHeldBy: 'Remax Urbana',
        } as ExpenseBreakdownChecklistData,
      },
    });

    expect(message).toContain('Inmobiliaria contraparte: Remax Urbana');
    expect(message).toContain('Reserva (25/04/2025): U$S 1.000');
    expect(message).toContain('Refuerzo (10/05/2025): U$S 6.450');
    expect(message).toContain('Total de dinero entregado: U$S 7.450');
    expect(message).toContain('Todo el dinero está en: Remax Urbana');
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
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    openWhatsAppShareUrl(
      'https://api.whatsapp.com/send/?phone=5491130276632&text=Hola',
    );

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
