import { describe, expect, it } from 'vitest';
import { ActivityType, OperationType } from '../common/enums';
import { buildRequirementPipelineGroups, buildRequirementPipelineItem } from './requirement-pipeline.use-case';

describe('requirement pipeline use case', () => {
  it('builds a sale pipeline with appraisal milestones', () => {
    const item = buildRequirementPipelineItem(
      {
        id: 1,
        contactId: 10,
        operationType: OperationType.SALE,
        propertyType: 'APARTMENT',
        status: 'ACTIVE',
        propertyId: 99,
        neighborhoods: [],
        minPrice: null,
        maxPrice: null,
        minRooms: null,
        minBedrooms: null,
        minBathrooms: null,
        needsParking: false,
        creditEligible: false,
        professionalUse: false,
        accessible: false,
        bright: false,
        amenities: [],
        roomTypes: [],
        ageRange: null,
        notes: null,
        contact: { displayName: 'Luciano Perez' },
        property: { title: 'PH reciclado con patio' },
      },
      [],
      [{ contactId: 10, submittedAt: '2026-05-25T12:00:00.000Z' }],
    );

    expect(item.steps.map((step) => step.key)).toEqual([
      'CONTACT_LINKED',
      'PROPERTY_LINKED',
      'APPRAISAL_REQUEST_SENT',
      'APPRAISAL_REQUEST_COMPLETED',
    ]);
    expect(item.completedStepsCount).toBe(4);
  });

  it('builds a buyer pipeline from criteria and shared properties', () => {
    const item = buildRequirementPipelineItem(
      {
        id: 2,
        contactId: 20,
        operationType: OperationType.BUY,
        propertyType: 'HOUSE',
        status: 'ACTIVE',
        propertyId: null,
        neighborhoods: ['Ituzaingo Norte'],
        minPrice: 100000,
        maxPrice: 180000,
        minRooms: 4,
        minBedrooms: 3,
        minBathrooms: null,
        needsParking: true,
        creditEligible: false,
        professionalUse: false,
        accessible: false,
        bright: true,
        amenities: [],
        roomTypes: [],
        ageRange: null,
        notes: null,
        contact: { displayName: 'Sofia Lopez' },
        property: null,
      },
      [{ contactId: 20, activityType: ActivityType.PROPERTY_SEARCH, whatsappSharedAt: '2026-05-25T09:30:00.000Z' }],
      [],
    );

    expect(item.steps).toEqual([
      { key: 'CONTACT_LINKED', completed: true },
      { key: 'CRITERIA_DEFINED', completed: true },
      { key: 'PROPERTIES_SHARED', completed: true },
      { key: 'PROPERTY_LINKED', completed: false },
    ]);
  });

  it('groups requirements by operation type with completion counts', () => {
    const groups = buildRequirementPipelineGroups(
      [
        {
          id: 1,
          contactId: 10,
          operationType: OperationType.SALE,
          propertyType: 'APARTMENT',
          status: 'ACTIVE',
          propertyId: 12,
          neighborhoods: [],
          minPrice: null,
          maxPrice: null,
          minRooms: null,
          minBedrooms: null,
          minBathrooms: null,
          needsParking: false,
          creditEligible: false,
          professionalUse: false,
          accessible: false,
          bright: false,
          amenities: [],
          roomTypes: [],
          ageRange: null,
          notes: null,
          contact: { displayName: 'Luciano Perez' },
          property: { title: 'Depto 3 ambientes' },
        },
        {
          id: 2,
          contactId: 20,
          operationType: OperationType.BUY,
          propertyType: 'HOUSE',
          status: 'ACTIVE',
          propertyId: null,
          neighborhoods: ['Caballito'],
          minPrice: null,
          maxPrice: null,
          minRooms: 3,
          minBedrooms: null,
          minBathrooms: null,
          needsParking: false,
          creditEligible: false,
          professionalUse: false,
          accessible: false,
          bright: false,
          amenities: [],
          roomTypes: [],
          ageRange: null,
          notes: null,
          contact: { displayName: 'Sofia Lopez' },
          property: null,
        },
      ],
      [],
      [{ contactId: 10, submittedAt: null }],
    );

    expect(groups.find((group) => group.operationType === OperationType.SALE)?.total).toBe(1);
    expect(groups.find((group) => group.operationType === OperationType.BUY)?.total).toBe(1);
    expect(groups.find((group) => group.operationType === OperationType.RENT)?.total).toBe(0);
  });
});
