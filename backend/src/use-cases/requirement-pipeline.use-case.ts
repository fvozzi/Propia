import { ActivityType, OperationType } from '../common/enums';

export type RequirementPipelineStepKey =
  | 'CONTACT_LINKED'
  | 'CRITERIA_DEFINED'
  | 'PROPERTIES_SHARED'
  | 'PROPERTY_LINKED'
  | 'APPRAISAL_REQUEST_SENT'
  | 'APPRAISAL_REQUEST_COMPLETED';

export type RequirementPipelineStep = {
  key: RequirementPipelineStepKey;
  completed: boolean;
};

export type RequirementPipelineItem = {
  requirementId: number;
  contactId: number;
  contactDisplayName: string;
  operationType: OperationType;
  propertyType: string;
  status: string;
  propertyId: number | null;
  propertyTitle: string | null;
  completedStepsCount: number;
  totalStepsCount: number;
  steps: RequirementPipelineStep[];
};

export type RequirementPipelineGroup = {
  operationType: OperationType;
  total: number;
  fullyCompleted: number;
  items: RequirementPipelineItem[];
};

type RequirementInput = {
  id: number;
  contactId: number;
  operationType: OperationType;
  propertyType: string;
  status: string;
  propertyId: number | null;
  neighborhoods: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRooms: number | null;
  minBedrooms: number | null;
  minBathrooms: number | null;
  needsParking: boolean;
  creditEligible: boolean;
  professionalUse: boolean;
  accessible: boolean;
  bright: boolean;
  amenities: string[];
  roomTypes: string[];
  ageRange: string | null;
  notes: string | null;
  contact?: { displayName: string } | null;
  property?: { title: string } | null;
};

type ActivityInput = {
  contactId: number | null;
  activityType: ActivityType;
  whatsappSharedAt: Date | string | null;
};

type AppraisalRequestInput = {
  contactId: number;
  submittedAt: Date | string | null;
};

function hasDefinedBuyerCriteria(requirement: RequirementInput) {
  return Boolean(
    requirement.neighborhoods.length ||
      requirement.minPrice !== null ||
      requirement.maxPrice !== null ||
      requirement.minRooms !== null ||
      requirement.minBedrooms !== null ||
      requirement.minBathrooms !== null ||
      requirement.needsParking ||
      requirement.creditEligible ||
      requirement.professionalUse ||
      requirement.accessible ||
      requirement.bright ||
      requirement.amenities.length ||
      requirement.roomTypes.length ||
      requirement.ageRange ||
      requirement.notes,
  );
}

export function buildRequirementPipelineItem(
  requirement: RequirementInput,
  propertySearchActivities: ActivityInput[],
  appraisalRequests: AppraisalRequestInput[],
): RequirementPipelineItem {
  const relatedActivities = propertySearchActivities.filter((activity) => activity.contactId === requirement.contactId);
  const relatedAppraisalRequests = appraisalRequests.filter((request) => request.contactId === requirement.contactId);

  const steps: RequirementPipelineStep[] =
    requirement.operationType === OperationType.SALE
      ? [
          { key: 'CONTACT_LINKED', completed: true },
          { key: 'PROPERTY_LINKED', completed: Boolean(requirement.propertyId) },
          { key: 'APPRAISAL_REQUEST_SENT', completed: relatedAppraisalRequests.length > 0 },
          {
            key: 'APPRAISAL_REQUEST_COMPLETED',
            completed: relatedAppraisalRequests.some((request) => Boolean(request.submittedAt)),
          },
        ]
      : [
          { key: 'CONTACT_LINKED', completed: true },
          { key: 'CRITERIA_DEFINED', completed: hasDefinedBuyerCriteria(requirement) },
          {
            key: 'PROPERTIES_SHARED',
            completed: relatedActivities.some((activity) => activity.whatsappSharedAt !== null),
          },
          { key: 'PROPERTY_LINKED', completed: Boolean(requirement.propertyId) },
        ];

  const completedStepsCount = steps.filter((step) => step.completed).length;

  return {
    requirementId: requirement.id,
    contactId: requirement.contactId,
    contactDisplayName: requirement.contact?.displayName ?? `Contacto #${requirement.contactId}`,
    operationType: requirement.operationType,
    propertyType: requirement.propertyType,
    status: requirement.status,
    propertyId: requirement.propertyId,
    propertyTitle: requirement.property?.title ?? null,
    completedStepsCount,
    totalStepsCount: steps.length,
    steps,
  };
}

export function buildRequirementPipelineGroups(
  requirements: RequirementInput[],
  propertySearchActivities: ActivityInput[],
  appraisalRequests: AppraisalRequestInput[],
): RequirementPipelineGroup[] {
  const operations: OperationType[] = [OperationType.SALE, OperationType.BUY, OperationType.RENT];

  return operations.map((operationType) => {
    const items = requirements
      .filter((requirement) => requirement.operationType === operationType)
      .map((requirement) => buildRequirementPipelineItem(requirement, propertySearchActivities, appraisalRequests));

    return {
      operationType,
      total: items.length,
      fullyCompleted: items.filter((item) => item.completedStepsCount === item.totalStepsCount).length,
      items,
    };
  });
}
