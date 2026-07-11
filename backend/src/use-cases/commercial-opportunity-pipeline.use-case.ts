import {
  ActivityType,
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
} from '../common/enums';

export type OpportunityPipelineStepKey =
  | 'CONTACT_LINKED'
  | 'REQUIREMENT_LINKED'
  | 'PROPERTIES_SHARED'
  | 'VISITS_COMPLETED'
  | 'PRELISTING_SENT'
  | 'PRELISTING_COMPLETED'
  | 'PROPERTY_READY'
  | 'NEGOTIATING'
  | 'RESERVED'
  | 'CLOSED_WON';

export type OpportunityPipelineStep = {
  key: OpportunityPipelineStepKey;
  completed: boolean;
};

export type OpportunityPipelineItem = {
  opportunityId: number;
  contactId: number;
  contactDisplayName: string;
  operationType: OperationType;
  title: string;
  stage: CommercialOpportunityStage;
  status: CommercialOpportunityStatus;
  propertyId: number | null;
  propertyTitle: string | null;
  completedStepsCount: number;
  totalStepsCount: number;
  steps: OpportunityPipelineStep[];
};

export type OpportunityPipelineGroup = {
  operationType: OperationType;
  total: number;
  wonCount: number;
  openCount: number;
  items: OpportunityPipelineItem[];
};

type OpportunityInput = {
  id: number;
  contactId: number;
  operationType: OperationType;
  title: string;
  stage: CommercialOpportunityStage;
  status: CommercialOpportunityStatus;
  searchRequirementId: number | null;
  appraisalRequestId: number | null;
  propertyId: number | null;
  contact?: { displayName: string } | null;
  property?: { title: string } | null;
  appraisalRequest?: { submittedAt: Date | string | null } | null;
};

type ActivityInput = {
  commercialOpportunityId: number | null;
  activityType: ActivityType;
  whatsappSharedAt: Date | string | null;
};

const buyLikeOperations = new Set<OperationType>([
  OperationType.BUY,
  OperationType.RENT,
]);

const stageRank: Record<CommercialOpportunityStage, number> = {
  NEW: 0,
  QUALIFYING: 1,
  SEARCHING: 2,
  PRELISTING_SENT: 3,
  PRELISTING_COMPLETED: 4,
  PROPERTY_READY: 5,
  VISITING: 6,
  NEGOTIATING: 7,
  RESERVED: 8,
  CLOSED_WON: 9,
  CLOSED_LOST: 9,
};

export function buildOpportunityPipelineItem(
  opportunity: OpportunityInput,
  activities: ActivityInput[],
) {
  const relatedActivities = activities.filter(
    (activity) => activity.commercialOpportunityId === opportunity.id,
  );
  const currentRank = stageRank[opportunity.stage] ?? 0;
  const hasSharedProperties = relatedActivities.some(
    (activity) =>
      activity.activityType === ActivityType.PROPERTY_SEARCH &&
      activity.whatsappSharedAt !== null,
  );
  const hasVisitLikeActivity = relatedActivities.some((activity) =>
    activity.activityType === ActivityType.VISIT,
  );
  const hasReservation = relatedActivities.some(
    (activity) => activity.activityType === ActivityType.RESERVATION,
  );
  const isWon =
    opportunity.status === CommercialOpportunityStatus.WON ||
    opportunity.stage === CommercialOpportunityStage.CLOSED_WON;

  const steps: OpportunityPipelineStep[] = buyLikeOperations.has(
    opportunity.operationType,
  )
    ? [
        { key: 'CONTACT_LINKED', completed: true },
        {
          key: 'REQUIREMENT_LINKED',
          completed: Boolean(opportunity.searchRequirementId),
        },
        {
          key: 'PROPERTIES_SHARED',
          completed: hasSharedProperties || currentRank >= stageRank.VISITING,
        },
        {
          key: 'VISITS_COMPLETED',
          completed: hasVisitLikeActivity || currentRank >= stageRank.VISITING,
        },
        {
          key: 'NEGOTIATING',
          completed: currentRank >= stageRank.NEGOTIATING,
        },
        {
          key: 'RESERVED',
          completed:
            hasReservation || currentRank >= stageRank.RESERVED || isWon,
        },
        { key: 'CLOSED_WON', completed: isWon },
      ]
    : [
        { key: 'CONTACT_LINKED', completed: true },
        {
          key: 'PRELISTING_SENT',
          completed:
            Boolean(opportunity.appraisalRequestId) ||
            currentRank >= stageRank.PRELISTING_SENT,
        },
        {
          key: 'PRELISTING_COMPLETED',
          completed:
            Boolean(opportunity.appraisalRequest?.submittedAt) ||
            currentRank >= stageRank.PRELISTING_COMPLETED,
        },
        {
          key: 'PROPERTY_READY',
          completed:
            Boolean(opportunity.propertyId) ||
            currentRank >= stageRank.PROPERTY_READY,
        },
        {
          key: 'NEGOTIATING',
          completed: currentRank >= stageRank.NEGOTIATING,
        },
        {
          key: 'RESERVED',
          completed:
            hasReservation || currentRank >= stageRank.RESERVED || isWon,
        },
        { key: 'CLOSED_WON', completed: isWon },
      ];

  const completedStepsCount = steps.filter((step) => step.completed).length;

  return {
    opportunityId: opportunity.id,
    contactId: opportunity.contactId,
    contactDisplayName:
      opportunity.contact?.displayName ?? `Contacto #${opportunity.contactId}`,
    operationType: opportunity.operationType,
    title: opportunity.title,
    stage: opportunity.stage,
    status: opportunity.status,
    propertyId: opportunity.propertyId,
    propertyTitle: opportunity.property?.title ?? null,
    completedStepsCount,
    totalStepsCount: steps.length,
    steps,
  } satisfies OpportunityPipelineItem;
}

export function buildOpportunityPipelineGroups(
  opportunities: OpportunityInput[],
  activities: ActivityInput[],
) {
  const operations: OperationType[] = [
    OperationType.SALE,
    OperationType.BUY,
    OperationType.RENT,
  ];

  return operations.map((operationType) => {
    const items = opportunities
      .filter((opportunity) => opportunity.operationType === operationType)
      .map((opportunity) =>
        buildOpportunityPipelineItem(opportunity, activities),
      );

    return {
      operationType,
      total: items.length,
      wonCount: items.filter(
        (item) =>
          item.status === CommercialOpportunityStatus.WON ||
          item.stage === CommercialOpportunityStage.CLOSED_WON,
      ).length,
      openCount: items.filter(
        (item) => item.status === CommercialOpportunityStatus.OPEN,
      ).length,
      items,
    } satisfies OpportunityPipelineGroup;
  });
}
