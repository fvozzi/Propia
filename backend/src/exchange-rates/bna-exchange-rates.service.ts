import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { BnaExchangeRate } from './bna-exchange-rate.entity';
import {
  getArgentinaDateKey,
  parseBnaExchangeRatePage,
  parseBnaHistoricalCsv,
} from './bna-exchange-rate.parser';

const DEFAULT_BNA_SOURCE_URL = 'https://www.bna.com.ar/Personas';
const DEFAULT_BNA_HISTORY_URL =
  'https://www.bna.com.ar/Cotizador/DescargarPorFecha';

export type EffectiveBnaExchangeRate = {
  provider: 'BNA';
  rateDate: string;
  sourceDate: string;
  buyRate: number;
  sellRate: number;
  carriedForward: boolean;
};

@Injectable()
export class BnaExchangeRatesService {
  private readonly logger = new Logger(BnaExchangeRatesService.name);

  constructor(
    @InjectRepository(BnaExchangeRate)
    private readonly exchangeRatesRepository: Repository<BnaExchangeRate>,
    private readonly configService: ConfigService,
  ) {}

  async getTodayEffectiveRate(
    now = new Date(),
  ): Promise<EffectiveBnaExchangeRate | null> {
    const rateDate = getArgentinaDateKey(now);
    const existing = await this.exchangeRatesRepository.findOne({
      where: { rateDate },
    });
    if (existing) {
      return toEffectiveRate(existing);
    }

    const previous = await this.exchangeRatesRepository.findOne({
      where: { rateDate: LessThan(rateDate) },
      order: { rateDate: 'DESC' },
    });

    try {
      const quote = await this.fetchCurrentRate();
      return this.persistDailyRate({
        rateDate,
        ...quote,
        carriedForward: quote.sourceDate !== rateDate,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo actualizar la cotizacion BNA para ${rateDate}: ${readErrorMessage(error)}`,
      );

      if (!previous) {
        return null;
      }

      return this.persistDailyRate({
        rateDate,
        sourceDate: previous.sourceDate,
        buyRate: previous.buyRate,
        sellRate: previous.sellRate,
        carriedForward: true,
      });
    }
  }

  async getEffectiveRatesForDates(
    dateKeys: string[],
  ): Promise<Record<string, EffectiveBnaExchangeRate>> {
    const requestedDates = Array.from(new Set(dateKeys)).sort();
    if (requestedDates.length === 0) {
      return {};
    }

    const existing = await this.exchangeRatesRepository.find({
      where: { rateDate: In(requestedDates) },
    });
    const existingDates = new Set(existing.map((rate) => rate.rateDate));
    const missingDates = requestedDates.filter((date) => !existingDates.has(date));

    if (missingDates.length > 0) {
      await this.backfillHistoricalRates(missingDates);
    }

    const resolved = await this.exchangeRatesRepository.find({
      where: { rateDate: In(requestedDates) },
    });
    return Object.fromEntries(
      resolved.map((rate) => [rate.rateDate, toEffectiveRate(rate)]),
    );
  }

  private async fetchCurrentRate() {
    const url = this.configService.get<string>(
      'BNA_EXCHANGE_RATE_URL',
      DEFAULT_BNA_SOURCE_URL,
    );
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'InFlow/1.0',
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`BNA respondio HTTP ${response.status}.`);
    }

    return parseBnaExchangeRatePage(await response.text());
  }

  private async backfillHistoricalRates(dateKeys: string[]) {
    const firstDate = addDays(dateKeys[0], -7);
    const lastDate = dateKeys[dateKeys.length - 1];
    let fetchedRates: Awaited<ReturnType<typeof this.fetchHistoricalRates>> = [];

    try {
      fetchedRates = await this.fetchHistoricalRates(firstDate, lastDate);
    } catch (error) {
      this.logger.warn(
        `No se pudo consultar el historico BNA entre ${firstDate} y ${lastDate}: ${readErrorMessage(error)}`,
      );
    }

    const persistedPriorRates = await this.exchangeRatesRepository.find({
      where: { rateDate: LessThanOrEqual(lastDate) },
      order: { rateDate: 'ASC' },
    });
    const candidates = [
      ...persistedPriorRates.map((rate) => ({
        sourceDate: rate.sourceDate,
        buyRate: Number(rate.buyRate),
        sellRate: Number(rate.sellRate),
      })),
      ...fetchedRates,
    ].sort((left, right) => left.sourceDate.localeCompare(right.sourceDate));

    const snapshots = dateKeys.flatMap((rateDate) => {
      const effective = candidates
        .filter((candidate) => candidate.sourceDate <= rateDate)
        .at(-1);
      if (!effective) {
        return [];
      }

      return [{
        rateDate,
        sourceDate: effective.sourceDate,
        buyRate: effective.buyRate,
        sellRate: effective.sellRate,
        carriedForward: effective.sourceDate !== rateDate,
        provider: 'BNA',
      }];
    });

    if (snapshots.length > 0) {
      await this.exchangeRatesRepository.upsert(snapshots, ['rateDate']);
    }
  }

  private async fetchHistoricalRates(fromDate: string, toDate: string) {
    const baseUrl = this.configService.get<string>(
      'BNA_EXCHANGE_RATE_HISTORY_URL',
      DEFAULT_BNA_HISTORY_URL,
    );
    const url = new URL(baseUrl);
    url.searchParams.set('id', 'billetes');
    url.searchParams.set('idMonedaDescarga', '22');
    url.searchParams.set('fechaDesde', toBnaDate(fromDate));
    url.searchParams.set('fechaHasta', toBnaDate(toDate));
    const response = await fetch(url, {
      headers: {
        Accept: 'text/csv',
        'User-Agent': 'InFlow/1.0',
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      throw new Error(`BNA historico respondio HTTP ${response.status}.`);
    }

    return parseBnaHistoricalCsv(await response.text());
  }

  private async persistDailyRate(input: {
    rateDate: string;
    sourceDate: string;
    buyRate: number;
    sellRate: number;
    carriedForward: boolean;
  }) {
    await this.exchangeRatesRepository.upsert(
      {
        ...input,
        provider: 'BNA',
      },
      ['rateDate'],
    );
    const saved = await this.exchangeRatesRepository.findOneOrFail({
      where: { rateDate: input.rateDate },
    });
    return toEffectiveRate(saved);
  }
}

function toEffectiveRate(rate: BnaExchangeRate): EffectiveBnaExchangeRate {
  return {
    provider: 'BNA',
    rateDate: rate.rateDate,
    sourceDate: rate.sourceDate,
    buyRate: Number(rate.buyRate),
    sellRate: Number(rate.sellRate),
    carriedForward: rate.carriedForward,
  };
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'error desconocido';
}

function toBnaDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
