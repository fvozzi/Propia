import { describe, expect, it } from 'vitest';
import {
  getArgentinaDateKey,
  parseBnaHistoricalCsv,
  parseBnaExchangeRatePage,
} from './bna-exchange-rate.parser';

describe('BNA exchange rate parser', () => {
  it('reads the bill USD buy and sell rate from the BNA page', () => {
    const html = `
      <section>
        <h3>Cotizaci&oacute;n Billetes</h3>
        <span>05/09/2026</span><span>Compra</span><span>Venta</span>
        <div>Dolar U.S.A</div><div>1.485,00</div><div>1.535,00</div>
      </section>
      <section>
        <h3>Cotización Divisas</h3>
        <div>Dolar U.S.A</div><div>1503.0000</div><div>1512.0000</div>
      </section>
    `;

    expect(parseBnaExchangeRatePage(html)).toEqual({
      sourceDate: '2026-09-05',
      buyRate: 1485,
      sellRate: 1535,
    });
  });

  it('uses the calendar date in Argentina', () => {
    expect(getArgentinaDateKey(new Date('2026-09-06T01:30:00.000Z'))).toBe(
      '2026-09-05',
    );
  });

  it('reads the official BNA historical CSV format', () => {
    const csv = [
      'Moneda;Fecha cotizacion;Compra;Venta;',
      'Dolar U.S.A;1/9/2026; 1485,0000; 1535,0000;',
      'Dolar U.S.A;2/9/2026; 1480,0000; 1530,0000;',
    ].join('\r\n');

    expect(parseBnaHistoricalCsv(csv)).toEqual([
      { sourceDate: '2026-09-01', buyRate: 1485, sellRate: 1535 },
      { sourceDate: '2026-09-02', buyRate: 1480, sellRate: 1530 },
    ]);
  });
});
