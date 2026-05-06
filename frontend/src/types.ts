export type Role =
  | 'OWNER'
  | 'BUYER'
  | 'TENANT'
  | 'INVESTOR'
  | 'REFERRER'
  | 'REALTOR'
  | 'NOTARY'
  | 'OTHER';

export type OperationType = 'SALE' | 'RENT';
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
export type ActivityType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'INSTAGRAM'
  | 'MEETING'
  | 'VISIT'
  | 'NOTE'
  | 'FOLLOW_UP';
export type VisitStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'RESCHEDULED';

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
  totalArea: number | null;
  ownerContactId: number | null;
  privateNotes: string | null;
  createdAt: string;
  updatedAt: string;
  photos: PropertyPhoto[];
  ownerContact?: Contact | null;
  activities?: Activity[];
  visits?: Visit[];
}

export interface SearchRequirement {
  id: number;
  contactId: number;
  operationType: OperationType;
  propertyType: PropertyType;
  neighborhoods: string[];
  minPrice: number | null;
  maxPrice: number | null;
  currency: CurrencyType;
  minRooms: number | null;
  minBedrooms: number | null;
  notes: string | null;
  status: SearchRequirementStatus;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
}

export interface Activity {
  id: number;
  contactId: number | null;
  propertyId: number | null;
  activityType: ActivityType;
  title: string;
  description: string | null;
  activityDate: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  contact?: Contact | null;
  property?: Property | null;
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
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    googleCalendarConnected: boolean;
  };
}
