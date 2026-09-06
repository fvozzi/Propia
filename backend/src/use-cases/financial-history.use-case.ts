import {
  CurrencyType,
  FinancialEntryType,
} from '../common/enums';

export type FinancialHistoryRow = {
  date: string;
  currency: CurrencyType;
  entryType: FinancialEntryType;
  total: string | number;
};

export type FinancialHistoryPoint = {
  date: string;
  incomeArs: number;
  expensesArs: number;
  incomeUsd: number;
  expensesUsd: number;
};

export function buildFinancialHistory(
  rows: FinancialHistoryRow[],
): FinancialHistoryPoint[] {
  const points = new Map<string, FinancialHistoryPoint>();

  for (const row of rows) {
    const point = points.get(row.date) ?? emptyPoint(row.date);
    const value = roundMoney(readNumber(row.total));

    if (
      row.currency === CurrencyType.ARS &&
      row.entryType === FinancialEntryType.INCOME
    ) {
      point.incomeArs = value;
    } else if (
      row.currency === CurrencyType.ARS &&
      row.entryType === FinancialEntryType.EXPENSE
    ) {
      point.expensesArs = value;
    } else if (
      row.currency === CurrencyType.USD &&
      row.entryType === FinancialEntryType.INCOME
    ) {
      point.incomeUsd = value;
    } else if (
      row.currency === CurrencyType.USD &&
      row.entryType === FinancialEntryType.EXPENSE
    ) {
      point.expensesUsd = value;
    }

    points.set(row.date, point);
  }

  return Array.from(points.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function emptyPoint(date: string): FinancialHistoryPoint {
  return {
    date,
    incomeArs: 0,
    expensesArs: 0,
    incomeUsd: 0,
    expensesUsd: 0,
  };
}

function readNumber(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
