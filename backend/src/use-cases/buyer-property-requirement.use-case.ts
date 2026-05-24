export const buyerPropertyRequirementAmenityOptions = [
  'POOL',
  'GRILL',
  'DOORMAN',
  'SECURITY',
  'ELEVATOR',
  'SPORTS_COURT',
  'GYM',
  'LAUNDRY',
  'QUINCHO',
  'SOLARIUM',
  'SUM',
] as const;

export const buyerPropertyRequirementRoomTypeOptions = [
  'KITCHEN',
  'LIVING_DINING',
  'BALCONY',
  'LAUNDRY_ROOM',
  'TOILET',
  'SERVICE_ROOM',
  'SUITE_BEDROOM',
  'GARDEN',
  'PATIO',
  'TERRACE',
  'DRESSING_ROOM',
] as const;

export const buyerPropertyRequirementAgeRangeOptions = [
  'UNDER_CONSTRUCTION',
  'BRAND_NEW',
  'UP_TO_5_YEARS',
  'UP_TO_10_YEARS',
  'UP_TO_20_YEARS',
  'UP_TO_50_YEARS',
  'OVER_50_YEARS',
] as const;

export type BuyerPropertyRequirementAmenity =
  (typeof buyerPropertyRequirementAmenityOptions)[number];
export type BuyerPropertyRequirementRoomType =
  (typeof buyerPropertyRequirementRoomTypeOptions)[number];
export type BuyerPropertyRequirementAgeRange =
  (typeof buyerPropertyRequirementAgeRangeOptions)[number];

export type BuyerPropertyRequirementCriteria = {
  operationType: 'BUY';
  propertyTypes: string[];
  neighborhoods: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: 'USD' | 'ARS';
  roomsMin: number | null;
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  needsParking: boolean;
  creditEligible: boolean;
  professionalUse: boolean;
  accessible: boolean;
  bright: boolean;
  amenities: BuyerPropertyRequirementAmenity[];
  roomTypes: BuyerPropertyRequirementRoomType[];
  ageRange: BuyerPropertyRequirementAgeRange | null;
  notes: string | null;
};

type BuyerPropertyRequirementInput = {
  propertyTypes?: string[];
  neighborhoods?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: 'USD' | 'ARS';
  roomsMin?: number | null;
  bedroomsMin?: number | null;
  bathroomsMin?: number | null;
  needsParking?: boolean;
  creditEligible?: boolean;
  professionalUse?: boolean;
  accessible?: boolean;
  bright?: boolean;
  amenities?: BuyerPropertyRequirementAmenity[];
  roomTypes?: BuyerPropertyRequirementRoomType[];
  ageRange?: BuyerPropertyRequirementAgeRange | null;
  notes?: string | null;
};

function normalizeTagList(values?: readonly string[]) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeNotes(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeSingleValue<T extends string>(value?: T | null) {
  if (!value) return null;
  const trimmed = value.trim() as T;
  return trimmed ? trimmed : null;
}

export function createBuyerPropertyRequirementCriteria(
  input: BuyerPropertyRequirementInput,
): BuyerPropertyRequirementCriteria {
  return {
    operationType: 'BUY',
    propertyTypes: normalizeTagList(input.propertyTypes),
    neighborhoods: normalizeTagList(input.neighborhoods),
    priceMin: input.priceMin ?? null,
    priceMax: input.priceMax ?? null,
    currency: input.currency ?? 'USD',
    roomsMin: input.roomsMin ?? null,
    bedroomsMin: input.bedroomsMin ?? null,
    bathroomsMin: input.bathroomsMin ?? null,
    needsParking: Boolean(input.needsParking),
    creditEligible: Boolean(input.creditEligible),
    professionalUse: Boolean(input.professionalUse),
    accessible: Boolean(input.accessible),
    bright: Boolean(input.bright),
    amenities: normalizeTagList(input.amenities) as BuyerPropertyRequirementAmenity[],
    roomTypes: normalizeTagList(input.roomTypes) as BuyerPropertyRequirementRoomType[],
    ageRange: normalizeSingleValue(input.ageRange),
    notes: normalizeNotes(input.notes),
  };
}

export function summarizeBuyerPropertyRequirement(criteria: BuyerPropertyRequirementCriteria) {
  const summary: string[] = [];

  if (criteria.propertyTypes.length) {
    summary.push(`Tipos: ${criteria.propertyTypes.join(', ')}`);
  }

  if (criteria.neighborhoods.length) {
    summary.push(`Zonas: ${criteria.neighborhoods.join(', ')}`);
  }

  if (criteria.roomsMin) {
    summary.push(`Ambientes desde ${criteria.roomsMin}`);
  }

  if (criteria.needsParking) {
    summary.push('Con cochera');
  }

  if (criteria.creditEligible) {
    summary.push('Apto credito');
  }

  if (criteria.professionalUse) {
    summary.push('Apto profesional');
  }

  if (criteria.accessible) {
    summary.push('Acceso movilidad reducida');
  }

  if (criteria.bright) {
    summary.push('Luminoso');
  }

  if (criteria.amenities.length) {
    summary.push(`Comodidades: ${criteria.amenities.join(', ')}`);
  }

  if (criteria.roomTypes.length) {
    summary.push(`Ambientes: ${criteria.roomTypes.join(', ')}`);
  }

  if (criteria.ageRange) {
    summary.push(`Antiguedad: ${criteria.ageRange}`);
  }

  return summary;
}
