import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import type { Visit } from '../types';
import { ActivitiesCreatePage } from './ActivitiesCreatePage';

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiRequest: vi.fn(),
}));
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ user: { name: 'Agente Prueba', activeTeamWhatsappTreasuryPhone: null } }),
}));
vi.mock('../lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/i18n')>(),
  useI18n: () => ({
    t: (key: string) => key,
    translateEnum: (_group: string, value: string) => value,
  }),
}));

const emptyPage = { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } };

describe('colleague visit editor', () => {
  let container: HTMLDivElement;
  let root: Root;
  let visit: Visit;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    visit = {
      id: 91,
      publicToken: 'public-91',
      contactId: 11,
      propertyId: null,
      colleagueContactId: 12,
      searchRequirementId: null,
      buyerPropertyCandidateId: null,
      scheduledAt: '2026-09-28T22:49:00.000Z',
      status: 'SCHEDULED',
      notes: 'Prueba.',
      externalUrl: 'https://example.com/propiedad',
      externalPropertyTitle: 'Propiedad colega',
      externalPropertyAddress: 'Constituyentes 3493',
      colleagueName: 'Facundo Vozzi',
      colleagueWhatsapp: '+5491112345678',
      contact: {
        id: 11,
        displayName: 'Cliente Prueba',
        whatsapp: '+5491198765432',
        phone: null,
      },
      colleagueContact: { id: 12, displayName: 'Facundo Vozzi' },
    } as Visit;
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/visits/91/share-links') {
        return {
          propertyUrl: 'https://is.gd/property',
          calendarUrl: 'https://is.gd/calendar',
        };
      }
      if (path === '/visits/91' && options?.method === 'PATCH') {
        visit = { ...visit, ...JSON.parse(options.body as string) };
        return visit;
      }
      if (path === '/visits/91') return visit;
      return emptyPage;
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/activities/visits/91/edit'] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/activities/visits/:visitId/edit',
              element: createElement(ActivitiesCreatePage),
            }),
            createElement(Route, {
              path: '/activities',
              element: createElement('div'),
            }),
          ),
        ),
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('loads every visit field and updates the existing visit instead of creating another', async () => {
    expect((container.querySelector('select') as HTMLSelectElement).value).toBe('EXTERNAL_VISIT');
    expect(container.querySelector('input[value="Constituyentes 3493"]')).toBeTruthy();
    expect(container.querySelector('input[value="Facundo Vozzi"]')).toBeTruthy();
    expect(container.querySelector('textarea')?.value).toBe('Prueba.');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/visits/91',
      expect.objectContaining({ method: 'PATCH' }),
    );
    const updateCall = vi.mocked(apiRequest).mock.calls.find(
      ([path, options]) => path === '/visits/91' && options?.method === 'PATCH',
    );
    expect(JSON.parse(updateCall![1]!.body as string)).toMatchObject({
      colleagueContactId: 12,
      colleagueName: 'Facundo Vozzi',
      externalPropertyAddress: 'Constituyentes 3493',
      status: 'SCHEDULED',
    });
  });

  it('copies the formatted message with absolute public links from the editor', async () => {
    const copyButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Guardar y copiar mensaje',
    );
    expect(copyButton).toBeDefined();
    expect(copyButton!.disabled).toBe(false);

    await act(async () => copyButton!.click());

    expect(apiRequest).toHaveBeenCalledWith(
      '/visits/91',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://is.gd/property'),
    );
    expect(vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]).toContain(
      'https://is.gd/calendar',
    );
    expect(vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]).not.toContain(
      '/api/public/visits/',
    );
  });
});
