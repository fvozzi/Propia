export type ParsedBnaExchangeRate = {
  sourceDate: string;
  buyRate: number;
  sellRate: number;
};

export function parseBnaHistoricalCsv(csv: string): ParsedBnaExchangeRate[] {
  const rates: ParsedBnaExchangeRate[] = [];

  for (const line of csv.split(/\r?\n/).slice(1)) {
    const [currency, rawDate, rawBuyRate, rawSellRate] = line
      .split(';')
      .map((value) => value.trim());
    if (!currency || !/D[oó]lar\s+U\.?S\.?A/i.test(currency)) {
      continue;
    }
    if (!rawDate || !rawBuyRate || !rawSellRate) {
      continue;
    }

    const dateMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!dateMatch) {
      continue;
    }

    const [, day, month, year] = dateMatch;
    const buyRate = parseLocalizedNumber(rawBuyRate);
    const sellRate = parseLocalizedNumber(rawSellRate);
    if (buyRate <= 0 || sellRate <= 0) {
      continue;
    }

    rates.push({
      sourceDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      buyRate,
      sellRate,
    });
  }

  return rates.sort((left, right) =>
    left.sourceDate.localeCompare(right.sourceDate),
  );
}

export function parseBnaExchangeRatePage(
  html: string,
): ParsedBnaExchangeRate {
  const text = htmlToText(html);
  const sectionStart = text.search(/Cotizaci[oó]n Billetes/i);
  const billetesSection = sectionStart >= 0 ? text.slice(sectionStart) : text;
  const sourceDateMatch = billetesSection.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
  );
  const usdMatch = billetesSection.match(
    /D[oó]lar\s+U\.?\s*S\.?\s*A\.?\s+([\d.,]+)\s+([\d.,]+)/i,
  );

  if (!sourceDateMatch || !usdMatch) {
    throw new Error('No se pudo leer la cotizacion de Dolar U.S.A. del BNA.');
  }

  const buyRate = parseLocalizedNumber(usdMatch[1]);
  const sellRate = parseLocalizedNumber(usdMatch[2]);

  if (buyRate <= 0 || sellRate <= 0) {
    throw new Error('La cotizacion del BNA contiene importes invalidos.');
  }

  const [, day, month, year] = sourceDateMatch;
  return {
    sourceDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    buyRate,
    sellRate,
  };
}

export function getArgentinaDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`;
}

function htmlToText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&oacute;|&#243;/gi, 'ó')
    .replace(/&Oacute;|&#211;/gi, 'Ó')
    .replace(/&aacute;|&#225;/gi, 'á')
    .replace(/&Aacute;|&#193;/gi, 'Á')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLocalizedNumber(rawValue: string) {
  const normalized = rawValue.includes(',')
    ? rawValue.replace(/\./g, '').replace(',', '.')
    : rawValue;
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error('La cotizacion del BNA contiene un numero invalido.');
  }
  return value;
}
