import { describe, expect, it } from 'vitest';
import { PropertyType } from '../common/enums';
import {
  areExternalListingsLikelyDuplicates,
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
});
