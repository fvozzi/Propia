import { describe, expect, it } from 'vitest';
import { PropertyType } from '../common/enums';
import {
  areExternalListingsLikelyDuplicates,
  normalizeText,
  scoreExternalListingForRequirement,
} from './external-listing-matching.use-case';

describe('external listing matching', () => {
  it('scores a strong match for a requirement', () => {
    const result = scoreExternalListingForRequirement(
      {
        neighborhoods: ['Caballito'],
        minPrice: 90000,
        maxPrice: 130000,
        propertyType: PropertyType.APARTMENT,
        minRooms: 3,
        minBedrooms: 2,
        minBathrooms: 1,
        needsParking: true,
      },
      {
        title: 'Departamento 3 ambientes en Caballito',
        neighborhood: 'Caballito',
        price: 120000,
        propertyType: PropertyType.APARTMENT,
        rooms: 3,
        bedrooms: 2,
        bathrooms: 1,
        hasGarage: true,
      },
    );

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.matchReasons).toContain('Entra en presupuesto');
    expect(result.matchReasons).toContain('Cumple cochera requerida');
  });

  it('penalizes listings that exceed max budget and miss garage', () => {
    const result = scoreExternalListingForRequirement(
      {
        neighborhoods: ['Caballito'],
        minPrice: null,
        maxPrice: 100000,
        propertyType: PropertyType.APARTMENT,
        minRooms: null,
        minBedrooms: null,
        minBathrooms: null,
        needsParking: true,
      },
      {
        title: 'Departamento 2 ambientes',
        neighborhood: 'Caballito',
        price: 150000,
        propertyType: PropertyType.APARTMENT,
        rooms: 2,
        bedrooms: 1,
        bathrooms: 1,
        hasGarage: false,
      },
    );

    expect(result.scoreBreakdown.price).toBe(-20);
    expect(result.scoreBreakdown.parking).toBe(-15);
  });

  it('detects likely duplicates by strong heuristics', () => {
    const isDuplicate = areExternalListingsLikelyDuplicates(
      {
        canonicalUrl: 'https://www.zonaprop.com.ar/propiedades/departamento-caballito-1.html',
        providerKey: 'ZONAPROP',
        externalListingId: '1',
        title: 'Departamento 3 ambientes en Caballito',
        neighborhood: 'Caballito',
        price: 120000,
        rooms: 3,
      },
      {
        canonicalUrl: 'https://www.argenprop.com/departamento-caballito-otro-link',
        providerKey: 'ARGENPROP',
        externalListingId: '2',
        title: 'Departamento 3 ambientes en Caballito',
        neighborhood: 'Caballito',
        price: 120000,
        rooms: 3,
      },
    );

    expect(isDuplicate).toBe(true);
  });

  it('matches neighborhoods ignoring accents and casing', () => {
    const result = scoreExternalListingForRequirement(
      {
        neighborhoods: ['Palermo Hollywood'],
        minPrice: null,
        maxPrice: null,
        propertyType: PropertyType.APARTMENT,
        minRooms: null,
        minBedrooms: null,
        minBathrooms: null,
        needsParking: false,
      },
      {
        title: 'Depto reciclado',
        neighborhood: 'pálermo   hollywood',
        price: 180000,
        propertyType: PropertyType.APARTMENT,
        rooms: 2,
        bedrooms: 1,
        bathrooms: 1,
        hasGarage: null,
      },
    );

    expect(result.scoreBreakdown.neighborhood).toBe(25);
    expect(result.matchReasons).toContain('Cumple barrio: pálermo   hollywood');
  });

  it('treats empty neighborhood filters as a broad search', () => {
    const result = scoreExternalListingForRequirement(
      {
        neighborhoods: [],
        minPrice: null,
        maxPrice: null,
        propertyType: PropertyType.PH,
        minRooms: null,
        minBedrooms: null,
        minBathrooms: null,
        needsParking: false,
      },
      {
        title: 'PH con patio',
        neighborhood: null,
        price: null,
        propertyType: PropertyType.PH,
        rooms: null,
        bedrooms: null,
        bathrooms: null,
        hasGarage: null,
      },
    );

    expect(result.scoreBreakdown.neighborhood).toBe(25);
    expect(result.scoreBreakdown.parking).toBe(10);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('detects duplicates by canonical url normalization and provider listing id', () => {
    expect(
      areExternalListingsLikelyDuplicates(
        {
          canonicalUrl: 'https://zonaprop.com.ar/depto-caballito-1/',
          providerKey: 'ZONAPROP',
          externalListingId: 'abc-1',
          title: 'Depto en Caballito',
          neighborhood: 'Caballito',
          price: 100000,
          rooms: 2,
        },
        {
          canonicalUrl: 'https://zonaprop.com.ar/depto-caballito-1',
          providerKey: 'ARGENPROP',
          externalListingId: 'other',
          title: 'Otro aviso',
          neighborhood: 'Palermo',
          price: 200000,
          rooms: 4,
        },
      ),
    ).toBe(true);

    expect(
      areExternalListingsLikelyDuplicates(
        {
          canonicalUrl: 'https://argenprop.com/aviso-a',
          providerKey: 'ARGENPROP',
          externalListingId: 'same-id',
          title: 'Aviso A',
          neighborhood: 'Caballito',
          price: 1,
          rooms: 1,
        },
        {
          canonicalUrl: 'https://argenprop.com/aviso-b',
          providerKey: 'ARGENPROP',
          externalListingId: 'same-id',
          title: 'Aviso B',
          neighborhood: 'Belgrano',
          price: 2,
          rooms: 2,
        },
      ),
    ).toBe(true);
  });

  it('does not mark clearly different listings as duplicates', () => {
    const isDuplicate = areExternalListingsLikelyDuplicates(
      {
        canonicalUrl: 'https://zonaprop.com.ar/ph-caballito',
        providerKey: 'ZONAPROP',
        externalListingId: '1',
        title: 'PH con patio',
        neighborhood: 'Caballito',
        price: 120000,
        rooms: 3,
      },
      {
        canonicalUrl: 'https://zonaprop.com.ar/departamento-belgrano',
        providerKey: 'ZONAPROP',
        externalListingId: '2',
        title: 'Departamento luminoso',
        neighborhood: 'Belgrano',
        price: 210000,
        rooms: 2,
      },
    );

    expect(isDuplicate).toBe(false);
  });

  it('normalizes text by removing accents and repeated whitespace', () => {
    expect(normalizeText('  Pálermo   Hollywood  ')).toBe('palermo hollywood');
  });
});
