import { describe, expect, it } from 'vitest';
import {
  ActivityType,
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
} from '../common/enums';
import {
  buildOpportunityPipelineGroups,
  buildOpportunityPipelineItem,
} from './commercial-opportunity-pipeline.use-case';

describe('commercial opportunity pipeline use case', () => {
  it('builds a sale pipeline with prelisting and property milestones', () => {
    const item = buildOpportunityPipelineItem(
      {
        id: 1,
        contactId: 10,
        operationType: OperationType.SALE,
        title: 'Venta PH Palermo',
        stage: CommercialOpportunityStage.PROPERTY_READY,
        status: CommercialOpportunityStatus.OPEN,
        searchRequirementId: null,
        appraisalRequestId: 55,
        propertyId: 99,
        appraisalRequest: {
          submittedAt: '2026-07-10T14:00:00.000Z',
        },
        contact: { displayName: 'Luciano Perez' },
        property: { title: 'PH reciclado con patio' },
      },
      [],
    );

    expect(item.steps).toEqual([
      { key: 'CONTACT_LINKED', completed: true },
      { key: 'PRELISTING_SENT', completed: true },
      { key: 'PRELISTING_COMPLETED', completed: true },
      { key: 'PROPERTY_READY', completed: true },
      { key: 'NEGOTIATING', completed: false },
      { key: 'RESERVED', completed: false },
      { key: 'CLOSED_WON', completed: false },
    ]);
    expect(item.completedStepsCount).toBe(4);
  });

  it('builds a buy pipeline from requirement, property sharing and visits', () => {
    const item = buildOpportunityPipelineItem(
      {
        id: 2,
        contactId: 20,
        operationType: OperationType.BUY,
        title: 'Compra 3 ambientes Caballito',
        stage: CommercialOpportunityStage.VISITING,
        status: CommercialOpportunityStatus.OPEN,
        searchRequirementId: 81,
        appraisalRequestId: null,
        propertyId: null,
        contact: { displayName: 'Sofia Lopez' },
        property: null,
      },
      [
        {
          commercialOpportunityId: 2,
          activityType: ActivityType.PROPERTY_SEARCH,
          whatsappSharedAt: '2026-07-09T09:30:00.000Z',
        },
        {
          commercialOpportunityId: 2,
          activityType: ActivityType.VISIT,
          whatsappSharedAt: null,
        },
      ],
    );

    expect(item.steps).toEqual([
      { key: 'CONTACT_LINKED', completed: true },
      { key: 'REQUIREMENT_LINKED', completed: true },
      { key: 'PROPERTIES_SHARED', completed: true },
      { key: 'VISITS_COMPLETED', completed: true },
      { key: 'NEGOTIATING', completed: false },
      { key: 'RESERVED', completed: false },
      { key: 'CLOSED_WON', completed: false },
    ]);
  });

  it('groups opportunities by operation type with won and open counters', () => {
    const groups = buildOpportunityPipelineGroups(
      [
        {
          id: 1,
          contactId: 10,
          operationType: OperationType.SALE,
          title: 'Venta PH Palermo',
          stage: CommercialOpportunityStage.CLOSED_WON,
          status: CommercialOpportunityStatus.WON,
          searchRequirementId: null,
          appraisalRequestId: 55,
          propertyId: 99,
          contact: { displayName: 'Luciano Perez' },
          property: { title: 'PH reciclado con patio' },
          appraisalRequest: { submittedAt: '2026-07-10T14:00:00.000Z' },
        },
        {
          id: 2,
          contactId: 20,
          operationType: OperationType.BUY,
          title: 'Compra 3 ambientes Caballito',
          stage: CommercialOpportunityStage.SEARCHING,
          status: CommercialOpportunityStatus.OPEN,
          searchRequirementId: 81,
          appraisalRequestId: null,
          propertyId: null,
          contact: { displayName: 'Sofia Lopez' },
          property: null,
          appraisalRequest: null,
        },
      ],
      [],
    );

    expect(groups.find((group) => group.operationType === OperationType.SALE)).toMatchObject({
      total: 1,
      wonCount: 1,
      openCount: 0,
    });
    expect(groups.find((group) => group.operationType === OperationType.BUY)).toMatchObject({
      total: 1,
      wonCount: 0,
      openCount: 1,
    });
    expect(groups.find((group) => group.operationType === OperationType.RENT)).toMatchObject({
      total: 0,
      wonCount: 0,
      openCount: 0,
    });
  });
});
