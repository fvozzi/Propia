import { useI18n } from '../lib/i18n';

const enumGroups: Record<
  string,
  | 'role'
  | 'operationType'
  | 'propertyType'
  | 'propertyStatus'
  | 'currency'
  | 'searchRequirementStatus'
  | 'activityType'
  | 'visitStatus'
  | 'buyerPropertyShareStatus'
> = {
  OWNER: 'role',
  BUYER: 'role',
  TENANT: 'role',
  INVESTOR: 'role',
  REFERRER: 'role',
  REALTOR: 'role',
  NOTARY: 'role',
  OTHER: 'role',
  SALE: 'operationType',
  BUY: 'operationType',
  RENT: 'operationType',
  HOUSE: 'propertyType',
  APARTMENT: 'propertyType',
  PH: 'propertyType',
  LAND: 'propertyType',
  OFFICE: 'propertyType',
  COMMERCIAL: 'propertyType',
  DRAFT: 'propertyStatus',
  APPRAISAL: 'propertyStatus',
  CAPTURED: 'propertyStatus',
  ACTIVE: 'propertyStatus',
  RESERVED: 'propertyStatus',
  SOLD: 'propertyStatus',
  RENTED: 'propertyStatus',
  ARCHIVED: 'propertyStatus',
  LOST: 'propertyStatus',
  USD: 'currency',
  ARS: 'currency',
  PAUSED: 'searchRequirementStatus',
  CLOSED: 'searchRequirementStatus',
  CALL: 'activityType',
  WHATSAPP: 'activityType',
  EMAIL: 'activityType',
  INSTAGRAM: 'activityType',
  MEETING: 'activityType',
  VISIT: 'activityType',
  NOTE: 'activityType',
  FOLLOW_UP: 'activityType',
  PROPERTY_SEARCH: 'activityType',
  APPRAISAL_REQUEST: 'activityType',
  SCHEDULED: 'visitStatus',
  DONE: 'visitStatus',
  CANCELLED: 'visitStatus',
  RESCHEDULED: 'visitStatus',
  PENDING_WHATSAPP: 'buyerPropertyShareStatus',
  SHARED_WHATSAPP: 'buyerPropertyShareStatus',
};

export function StatusPill({ value }: { value: string }) {
  const { translateEnum } = useI18n();
  const group = enumGroups[value];
  const label = group ? translateEnum(group, value) : value.replace(/_/g, ' ');

  return <span className={`pill pill-${value.toLowerCase()}`}>{label}</span>;
}
