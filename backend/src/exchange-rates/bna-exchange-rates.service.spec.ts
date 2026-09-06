import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { BnaExchangeRate } from './bna-exchange-rate.entity';
import { BnaExchangeRatesService } from './bna-exchange-rates.service';

const BNA_HTML = `
  <h3>Cotización Billetes</h3>
  <span>04/09/2026</span><span>Compra</span><span>Venta</span>
  <div>Dolar U.S.A</div><div>1485,00</div><div>1535,00</div>
`;

describe('BnaExchangeRatesService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and persists at most one effective rate for the Argentine date', async () => {
    const records = new Map<string, BnaExchangeRate>();
    const repository = buildRepository(records);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(BNA_HTML, { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new BnaExchangeRatesService(
      repository,
      buildConfigService(),
    );
    const now = new Date('2026-09-05T15:00:00.000Z');

    const first = await service.getTodayEffectiveRate(now);
    const second = await service.getTodayEffectiveRate(now);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({
      rateDate: '2026-09-05',
      sourceDate: '2026-09-04',
      buyRate: 1485,
      sellRate: 1535,
      carriedForward: true,
    });
    expect(second).toEqual(first);
  });

  it('carries forward the latest saved rate when BNA is unavailable', async () => {
    const records = new Map<string, BnaExchangeRate>();
    records.set(
      '2026-09-04',
      makeRate({ rateDate: '2026-09-04', sourceDate: '2026-09-04' }),
    );
    const repository = buildRepository(records);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const service = new BnaExchangeRatesService(
      repository,
      buildConfigService(),
    );

    await expect(
      service.getTodayEffectiveRate(new Date('2026-09-05T15:00:00.000Z')),
    ).resolves.toMatchObject({
      rateDate: '2026-09-05',
      sourceDate: '2026-09-04',
      sellRate: 1535,
      carriedForward: true,
    });
    expect(records.has('2026-09-05')).toBe(true);
  });

  it('uses each date historical rate and carries Friday forward to Saturday', async () => {
    const records = new Map<string, BnaExchangeRate>();
    const repository = buildRepository(records);
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          [
            'Moneda;Fecha cotizacion;Compra;Venta;',
            'Dolar U.S.A;4/9/2026; 1480,0000; 1530,0000;',
            'Dolar U.S.A;7/9/2026; 1500,0000; 1550,0000;',
          ].join('\r\n'),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const service = new BnaExchangeRatesService(
      repository,
      buildConfigService(),
    );

    const firstResult = await service.getEffectiveRatesForDates([
      '2026-09-05',
      '2026-09-07',
    ]);
    expect(firstResult).toMatchObject({
      '2026-09-05': {
        sourceDate: '2026-09-04',
        sellRate: 1530,
        carriedForward: true,
      },
      '2026-09-07': {
        sourceDate: '2026-09-07',
        sellRate: 1550,
        carriedForward: false,
      },
    });
    await expect(
      service.getEffectiveRatesForDates(['2026-09-05', '2026-09-07']),
    ).resolves.toMatchObject({
      '2026-09-05': {
        sourceDate: '2026-09-04',
        sellRate: 1530,
        carriedForward: true,
      },
      '2026-09-07': {
        sourceDate: '2026-09-07',
        sellRate: 1550,
        carriedForward: false,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function buildRepository(records: Map<string, BnaExchangeRate>) {
  return {
    async findOne(options: { where: { rateDate: unknown } }) {
      if (typeof options.where.rateDate === 'string') {
        return records.get(options.where.rateDate) ?? null;
      }
      return Array.from(records.values()).sort((left, right) =>
        right.rateDate.localeCompare(left.rateDate),
      )[0] ?? null;
    },
    async upsert(
      input: Partial<BnaExchangeRate> | Partial<BnaExchangeRate>[],
    ) {
      for (const item of Array.isArray(input) ? input : [input]) {
        records.set(
          item.rateDate!,
          makeRate(
            item as Pick<BnaExchangeRate, 'rateDate' | 'sourceDate'> &
              Partial<BnaExchangeRate>,
          ),
        );
      }
    },
    async find(options: { where: { rateDate: unknown } }) {
      const condition = options.where.rateDate as {
        _type?: string;
        _value?: string | string[];
      };
      const all = Array.from(records.values());
      if (condition._type === 'in' && Array.isArray(condition._value)) {
        const accepted = new Set(condition._value);
        return all.filter((rate) => accepted.has(rate.rateDate));
      }
      if (
        condition._type === 'lessThanOrEqual' &&
        typeof condition._value === 'string'
      ) {
        return all
          .filter((rate) => rate.rateDate <= condition._value!)
          .sort((left, right) => left.rateDate.localeCompare(right.rateDate));
      }
      return all;
    },
    async findOneOrFail(options: { where: { rateDate: string } }) {
      const result = records.get(options.where.rateDate);
      if (!result) throw new Error('not found');
      return result;
    },
  } as unknown as Repository<BnaExchangeRate>;
}

function makeRate(
  overrides: Pick<BnaExchangeRate, 'rateDate' | 'sourceDate'> &
    Partial<BnaExchangeRate>,
): BnaExchangeRate {
  return {
    id: overrides.id ?? 1,
    provider: overrides.provider ?? 'BNA',
    buyRate: overrides.buyRate ?? 1485,
    sellRate: overrides.sellRate ?? 1535,
    carriedForward: overrides.carriedForward ?? false,
    fetchedAt: overrides.fetchedAt ?? new Date(),
    ...overrides,
  };
}

function buildConfigService() {
  return {
    get: (_key: string, fallback: string) => fallback,
  } as ConfigService;
}
