import { describe, expect, it } from 'vitest';
import {
  buildBuyerPropertyWhatsAppMessage,
  countPendingBuyerPropertyShares,
  registerBuyerPropertyCandidate,
  shareBuyerPropertyCandidate,
} from './buyer-property-search.use-case';

describe('buyer property search use case', () => {
  it('registers a researched property link as pending whatsapp share', () => {
    const candidate = registerBuyerPropertyCandidate({
      contactId: 17,
      portal: ' Zonaprop ',
      url: ' https://www.zonaprop.com.ar/prop-123 ',
      title: ' 3 amb con cochera ',
      internalNotes: '  Parece buena relación precio/calidad ',
      createdAt: '2026-05-24T10:00:00.000Z',
    });

    expect(candidate).toEqual({
      contactId: 17,
      portal: 'Zonaprop',
      url: 'https://www.zonaprop.com.ar/prop-123',
      title: '3 amb con cochera',
      internalNotes: 'Parece buena relación precio/calidad',
      shareComments: null,
      shareStatus: 'PENDING_WHATSAPP',
      createdAt: '2026-05-24T10:00:00.000Z',
      sharedAt: null,
    });
  });

  it('marks the candidate as shared and stores whatsapp comments', () => {
    const pending = registerBuyerPropertyCandidate({
      contactId: 17,
      portal: 'Argenprop',
      url: 'https://www.argenprop.com/prop-1',
      title: 'PH luminoso',
      createdAt: '2026-05-24T10:00:00.000Z',
    });

    const shared = shareBuyerPropertyCandidate(pending, {
      comments: '  Te comparto esta opción porque cumple con cochera y apto crédito. ',
      sharedAt: '2026-05-24T11:15:00.000Z',
    });

    expect(shared.shareStatus).toBe('SHARED_WHATSAPP');
    expect(shared.sharedAt).toBe('2026-05-24T11:15:00.000Z');
    expect(shared.shareComments).toBe('Te comparto esta opción porque cumple con cochera y apto crédito.');
  });

  it('builds the whatsapp message with comments and the source link', () => {
    const message = buildBuyerPropertyWhatsAppMessage({
      contactId: 17,
      portal: 'Mercado Libre',
      url: 'https://www.mercadolibre.com/prop-1',
      title: 'Departamento 2 ambientes',
      internalNotes: null,
      shareComments: 'Tiene buena luz y bajas expensas.',
      shareStatus: 'SHARED_WHATSAPP',
      createdAt: '2026-05-24T10:00:00.000Z',
      sharedAt: '2026-05-24T11:15:00.000Z',
    });

    expect(message).toBe('Tiene buena luz y bajas expensas.\n\nhttps://www.mercadolibre.com/prop-1');
  });

  it('counts only links that are still pending whatsapp sharing', () => {
    const pending = registerBuyerPropertyCandidate({
      contactId: 17,
      portal: 'Zonaprop',
      url: 'https://www.zonaprop.com.ar/prop-1',
      title: 'Unidad A',
      createdAt: '2026-05-24T10:00:00.000Z',
    });
    const shared = shareBuyerPropertyCandidate(
      registerBuyerPropertyCandidate({
        contactId: 17,
        portal: 'Argenprop',
        url: 'https://www.argenprop.com/prop-2',
        title: 'Unidad B',
        createdAt: '2026-05-24T10:00:00.000Z',
      }),
      { comments: 'Compartida', sharedAt: '2026-05-24T12:00:00.000Z' },
    );

    expect(countPendingBuyerPropertyShares([pending, shared])).toBe(1);
  });
});
