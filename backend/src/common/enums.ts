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

export enum BuyerPropertyCandidateWorkflowStatus {
  TO_CONTACT = 'TO_CONTACT',
  CONTACTED = 'CONTACTED',
  WAITING_RESPONSE = 'WAITING_RESPONSE',
  PROPOSED_SCHEDULES = 'PROPOSED_SCHEDULES',
  VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  VISITED = 'VISITED',
  DISCARDED = 'DISCARDED',
  INTERESTED = 'INTERESTED',
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
  APPRAISAL_REQUEST = 'APPRAISAL_REQUEST',
  MARKET_ANALYSIS = 'MARKET_ANALYSIS',
  PHOTO_SESSION = 'PHOTO_SESSION',
  RESERVATION = 'RESERVATION',
  SALE_DEED = 'SALE_DEED',
  PURCHASE_DEED = 'PURCHASE_DEED',
}

export enum VisitStatus {
  SCHEDULED = 'SCHEDULED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum AppraisalOrientation {
  EAST = 'EAST',
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
  WEST = 'WEST',
}

export enum AppraisalDisposition {
  FRONT = 'FRONT',
  BACK = 'BACK',
}

export enum AppUserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum TeamMembershipRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  DISABLED = 'DISABLED',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum WhatsappMessageDirection {
  OUTBOUND = 'OUTBOUND',
  INBOUND = 'INBOUND',
}

export enum WhatsappMessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum PortalProviderKey {
  ARGENPROP = 'ARGENPROP',
  ZONAPROP = 'ZONAPROP',
  MERCADOLIBRE = 'MERCADOLIBRE',
  MOCK = 'MOCK',
}

export enum ExternalListingStatus {
  ACTIVE = 'ACTIVE',
  MISSING = 'MISSING',
  DUPLICATED = 'DUPLICATED',
  ARCHIVED = 'ARCHIVED',
}

export enum PortalSearchRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum DocumentTemplatePresetKey {
  CUSTOM = 'CUSTOM',
  EXCLUSIVE_SALE_AUTHORIZATION = 'EXCLUSIVE_SALE_AUTHORIZATION',
}

export enum FinancialEntryType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

export enum ExpenseCategory {
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  TRANSPORT = 'TRANSPORT',
  ADVERTISING = 'ADVERTISING',
  PROPERTY_SEARCH_SERVICES = 'PROPERTY_SEARCH_SERVICES',
  PHOTOCOPIES = 'PHOTOCOPIES',
  OTHER = 'OTHER',
}

export enum CommercialOpportunityStage {
  NEW = 'NEW',
  QUALIFYING = 'QUALIFYING',
  SEARCHING = 'SEARCHING',
  PRELISTING_SENT = 'PRELISTING_SENT',
  PRELISTING_COMPLETED = 'PRELISTING_COMPLETED',
  PROPERTY_READY = 'PROPERTY_READY',
  VISITING = 'VISITING',
  NEGOTIATING = 'NEGOTIATING',
  RESERVED = 'RESERVED',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum CommercialOpportunityStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST',
  ARCHIVED = 'ARCHIVED',
}
