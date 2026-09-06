import {
  CurrencyType,
  FinancialEntryType,
} from '../common/enums';

export type FinancialSummaryRow = {
  currency: CurrencyType;
  entryType: FinancialEntryType;
  total: string | number;
};

export type FinancialSummaryItem = {
  currency: CurrencyType;
  income: number;
  expenses: number;
  balance: number;
};

export function buildFinancialSummary(
  rows: FinancialSummaryRow[],
): FinancialSummaryItem[] {
  return [CurrencyType.ARS, CurrencyType.USD].map((currency) => {
    const income = readTotal(rows, currency, FinancialEntryType.INCOME);
    const expenses = readTotal(rows, currency, FinancialEntryType.EXPENSE);

    return {
      currency,
      income,
      expenses,
      balance: roundMoney(income - expenses),
    };
  });
}

function readTotal(
  rows: FinancialSummaryRow[],
  currency: CurrencyType,
  entryType: FinancialEntryType,
) {
  const value = rows.find(
    (row) => row.currency === currency && row.entryType === entryType,
  )?.total;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
