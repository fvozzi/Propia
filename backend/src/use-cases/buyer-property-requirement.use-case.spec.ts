import { describe, expect, it } from 'vitest';
import {
  createBuyerPropertyRequirementCriteria,
  summarizeBuyerPropertyRequirement,
} from './buyer-property-requirement.use-case';

describe('buyer property requirement use case', () => {
  it('captures grouped filters for a buyer requirement', () => {
    const criteria = createBuyerPropertyRequirementCriteria({
      propertyTypes: ['APARTMENT', 'PH'],
      neighborhoods: ['Palermo', 'Belgrano'],
      priceMin: 120000,
      priceMax: 180000,
      currency: 'USD',
      roomsMin: 3,
      bedroomsMin: 2,
      bathroomsMin: 2,
      needsParking: true,
      creditEligible: true,
      professionalUse: true,
      accessible: true,
      bright: true,
      amenities: ['POOL', 'GRILL'],
      roomTypes: ['BALCONY', 'TERRACE'],
      ageRange: 'UP_TO_10_YEARS',
      notes: 'Busca mudarse antes de octubre',
    });

    expect(criteria).toEqual({
      operationType: 'BUY',
      propertyTypes: ['APARTMENT', 'PH'],
      neighborhoods: ['Palermo', 'Belgrano'],
      priceMin: 120000,
      priceMax: 180000,
      currency: 'USD',
      roomsMin: 3,
      bedroomsMin: 2,
      bathroomsMin: 2,
      needsParking: true,
      creditEligible: true,
      professionalUse: true,
      accessible: true,
      bright: true,
      amenities: ['POOL', 'GRILL'],
      roomTypes: ['BALCONY', 'TERRACE'],
      ageRange: 'UP_TO_10_YEARS',
      notes: 'Busca mudarse antes de octubre',
    });
  });

  it('normalizes empty values and removes duplicates from list filters', () => {
    const criteria = createBuyerPropertyRequirementCriteria({
      propertyTypes: ['APARTMENT', 'APARTMENT', ' ', 'PH'],
      neighborhoods: ['Caballito', 'Caballito', ' ', 'Villa Crespo'],
      amenities: ['POOL', 'POOL', 'GYM'],
      roomTypes: ['BALCONY', 'BALCONY', 'TERRACE'],
      notes: '   ',
    });

    expect(criteria.propertyTypes).toEqual(['APARTMENT', 'PH']);
    expect(criteria.neighborhoods).toEqual(['Caballito', 'Villa Crespo']);
    expect(criteria.amenities).toEqual(['POOL', 'GYM']);
    expect(criteria.roomTypes).toEqual(['BALCONY', 'TERRACE']);
    expect(criteria.notes).toBeNull();
  });

  it('defaults optional numeric and boolean filters when they are not provided', () => {
    const criteria = createBuyerPropertyRequirementCriteria({});

    expect(criteria.priceMin).toBeNull();
    expect(criteria.priceMax).toBeNull();
    expect(criteria.roomsMin).toBeNull();
    expect(criteria.bedroomsMin).toBeNull();
    expect(criteria.bathroomsMin).toBeNull();
    expect(criteria.needsParking).toBe(false);
    expect(criteria.creditEligible).toBe(false);
    expect(criteria.professionalUse).toBe(false);
    expect(criteria.accessible).toBe(false);
    expect(criteria.bright).toBe(false);
    expect(criteria.amenities).toEqual([]);
    expect(criteria.roomTypes).toEqual([]);
    expect(criteria.ageRange).toBeNull();
    expect(criteria.currency).toBe('USD');
  });

  it('builds a readable summary for quick review', () => {
    const summary = summarizeBuyerPropertyRequirement(
      createBuyerPropertyRequirementCriteria({
        propertyTypes: ['APARTMENT'],
        neighborhoods: ['Nunez'],
        roomsMin: 2,
        needsParking: true,
        creditEligible: true,
        professionalUse: true,
        accessible: true,
        bright: true,
        amenities: ['POOL'],
        roomTypes: ['BALCONY'],
        ageRange: 'BRAND_NEW',
      }),
    );

    expect(summary).toEqual([
      'Tipos: APARTMENT',
      'Zonas: Nunez',
      'Ambientes desde 2',
      'Con cochera',
      'Apto credito',
      'Apto profesional',
      'Acceso movilidad reducida',
      'Luminoso',
      'Comodidades: POOL',
      'Ambientes: BALCONY',
      'Antiguedad: BRAND_NEW',
    ]);
  });
});
