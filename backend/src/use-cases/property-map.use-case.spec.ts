import { describe, expect, it } from 'vitest';
import { OperationType, VisitStatus } from '../common/enums';
import { buildPropertyMapItems } from './property-map.use-case';

describe('property-map use case', () => {
  it('includes sale properties even without visits', () => {
    const items = buildPropertyMapItems(
      [
        {
          id: 1,
          title: 'Depto en Belgrano',
          address: 'Av. Cabildo 1000',
          city: 'Buenos Aires',
          neighborhood: 'Belgrano',
          operationType: OperationType.SALE,
          propertyType: 'APARTMENT',
          status: 'ACTIVE',
          price: 180000,
          currency: 'USD',
        },
      ],
      [],
    );

    expect(items).toEqual([
      expect.objectContaining({
        propertyId: 1,
        categories: ['SALE'],
        visitCount: 0,
        lastVisitedAt: null,
      }),
    ]);
  });

  it('includes visited properties when they have at least one done visit', () => {
    const items = buildPropertyMapItems(
      [
        {
          id: 2,
          title: 'PH con patio',
          address: 'Rosario 200',
          city: 'Buenos Aires',
          neighborhood: 'Caballito',
          operationType: OperationType.BUY,
          propertyType: 'PH',
          status: 'ACTIVE',
          price: 120000,
          currency: 'USD',
        },
      ],
      [
        {
          propertyId: 2,
          status: VisitStatus.DONE,
          scheduledAt: '2026-05-22T15:00:00.000Z',
        },
      ],
    );

    expect(items).toEqual([
      expect.objectContaining({
        propertyId: 2,
        categories: ['VISITED'],
        visitCount: 1,
        lastVisitedAt: '2026-05-22T15:00:00.000Z',
      }),
    ]);
  });

  it('marks a property with both categories and ignores non-completed visits', () => {
    const items = buildPropertyMapItems(
      [
        {
          id: 3,
          title: 'Casa lote propio',
          address: 'Moreto 500',
          city: 'Buenos Aires',
          neighborhood: 'Floresta',
          operationType: OperationType.SALE,
          propertyType: 'HOUSE',
          status: 'CAPTURED',
          price: 250000,
          currency: 'USD',
        },
      ],
      [
        {
          propertyId: 3,
          status: VisitStatus.SCHEDULED,
          scheduledAt: '2026-05-23T15:00:00.000Z',
        },
        {
          propertyId: 3,
          status: VisitStatus.DONE,
          scheduledAt: '2026-05-21T15:00:00.000Z',
        },
        {
          propertyId: 3,
          status: VisitStatus.DONE,
          scheduledAt: '2026-05-24T15:00:00.000Z',
        },
      ],
    );

    expect(items).toEqual([
      expect.objectContaining({
        propertyId: 3,
        categories: ['SALE', 'VISITED'],
        visitCount: 2,
        lastVisitedAt: '2026-05-24T15:00:00.000Z',
      }),
    ]);
  });
});
