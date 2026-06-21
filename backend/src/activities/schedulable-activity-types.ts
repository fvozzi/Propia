import { ActivityType } from '../common/enums';

export const SCHEDULABLE_ACTIVITY_TYPES = [
  ActivityType.VISIT,
  ActivityType.APPRAISAL_REQUEST,
  ActivityType.MARKET_ANALYSIS,
  ActivityType.PHOTO_SESSION,
  ActivityType.RESERVATION,
  ActivityType.SALE_DEED,
  ActivityType.PURCHASE_DEED,
] as const;

export function isSchedulableActivityType(activityType: ActivityType) {
  return SCHEDULABLE_ACTIVITY_TYPES.includes(
    activityType as (typeof SCHEDULABLE_ACTIVITY_TYPES)[number],
  );
}
