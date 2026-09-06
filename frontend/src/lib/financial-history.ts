import type {
  CurrencyType,
  DashboardFinancialHistoryPoint,
} from '../types';

export type FinancialChartSeriesKey = 'income' | 'expenses';

export type ConvertedFinancialHistoryPoint = {
  date: string;
  income: number;
  expenses: number;
  exchangeRate: DashboardFinancialHistoryPoint['exchangeRate'];
};

export function convertFinancialHistory(
  points: DashboardFinancialHistoryPoint[],
  displayCurrency: CurrencyType,
  fallbackUsdSellRate: number,
): ConvertedFinancialHistoryPoint[] {
  if (!Number.isFinite(fallbackUsdSellRate) || fallbackUsdSellRate <= 0) {
    return [];
  }

  return points.map((point) => {
    const usdSellRate = point.exchangeRate?.sellRate ?? fallbackUsdSellRate;
    const income =
      convert(point.incomeArs, 'ARS', displayCurrency, usdSellRate) +
      convert(point.incomeUsd, 'USD', displayCurrency, usdSellRate);
    const expenses =
      convert(point.expensesArs, 'ARS', displayCurrency, usdSellRate) +
      convert(point.expensesUsd, 'USD', displayCurrency, usdSellRate);
    return {
      date: point.date,
      income: roundMoney(income),
      expenses: roundMoney(expenses),
      exchangeRate: point.exchangeRate,
    };
  });
}

function convert(
  value: number,
  sourceCurrency: CurrencyType,
  displayCurrency: CurrencyType,
  usdSellRate: number,
) {
  if (sourceCurrency === displayCurrency) {
    return value;
  }
  return sourceCurrency === 'USD' ? value * usdSellRate : value / usdSellRate;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
