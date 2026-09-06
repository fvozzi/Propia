import { describe, expect, it } from 'vitest';
import { convertFinancialHistory } from './financial-history';

const points = [
  {
    date: '2026-09-06',
    incomeArs: 153500,
    expensesArs: 76750,
    incomeUsd: 100,
    expensesUsd: 50,
    exchangeRate: {
      provider: 'BNA' as const,
      rateDate: '2026-09-06',
      sourceDate: '2026-09-05',
      buyRate: 1485,
      sellRate: 1535,
      carriedForward: true,
    },
  },
];

describe('financial history conversion', () => {
  it('converts all four series to ARS using the BNA sell rate', () => {
    expect(convertFinancialHistory(points, 'ARS', 1535)).toEqual([
      {
        date: '2026-09-06',
        incomeArs: 153500,
        expensesArs: 76750,
        incomeUsd: 153500,
        expensesUsd: 76750,
        exchangeRate: points[0].exchangeRate,
      },
    ]);
  });

  it('converts all four series to USD using the reciprocal sell rate', () => {
    expect(convertFinancialHistory(points, 'USD', 1535)).toEqual([
      {
        date: '2026-09-06',
        incomeArs: 100,
        expensesArs: 50,
        incomeUsd: 100,
        expensesUsd: 50,
        exchangeRate: points[0].exchangeRate,
      },
    ]);
  });

  it('uses the exchange rate that belongs to each history date', () => {
    expect(
      convertFinancialHistory(
        [
          points[0],
          {
            ...points[0],
            date: '2026-09-07',
            exchangeRate: { ...points[0].exchangeRate!, sellRate: 1600 },
          },
        ],
        'ARS',
        2000,
      ).map((point) => point.incomeUsd),
    ).toEqual([153500, 160000]);
  });
});
