import { PropertyType } from '../common/enums';

type RequirementInput = {
  neighborhoods: string[];
  minPrice: number | null;
  maxPrice: number | null;
  propertyType: PropertyType;
  minRooms: number | null;
  minBedrooms: number | null;
  minBathrooms: number | null;
  needsParking: boolean;
};

type ListingInput = {
  title: string;
  neighborhood: string | null;
  price: number | null;
  propertyType: PropertyType;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  hasGarage: boolean | null;
};

export function scoreExternalListingForRequirement(
  requirement: RequirementInput,
  listing: ListingInput,
) {
  let score = 0;
  const breakdown: Record<string, number> = {};
  const matchReasons: string[] = [];

  const neighborhoodMatched =
    requirement.neighborhoods.length === 0 ||
    requirement.neighborhoods.some(
      (neighborhood) =>
        normalizeText(neighborhood) === normalizeText(listing.neighborhood ?? ''),
    );

  if (neighborhoodMatched) {
    score += 25;
    breakdown.neighborhood = 25;
    if (listing.neighborhood) {
      matchReasons.push(`Cumple barrio: ${listing.neighborhood}`);
    }
  }

  if (
    listing.price !== null &&
    isWithinRange(listing.price, requirement.minPrice, requirement.maxPrice)
  ) {
    score += 20;
    breakdown.price = 20;
    matchReasons.push('Entra en presupuesto');
  } else if (
    listing.price !== null &&
    requirement.maxPrice !== null &&
    listing.price > requirement.maxPrice
  ) {
    score -= 20;
    breakdown.price = -20;
    matchReasons.push('Supera presupuesto maximo');
  }

  if (listing.propertyType === requirement.propertyType) {
    score += 15;
    breakdown.propertyType = 15;
    matchReasons.push('Coincide tipo de propiedad');
  }

  if (meetsMinimum(listing.rooms, requirement.minRooms)) {
    score += 10;
    breakdown.rooms = 10;
    if (requirement.minRooms !== null) {
      matchReasons.push(`Cumple ambientes minimos: ${requirement.minRooms}`);
    }
  }

  if (meetsMinimum(listing.bedrooms, requirement.minBedrooms)) {
    score += 10;
    breakdown.bedrooms = 10;
    if (requirement.minBedrooms !== null) {
      matchReasons.push(`Cumple dormitorios minimos: ${requirement.minBedrooms}`);
    }
  }

  if (meetsMinimum(listing.bathrooms, requirement.minBathrooms)) {
    score += 10;
    breakdown.bathrooms = 10;
    if (requirement.minBathrooms !== null) {
      matchReasons.push(`Cumple banos minimos: ${requirement.minBathrooms}`);
    }
  }

  if (!requirement.needsParking) {
    score += 10;
    breakdown.parking = 10;
  } else if (listing.hasGarage) {
    score += 10;
    breakdown.parking = 10;
    matchReasons.push('Cumple cochera requerida');
  } else {
    score -= 15;
    breakdown.parking = -15;
    matchReasons.push('No cumple cochera requerida');
  }

  return {
    score,
    scoreBreakdown: breakdown,
    matchReasons,
  };
}

export function areExternalListingsLikelyDuplicates(
  left: {
    canonicalUrl: string;
    providerKey: string;
    externalListingId: string | null;
    title: string;
    neighborhood: string | null;
    price: number | null;
    rooms: number | null;
  },
  right: {
    canonicalUrl: string;
    providerKey: string;
    externalListingId: string | null;
    title: string;
    neighborhood: string | null;
    price: number | null;
    rooms: number | null;
  },
) {
  if (normalizeUrl(left.canonicalUrl) === normalizeUrl(right.canonicalUrl)) {
    return true;
  }

  if (
    left.externalListingId &&
    right.externalListingId &&
    left.providerKey === right.providerKey &&
    left.externalListingId === right.externalListingId
  ) {
    return true;
  }

  return (
    normalizeText(left.title) === normalizeText(right.title) &&
    normalizeText(left.neighborhood ?? '') === normalizeText(right.neighborhood ?? '') &&
    left.price === right.price &&
    left.rooms === right.rooms
  );
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function meetsMinimum(value: number | null, minimum: number | null) {
  if (minimum === null) {
    return true;
  }

  return value !== null && value >= minimum;
}

function isWithinRange(value: number, min: number | null, max: number | null) {
  if (min !== null && value < min) {
    return false;
  }

  if (max !== null && value > max) {
    return false;
  }

  return true;
}

function normalizeUrl(value: string) {
  return value.trim().toLowerCase().replace(/\/+$/, '');
}
