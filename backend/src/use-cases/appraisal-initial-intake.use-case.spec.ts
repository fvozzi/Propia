import { describe, expect, it } from 'vitest';
import {
  AppraisalDisposition,
  AppraisalOrientation,
  PropertyType,
} from '../common/enums';
import {
  buildAppraisalRequestActivityTitle,
  calculateAppraisalAreas,
  createAppraisalRequestExpiration,
  isAppraisalRequestAvailable,
  summarizeAppraisalAnswers,
} from './appraisal-initial-intake.use-case';

describe('appraisal-initial-intake use case', () => {
  it('creates an expiration exactly 48 hours ahead', () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    const expiresAt = createAppraisalRequestExpiration(now);

    expect(expiresAt.toISOString()).toBe('2026-05-26T12:00:00.000Z');
  });

  it('builds a readable activity title for the appraisal request', () => {
    expect(buildAppraisalRequestActivityTitle('Av. Directorio 1200')).toBe(
      'Prelisting · Av. Directorio 1200',
    );
    expect(buildAppraisalRequestActivityTitle(null)).toBe('Prelisting');
  });

  it('marks a request unavailable if it was already submitted or expired', () => {
    expect(
      isAppraisalRequestAvailable(
        '2026-05-26T12:00:00.000Z',
        null,
        new Date('2026-05-25T09:00:00.000Z'),
      ),
    ).toBe(true);
    expect(
      isAppraisalRequestAvailable(
        '2026-05-26T12:00:00.000Z',
        '2026-05-25T10:30:00.000Z',
        new Date('2026-05-25T11:00:00.000Z'),
      ),
    ).toBe(false);
    expect(
      isAppraisalRequestAvailable(
        '2026-05-26T12:00:00.000Z',
        null,
        new Date('2026-05-26T12:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('builds a readable summary of the initial appraisal answers', () => {
    expect(
      summarizeAppraisalAnswers({
        propertyAddress: 'Av. Directorio 1200',
        neighborhood: 'Caballito',
        propertyType: PropertyType.PH,
        rooms: 3,
        bedrooms: 2,
        bathrooms: 2,
        expenses: 180000,
        floor: 7,
        amenities: 'Pileta, SUM',
        orientation: AppraisalOrientation.NORTH,
        disposition: AppraisalDisposition.FRONT,
        ageYears: 12,
        hasGarage: true,
        coveredArea: 70,
        semiCoveredArea: 8,
        uncoveredArea: 12,
        totalArea: 90,
        weightedArea: 80,
        conditionNotes: 'Reciclado a nuevo',
        valuationReason: 'Quiere ponerla a la venta durante este mes',
      }),
    ).toContain('Superficie ponderada: 80');
  });

  it('calculates total and weighted areas from the three surface inputs', () => {
    expect(
      calculateAppraisalAreas({
        coveredArea: 70,
        semiCoveredArea: 8,
        uncoveredArea: 12,
      }),
    ).toEqual({
      totalArea: 90,
      weightedArea: 80,
    });

    expect(
      calculateAppraisalAreas({
        coveredArea: null,
        semiCoveredArea: null,
        uncoveredArea: null,
      }),
    ).toEqual({
      totalArea: null,
      weightedArea: null,
    });
  });
});
