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
  it('combines both source currencies into income and expenses expressed in ARS', () => {
    expect(convertFinancialHistory(points, 'ARS', 1535)).toEqual([
      {
        date: '2026-09-06',
        income: 307000,
        expenses: 153500,
        exchangeRate: points[0].exchangeRate,
      },
    ]);
  });

  it('combines both source currencies into income and expenses expressed in USD', () => {
    expect(convertFinancialHistory(points, 'USD', 1535)).toEqual([
      {
        date: '2026-09-06',
        income: 200,
        expenses: 100,
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
      ).map((point) => point.income),
    ).toEqual([307000, 313500]);
  });
});
