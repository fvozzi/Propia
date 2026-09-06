import type {
  CurrencyType,
  DashboardFinancialHistoryPoint,
} from '../types';

export type FinancialChartSeriesKey =
  | 'incomeArs'
  | 'expensesArs'
  | 'incomeUsd'
  | 'expensesUsd';

export type ConvertedFinancialHistoryPoint = {
  date: string;
  incomeArs: number;
  expensesArs: number;
  incomeUsd: number;
  expensesUsd: number;
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
    return {
      date: point.date,
      incomeArs: convert(point.incomeArs, 'ARS', displayCurrency, usdSellRate),
      expensesArs: convert(point.expensesArs, 'ARS', displayCurrency, usdSellRate),
      incomeUsd: convert(point.incomeUsd, 'USD', displayCurrency, usdSellRate),
      expensesUsd: convert(point.expensesUsd, 'USD', displayCurrency, usdSellRate),
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
