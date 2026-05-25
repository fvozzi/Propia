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
  activeTeamId: number;
  activeTeamName: string | null;
  googleCalendarConnected: boolean;
  createdAt: string;
  memberships: SessionTeam[];
}

export interface TeamSummary {
  id: number;
  name: string;
  memberCount: number;
  createdAt: string;
}
