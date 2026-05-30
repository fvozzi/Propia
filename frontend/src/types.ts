export type Role =
  | 'OWNER'
  | 'BUYER'
  | 'TENANT'
  | 'INVESTOR'
  | 'REFERRER'
  | 'REALTOR'
  | 'NOTARY'
  | 'OTHER';

export type OperationType = 'SALE' | 'BUY' | 'RENT';
export type PropertyType =
  | 'HOUSE'
  | 'APARTMENT'
  | 'PH'
  | 'LAND'
  | 'OFFICE'
  | 'COMMERCIAL'
  | 'OTHER';
export type PropertyStatus =
  | 'DRAFT'
  | 'APPRAISAL'
  | 'CAPTURED'
  | 'ACTIVE'
  | 'RESERVED'
  | 'SOLD'
  | 'RENTED'
  | 'ARCHIVED'
  | 'LOST';
export type CurrencyType = 'USD' | 'ARS';
export type SearchRequirementStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type SearchRequirementAmenity =
  | 'POOL'
  | 'GRILL'
  | 'DOORMAN'
  | 'SECURITY'
  | 'ELEVATOR'
  | 'SPORTS_COURT'
  | 'GYM'
  | 'LAUNDRY'
  | 'QUINCHO'
  | 'SOLARIUM'
  | 'SUM';
export type SearchRequirementRoomType =
  | 'KITCHEN'
  | 'LIVING_DINING'
  | 'BALCONY'
  | 'LAUNDRY_ROOM'
  | 'TOILET'
  | 'SERVICE_ROOM'
  | 'SUITE_BEDROOM'
  | 'GARDEN'
  | 'PATIO'
  | 'TERRACE'
  | 'DRESSING_ROOM';
export type SearchRequirementAgeRange =
  | 'UNDER_CONSTRUCTION'
  | 'BRAND_NEW'
  | 'UP_TO_5_YEARS'
  | 'UP_TO_10_YEARS'
  | 'UP_TO_20_YEARS'
  | 'UP_TO_50_YEARS'
  | 'OVER_50_YEARS';
export type BuyerPropertyShareStatus = 'PENDING_WHATSAPP' | 'SHARED_WHATSAPP';
export type ActivityType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'INSTAGRAM'
  | 'MEETING'
  | 'VISIT'
  | 'NOTE'
  | 'FOLLOW_UP'
  | 'PROPERTY_SEARCH'
  | 'APPRAISAL_REQUEST';
export type VisitStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'RESCHEDULED';
export type AppraisalOrientation = 'EAST' | 'NORTH' | 'SOUTH' | 'WEST';
export type AppraisalDisposition = 'FRONT' | 'BACK';
export type AppUserRole = 'ADMIN' | 'USER';
export type TeamMembershipRole = 'OWNER' | 'MEMBER';
export type PropertyMapCategory = 'SALE' | 'VISITED';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'DISABLED';
export type AccountStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type PortalProviderKey = 'ARGENPROP' | 'ZONAPROP' | 'MERCADOLIBRE' | 'MOCK';
export type ExternalListingStatus = 'ACTIVE' | 'MISSING' | 'DUPLICATED' | 'ARCHIVED';
export type PortalSearchRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface SessionTeam {
  id: number;
  name: string;
  membershipRole: TeamMembershipRole;
}

export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Array<{ id: number; role: Role }>;
  searchRequirements?: SearchRequirement[];
  propertyCandidates?: BuyerPropertyCandidate[];
  appraisalRequests?: AppraisalRequest[];
  activities?: Activity[];
  visits?: Visit[];
  ownedProperties?: Property[];
}

export interface PropertyPhoto {
  id?: number;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  orderIndex: number;
}

export interface Property {
  id: number;
  title: string;
  description: string | null;
  address: string;
  city: string;
  neighborhood: string | null;
  operationType: OperationType;
  propertyType: PropertyType;
  status: PropertyStatus;
  price: number | null;
  currency: CurrencyType;
  expenses: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  coveredArea: number | null;
  semiCoveredArea: number | null;
  uncoveredArea: number | null;
  totalArea: number | null;
  weightedArea: number | null;
  floor: number | null;
  amenities: string | null;
  orientation: AppraisalOrientation | null;
  disposition: AppraisalDisposition | null;
  ageYears: number | null;
  hasGarage: boolean | null;
  ownerContactId: number | null;
  appraisalRequestId: number | null;
  privateNotes: string | null;
  createdAt: string;
  updatedAt: string;
  photos: PropertyPhoto[];
  ownerContact?: Contact | null;
  appraisalRequest?: AppraisalRequest | null;
  activities?: Activity[];
  visits?: Visit[];
}

export interface SearchRequirement {
  id: number;
  contactId: number;
  propertyId?: number | null;
  operationType: OperationType;
  propertyType: PropertyType;
  neighborhoods: string[];
  minPrice: number | null;
  maxPrice: number | null;
  currency: CurrencyType;
  minRooms: number | null;
  minBedrooms: number | null;
  minBathrooms: number | null;
  needsParking: boolean;
  creditEligible: boolean;
  professionalUse: boolean;
  accessible: boolean;
  bright: boolean;
  amenities: SearchRequirementAmenity[];
  roomTypes: SearchRequirementRoomType[];
  ageRange: SearchRequirementAgeRange | null;
  notes: string | null;
  status: SearchRequirementStatus;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  property?: Property | null;
}

export interface PortalSourceConfig {
  id: number;
  teamId: number;
  providerKey: PortalProviderKey;
  enabled: boolean;
  priority: number;
  baseUrl: string | null;
  rateLimitPerHour: number | null;
  maxResultsPerRun: number | null;
  requiresAuth: boolean;
  authConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalListing {
  id: number;
  teamId: number;
  providerKey: PortalProviderKey;
  externalListingId: string | null;
  canonicalUrl: string;
  urlHash: string;
  title: string;
  description: string | null;
  operationType: OperationType;
  propertyType: PropertyType;
  price: number | null;
  currency: CurrencyType;
  expenses: number | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  hasGarage: boolean | null;
  coveredArea: number | null;
  totalArea: number | null;
  sourcePublishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  rawPayload: Record<string, unknown> | null;
  status: ExternalListingStatus;
}

export interface RequirementPortalMatch {
  id: number;
  teamId: number;
  searchRequirementId: number;
  externalListingId: number;
  score: number;
  scoreBreakdown: Record<string, number>;
  matchReasons: string[];
  dismissed: boolean;
  dismissedReason: string | null;
  dismissedAt: string | null;
  buyerPropertyCandidateId: number | null;
  convertedToCandidateAt: string | null;
  activityId: number | null;
  createdActivityAt: string | null;
  lastEvaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  externalListing: ExternalListing;
}

export interface PortalSearchRun {
  id: number;
  teamId: number;
  providerKey: PortalProviderKey;
  searchRequirementId: number;
  status: PortalSearchRunStatus;
  startedAt: string;
  finishedAt: string | null;
  fetchedCount: number;
  normalizedCount: number;
  matchedCount: number;
  errorMessage: string | null;
  requestSnapshot: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerPropertyCandidate {
  id: number;
  contactId: number;
  searchRequirementId: number | null;
  portal: string;
  url: string;
  title: string;
  internalNotes: string | null;
  shareComments: string | null;
  shareStatus: BuyerPropertyShareStatus;
  sharedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  searchRequirement?: SearchRequirement | null;
}

export interface Activity {
  id: number;
  contactId: number | null;
  propertyId: number | null;
  appraisalRequestId: number | null;
  activityType: ActivityType;
  title: string;
  description: string | null;
  externalUrl: string | null;
  externalPreviewImageUrl: string | null;
  externalPreviewTitle: string | null;
  externalPreviewDescription: string | null;
  externalPreviewDomain: string | null;
  externalPreviewFetchedAt: string | null;
  whatsappComment: string | null;
  whatsappSharedAt: string | null;
  propertySearchLiked: boolean | null;
  activityDate: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  contact?: Contact | null;
  property?: Property | null;
  appraisalRequest?: AppraisalRequest | null;
}

export interface AppraisalRequest {
  id: number;
  contactId: number;
  publicToken: string;
  expiresAt: string;
  submittedAt: string | null;
  propertyAddress: string | null;
  city: string | null;
  neighborhood: string | null;
  propertyType: PropertyType | null;
  operationType: OperationType | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  expenses: number | null;
  floor: number | null;
  amenities: string | null;
  orientation: AppraisalOrientation | null;
  disposition: AppraisalDisposition | null;
  ageYears: number | null;
  coveredArea: number | null;
  semiCoveredArea: number | null;
  uncoveredArea: number | null;
  totalArea: number | null;
  weightedArea: number | null;
  hasGarage: boolean | null;
  conditionNotes: string | null;
  valuationReason: string | null;
  availabilityNotes: string | null;
  additionalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  properties?: Property[];
}

export interface PublicAppraisalRequest extends Omit<AppraisalRequest, 'contactId' | 'publicToken' | 'createdAt' | 'updatedAt' | 'contact'> {
  contactDisplayName: string;
  isAvailable: boolean;
}

export interface Visit {
  id: number;
  propertyId: number;
  contactId: number;
  scheduledAt: string;
  status: VisitStatus;
  notes: string | null;
  googleEventId?: string | null;
  googleSyncStatus?: string;
  lastSyncedAt?: string | null;
  googleSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  property?: Property;
}

export interface PropertyMapItem {
  propertyId: number;
  title: string;
  address: string;
  city: string;
  neighborhood: string | null;
  operationType: OperationType;
  propertyType: string;
  status: string;
  price: number | null;
  currency: string;
  categories: PropertyMapCategory[];
  visitCount: number;
  lastVisitedAt: string | null;
}

export interface DashboardData {
  followUpsDueToday: Activity[];
  overdueFollowUps: Activity[];
  visitsToday: Visit[];
  activePropertiesCount: number;
  activeSearchRequirementsCount: number;
  pendingBuyerPropertySharesCount: number;
  pendingBuyerPropertyShares: Activity[];
  requirementPipelineGroups: DashboardRequirementPipelineGroup[];
}

export interface DashboardRequirementPipelineStep {
  key:
    | 'CONTACT_LINKED'
    | 'CRITERIA_DEFINED'
    | 'PROPERTIES_SHARED'
    | 'PROPERTY_LINKED'
    | 'APPRAISAL_REQUEST_SENT'
    | 'APPRAISAL_REQUEST_COMPLETED';
  completed: boolean;
}

export interface DashboardRequirementPipelineItem {
  requirementId: number;
  contactId: number;
  contactDisplayName: string;
  operationType: OperationType;
  propertyType: PropertyType;
  status: SearchRequirementStatus;
  propertyId: number | null;
  propertyTitle: string | null;
  completedStepsCount: number;
  totalStepsCount: number;
  steps: DashboardRequirementPipelineStep[];
}

export interface DashboardRequirementPipelineGroup {
  operationType: OperationType;
  total: number;
  fullyCompleted: number;
  items: DashboardRequirementPipelineItem[];
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    appRole: AppUserRole;
    backofficeAccess: boolean;
    status: UserStatus;
    activeTeamId: number | null;
    activeTeamName: string | null;
    googleCalendarConnected: boolean;
    teams: SessionTeam[];
  };
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  appRole: AppUserRole;
  backofficeAccess: boolean;
  status: UserStatus;
  activeTeamId: number | null;
  activeTeamName: string | null;
  googleCalendarConnected: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  memberships: SessionTeam[];
}

export interface TeamSummary {
  id: number;
  name: string;
  memberCount: number;
  createdAt: string;
}

export interface BackofficeOverview {
  accounts: {
    total: number;
    active: number;
    trial: number;
    pastDue: number;
    suspended: number;
    cancelled: number;
  };
  users: {
    total: number;
    active: number;
    pending: number;
    disabled: number;
  };
  successfulLogins: {
    last7Days: number;
    last30Days: number;
  };
}

export interface BackofficeAccount {
  id: number;
  name: string;
  status: AccountStatus;
  planName: string | null;
  trialEndsAt: string | null;
  paidUntil: string | null;
  maxUsers: number | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  memberCount: number;
  activeUsersCount: number;
  pendingUsersCount: number;
  disabledUsersCount: number;
  lastLoginAt: string | null;
  whatsappEnabled: boolean;
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappBusinessNumber: string | null;
  whatsappDisplayName: string | null;
  whatsappAccessToken: string | null;
  whatsappTemplateLanguageCode: string | null;
  whatsappPropertySearchTemplateName: string | null;
  whatsappPropertySearchImageTemplateName: string | null;
  whatsappAppraisalTemplateName: string | null;
  whatsappQualityRating: string | null;
  whatsappConnectedAt: string | null;
}
