export enum ContactRoleType {
  OWNER = 'OWNER',
  BUYER = 'BUYER',
  TENANT = 'TENANT',
  INVESTOR = 'INVESTOR',
  REFERRER = 'REFERRER',
  REALTOR = 'REALTOR',
  NOTARY = 'NOTARY',
  OTHER = 'OTHER',
}

export enum OperationType {
  SALE = 'SALE',
  BUY = 'BUY',
  RENT = 'RENT',
}

export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  PH = 'PH',
  LAND = 'LAND',
  OFFICE = 'OFFICE',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER',
}

export enum PropertyStatus {
  DRAFT = 'DRAFT',
  APPRAISAL = 'APPRAISAL',
  CAPTURED = 'CAPTURED',
  ACTIVE = 'ACTIVE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
  ARCHIVED = 'ARCHIVED',
  LOST = 'LOST',
}

export enum CurrencyType {
  USD = 'USD',
  ARS = 'ARS',
}

export enum SearchRequirementStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum BuyerPropertyShareStatus {
  PENDING_WHATSAPP = 'PENDING_WHATSAPP',
  SHARED_WHATSAPP = 'SHARED_WHATSAPP',
}

export enum ActivityType {
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  INSTAGRAM = 'INSTAGRAM',
  MEETING = 'MEETING',
  VISIT = 'VISIT',
  NOTE = 'NOTE',
  FOLLOW_UP = 'FOLLOW_UP',
  PROPERTY_SEARCH = 'PROPERTY_SEARCH',
}

export enum VisitStatus {
  SCHEDULED = 'SCHEDULED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum AppUserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum TeamMembershipRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}
