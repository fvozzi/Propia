import { describe, expect, it } from 'vitest';
import {
  CurrencyType,
  FinancialEntryType,
} from '../common/enums';
import { buildFinancialSummary } from './financial-summary.use-case';

describe('financial summary use case', () => {
  it('separates income, expenses, and balance by currency', () => {
    expect(
      buildFinancialSummary([
        {
          currency: CurrencyType.ARS,
          entryType: FinancialEntryType.INCOME,
          total: '150000.50',
        },
        {
          currency: CurrencyType.ARS,
          entryType: FinancialEntryType.EXPENSE,
          total: '25000.25',
        },
        {
          currency: CurrencyType.USD,
          entryType: FinancialEntryType.INCOME,
          total: '556.87',
        },
        {
          currency: CurrencyType.USD,
          entryType: FinancialEntryType.EXPENSE,
          total: '100',
        },
      ]),
    ).toEqual([
      {
        currency: CurrencyType.ARS,
        income: 150000.5,
        expenses: 25000.25,
        balance: 125000.25,
      },
      {
        currency: CurrencyType.USD,
        income: 556.87,
        expenses: 100,
        balance: 456.87,
      },
    ]);
  });

  it('returns zero totals for currencies without movements', () => {
    expect(buildFinancialSummary([])).toEqual([
      { currency: CurrencyType.ARS, income: 0, expenses: 0, balance: 0 },
      { currency: CurrencyType.USD, income: 0, expenses: 0, balance: 0 },
    ]);
  });
});
