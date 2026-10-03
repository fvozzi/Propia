import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import type { Activity, CommercialOpportunity, FinanceConfig } from '../types';
import { FinancesPage } from './FinancesPage';

vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/i18n')>(),
  useI18n: () => ({
    t: (key: string) => key,
    translateEnum: (_group: string, value: string) => value,
  }),
}));

const financeConfig: FinanceConfig = {
  id: 1,
  teamId: 1,
  franchisePercent: 55,
  saleCommissionPercent: 3,
  purchaseCommissionPercent: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function page<T>(items: T[], pageNumber: number, totalPages: number) {
  return {
    items,
    meta: {
      page: pageNumber,
      limit: 100,
      total: totalPages * 100,
      totalPages,
    },
  };
}

describe('FinancesPage references', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const firstActivity = {
      id: 1,
      activityType: 'CALL',
      title: 'Llamada reciente',
      activityDate: '2026-10-03T12:00:00.000Z',
    } as Activity;
    const saleDeed = {
      id: 101,
      activityType: 'SALE_DEED',
      title: 'Escritura venta histórica',
      activityDate: '2025-05-01T12:00:00.000Z',
    } as Activity;
    const purchaseDeed = {
      id: 102,
      activityType: 'PURCHASE_DEED',
      title: 'Escritura compra historica',
      activityDate: '2025-04-01T12:00:00.000Z',
    } as Activity;
    const firstOpportunity = {
      id: 1,
      operationType: 'SALE',
      title: 'Oportunidad primera página',
    } as CommercialOpportunity;
    const secondOpportunity = {
      id: 101,
      operationType: 'BUY',
      title: 'Oportunidad segunda página',
    } as CommercialOpportunity;

    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/finance-config') return financeConfig;
      if (path === '/financial-entries') return [];
      if (path === '/activities?page=1&limit=100') {
        return page([firstActivity], 1, 2);
      }
      if (path === '/activities?page=2&limit=100') {
        return page([saleDeed, purchaseDeed], 2, 2);
      }
      if (path === '/commercial-opportunities?page=1&limit=100') {
        return page([firstOpportunity], 1, 2);
      }
      if (path === '/commercial-opportunities?page=2&limit=100') {
        return page([secondOpportunity], 2, 2);
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(FinancesPage)));
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('loads opportunities and deed activities from every page', async () => {
    const newEntryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'finances.newEntry',
    );
    expect(newEntryButton).toBeDefined();
    await act(async () => newEntryButton!.click());

    const field = (label: string) =>
      Array.from(container.querySelectorAll('label')).find((item) =>
        item.textContent?.startsWith(label),
      )?.querySelector('select') as HTMLSelectElement;
    const entryType = field('finances.entryType');
    await act(async () => {
      entryType.value = 'INCOME';
      entryType.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const opportunityOptions = Array.from(
      field('finances.opportunityOptional').options,
    ).map((option) => option.textContent);
    const deedOptions = Array.from(field('finances.deedActivity').options).map(
      (option) => option.textContent,
    );

    expect(opportunityOptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Oportunidad primera página'),
        expect.stringContaining('Oportunidad segunda página'),
      ]),
    );
    expect(deedOptions).toContain('SALE_DEED - Escritura venta histórica');
    expect(deedOptions).toContain('PURCHASE_DEED - Escritura compra historica');
    expect(apiRequest).toHaveBeenCalledWith('/activities?page=2&limit=100');
    expect(apiRequest).toHaveBeenCalledWith(
      '/commercial-opportunities?page=2&limit=100',
    );
  });
});
