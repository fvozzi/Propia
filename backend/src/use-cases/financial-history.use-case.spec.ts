import { describe, expect, it } from 'vitest';
import {
  CurrencyType,
  FinancialEntryType,
} from '../common/enums';
import { buildFinancialHistory } from './financial-history.use-case';

describe('financial history use case', () => {
  it('groups movements into four daily series and sorts the dates', () => {
    expect(
      buildFinancialHistory([
        {
          date: '2026-09-06',
          currency: CurrencyType.USD,
          entryType: FinancialEntryType.INCOME,
          total: '250.50',
        },
        {
          date: '2026-09-05',
          currency: CurrencyType.ARS,
          entryType: FinancialEntryType.EXPENSE,
          total: '12000',
        },
        {
          date: '2026-09-06',
          currency: CurrencyType.ARS,
          entryType: FinancialEntryType.INCOME,
          total: '300000',
        },
      ]),
    ).toEqual([
      {
        date: '2026-09-05',
        incomeArs: 0,
        expensesArs: 12000,
        incomeUsd: 0,
        expensesUsd: 0,
      },
      {
        date: '2026-09-06',
        incomeArs: 300000,
        expensesArs: 0,
        incomeUsd: 250.5,
        expensesUsd: 0,
      },
    ]);
  });

  it('fills empty dates through today when the last movement was in the prior month', () => {
    expect(
      buildFinancialHistory(
        [
          {
            date: '2026-08-31',
            currency: CurrencyType.ARS,
            entryType: FinancialEntryType.INCOME,
            total: '1000',
          },
        ],
        '2026-09-03',
      ),
    ).toEqual([
      {
        date: '2026-08-31',
        incomeArs: 1000,
        expensesArs: 0,
        incomeUsd: 0,
        expensesUsd: 0,
      },
      {
        date: '2026-09-01',
        incomeArs: 0,
        expensesArs: 0,
        incomeUsd: 0,
        expensesUsd: 0,
      },
      {
        date: '2026-09-02',
        incomeArs: 0,
        expensesArs: 0,
        incomeUsd: 0,
        expensesUsd: 0,
      },
      {
        date: '2026-09-03',
        incomeArs: 0,
        expensesArs: 0,
        incomeUsd: 0,
        expensesUsd: 0,
      },
    ]);
  });
});
