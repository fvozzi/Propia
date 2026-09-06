import { useMemo, useState } from 'react';
import { convertFinancialHistory, type FinancialChartSeriesKey } from '../lib/financial-history';
import { useI18n } from '../lib/i18n';
import type { CurrencyType, DashboardFinancialHistory } from '../types';

const WIDTH = 960;
const HEIGHT = 340;
const MARGIN = { top: 18, right: 18, bottom: 56, left: 74 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const BNA_SOURCE_URL = 'https://www.bna.com.ar/Personas';

const SERIES: Array<{
  key: FinancialChartSeriesKey;
  labelKey: string;
  color: string;
  dashed: boolean;
}> = [
  { key: 'incomeArs', labelKey: 'dashboard.chartIncomeArs', color: '#176b5b', dashed: false },
  { key: 'expensesArs', labelKey: 'dashboard.chartExpensesArs', color: '#d97706', dashed: true },
  { key: 'incomeUsd', labelKey: 'dashboard.chartIncomeUsd', color: '#2563eb', dashed: false },
  { key: 'expensesUsd', labelKey: 'dashboard.chartExpensesUsd', color: '#a23c6f', dashed: true },
];

export function FinancialHistoryChart({
  history,
}: {
  history: DashboardFinancialHistory;
}) {
  const { locale, t } = useI18n();
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyType>('ARS');
  const rate = history.exchangeRate;
  const fallbackRate = rate ?? findLatestPointRate(history);
  const points = useMemo(
    () =>
      fallbackRate
        ? convertFinancialHistory(
            history.points,
            displayCurrency,
            fallbackRate.sellRate,
          )
        : [],
    [displayCurrency, fallbackRate, history.points],
  );

  const maximum = Math.max(
    1,
    ...points.flatMap((point) => SERIES.map((series) => point[series.key])),
  );
  const timestamps = points.map((point) => dateKeyToTimestamp(point.date));
  const firstTimestamp = timestamps[0] ?? 0;
  const lastTimestamp = timestamps[timestamps.length - 1] ?? firstTimestamp;
  const xFor = (index: number) => {
    if (timestamps.length <= 1 || firstTimestamp === lastTimestamp) {
      return MARGIN.left + PLOT_WIDTH / 2;
    }
    return (
      MARGIN.left +
      ((timestamps[index] - firstTimestamp) / (lastTimestamp - firstTimestamp)) *
        PLOT_WIDTH
    );
  };
  const yFor = (value: number) =>
    MARGIN.top + PLOT_HEIGHT - (value / maximum) * PLOT_HEIGHT;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xLabelIndexes = getLabelIndexes(points.length, 6);

  return (
    <div className="dashboard-financial-history">
      <div className="dashboard-chart-header">
        <div>
          <h4>{t('dashboard.financialHistoryTitle')}</h4>
          <p className="muted">{t('dashboard.financialHistorySubtitle')}</p>
        </div>
        <div className="dashboard-currency-selector" aria-label={t('dashboard.chartDisplayCurrency')}>
          <span>{t('dashboard.chartDisplayCurrency')}</span>
          <div>
            {(['ARS', 'USD'] as CurrencyType[]).map((currency) => (
              <button
                key={currency}
                type="button"
                className={displayCurrency === currency ? 'active' : ''}
                aria-pressed={displayCurrency === currency}
                onClick={() => setDisplayCurrency(currency)}
              >
                {currency}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fallbackRate ? (
        <p className="dashboard-exchange-rate">
          {rate
            ? t('dashboard.chartCurrentRateReference')
            : t('dashboard.chartLastSavedReference')}{' '}
          · {t('dashboard.chartBnaSellRate')}: {' '}
          {formatMoney(fallbackRate.sellRate, 'ARS', locale)} / USD
          {' · '}
          {fallbackRate.carriedForward
            ? t('dashboard.chartLastEffectiveRate')
            : t('dashboard.chartRateDate')}{' '}
          {formatDate(fallbackRate.sourceDate, locale)}
          {' · '}
          <a href={BNA_SOURCE_URL} target="_blank" rel="noreferrer">BNA</a>
        </p>
      ) : (
        <p className="notice warning">{t('dashboard.chartRateUnavailable')}</p>
      )}

      {!fallbackRate || points.length === 0 ? (
        fallbackRate ? (
          <p className="muted">{t('dashboard.financialHistoryEmpty')}</p>
        ) : null
      ) : (
        <>
          <div className="dashboard-chart-legend">
            {SERIES.map((series) => (
              <span key={series.key}>
                <i style={{ backgroundColor: series.color }} />
                {t(series.labelKey)}
              </span>
            ))}
          </div>
          <div className="dashboard-chart-scroll">
            <svg
              className="dashboard-financial-chart"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`${t('dashboard.financialHistoryTitle')} (${displayCurrency})`}
            >
              {yTicks.map((ratio) => {
                const value = maximum * ratio;
                const y = yFor(value);
                return (
                  <g key={ratio}>
                    <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} className="dashboard-chart-gridline" />
                    <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" className="dashboard-chart-axis-label">
                      {formatCompactMoney(value, displayCurrency, locale)}
                    </text>
                  </g>
                );
              })}
              <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className="dashboard-chart-axis" />
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} className="dashboard-chart-axis" />

              {xLabelIndexes.map((index) => (
                <text
                  key={points[index].date}
                  x={xFor(index)}
                  y={HEIGHT - MARGIN.bottom + 28}
                  textAnchor="middle"
                  className="dashboard-chart-axis-label"
                >
                  {formatShortDate(points[index].date, locale)}
                </text>
              ))}

              {SERIES.map((series) => {
                const path = points
                  .map((point, index) => `${xFor(index)},${yFor(point[series.key])}`)
                  .join(' ');
                return (
                  <g key={series.key}>
                    <polyline
                      points={path}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={series.dashed ? '8 6' : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
                    {points.length <= 40
                      ? points.map((point, index) => (
                          <circle
                            key={`${series.key}-${point.date}`}
                            cx={xFor(index)}
                            cy={yFor(point[series.key])}
                            r="3.5"
                            fill={series.color}
                          >
                            <title>
                              {t(series.labelKey)} · {formatDate(point.date, locale)} ·{' '}
                              {formatMoney(point[series.key], displayCurrency, locale)}
                              {point.exchangeRate
                                ? ` · ${t('dashboard.chartPointRate')} ${formatDate(point.exchangeRate.sourceDate, locale)}`
                                : ''}
                            </title>
                          </circle>
                        ))
                      : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

function findLatestPointRate(history: DashboardFinancialHistory) {
  for (let index = history.points.length - 1; index >= 0; index -= 1) {
    const rate = history.points[index].exchangeRate;
    if (rate) return rate;
  }
  return null;
}

function getLabelIndexes(length: number, maximumLabels: number) {
  if (length <= 0) return [];
  if (length <= maximumLabels) return Array.from({ length }, (_, index) => index);

  const indexes = new Set<number>();
  for (let index = 0; index < maximumLabels; index += 1) {
    indexes.add(Math.round((index * (length - 1)) / (maximumLabels - 1)));
  }
  return Array.from(indexes);
}

function dateKeyToTimestamp(dateKey: string) {
  return Date.parse(`${dateKey}T00:00:00.000Z`);
}

function formatDate(dateKey: string, locale: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(year, month - 1, day),
  );
}

function formatShortDate(dateKey: string, locale: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
    new Date(year, month - 1, day),
  );
}

function formatMoney(value: number, currency: CurrencyType, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactMoney(value: number, currency: CurrencyType, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
