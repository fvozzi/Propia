import type {
  SearchRequirement,
  SearchRequirementAgeRange,
  SearchRequirementAmenity,
  SearchRequirementRoomType,
} from '../types';

const amenityLabelPath: Record<SearchRequirementAmenity, string> = {
  POOL: 'requirements.optionPool',
  GRILL: 'requirements.optionGrill',
  DOORMAN: 'requirements.optionDoorman',
  SECURITY: 'requirements.optionSecurity',
  ELEVATOR: 'requirements.optionElevator',
  SPORTS_COURT: 'requirements.optionSportsCourt',
  GYM: 'requirements.optionGym',
  LAUNDRY: 'requirements.optionLaundry',
  QUINCHO: 'requirements.optionQuincho',
  SOLARIUM: 'requirements.optionSolarium',
  SUM: 'requirements.optionSum',
};

const roomTypeLabelPath: Record<SearchRequirementRoomType, string> = {
  KITCHEN: 'requirements.optionKitchen',
  LIVING_DINING: 'requirements.optionLivingDining',
  BALCONY: 'requirements.optionBalcony',
  LAUNDRY_ROOM: 'requirements.optionLaundryRoom',
  TOILET: 'requirements.optionToilet',
  SERVICE_ROOM: 'requirements.optionServiceRoom',
  SUITE_BEDROOM: 'requirements.optionSuiteBedroom',
  GARDEN: 'requirements.optionGarden',
  PATIO: 'requirements.optionPatio',
  TERRACE: 'requirements.optionTerrace',
  DRESSING_ROOM: 'requirements.optionDressingRoom',
};

const ageRangeLabelPath: Record<SearchRequirementAgeRange, string> = {
  UNDER_CONSTRUCTION: 'requirements.ageUnderConstruction',
  BRAND_NEW: 'requirements.ageBrandNew',
  UP_TO_5_YEARS: 'requirements.ageUpTo5Years',
  UP_TO_10_YEARS: 'requirements.ageUpTo10Years',
  UP_TO_20_YEARS: 'requirements.ageUpTo20Years',
  UP_TO_50_YEARS: 'requirements.ageUpTo50Years',
  OVER_50_YEARS: 'requirements.ageOver50Years',
};

type RequirementSummaryFields = Pick<
  SearchRequirement,
  | 'minRooms'
  | 'minBedrooms'
  | 'minBathrooms'
  | 'needsParking'
  | 'creditEligible'
  | 'professionalUse'
  | 'accessible'
  | 'bright'
  | 'amenities'
  | 'roomTypes'
  | 'ageRange'
>;

export function translateRequirementAmenity(value: string, t: (path: string) => string) {
  return t(amenityLabelPath[value as SearchRequirementAmenity] ?? value);
}

export function translateRequirementRoomType(value: string, t: (path: string) => string) {
  return t(roomTypeLabelPath[value as SearchRequirementRoomType] ?? value);
}

export function translateRequirementAgeRange(value: string, t: (path: string) => string) {
  return t(ageRangeLabelPath[value as SearchRequirementAgeRange] ?? value);
}

export function formatRequirementDetails(
  requirement: RequirementSummaryFields,
  t: (path: string) => string,
) {
  const details: string[] = [];

  if (requirement.minRooms) details.push(`${t('requirements.minRooms')}: ${requirement.minRooms}`);
  if (requirement.minBedrooms) details.push(`${t('requirements.minBedrooms')}: ${requirement.minBedrooms}`);
  if (requirement.minBathrooms) details.push(`${t('requirements.minBathrooms')}: ${requirement.minBathrooms}`);
  if (requirement.needsParking) details.push(t('requirements.needsParking'));
  if (requirement.creditEligible) details.push(t('requirements.creditEligible'));
  if (requirement.professionalUse) details.push(t('requirements.professionalUse'));
  if (requirement.accessible) details.push(t('requirements.accessible'));
  if (requirement.bright) details.push(t('requirements.bright'));
  if (requirement.amenities.length) {
    details.push(
      `${t('requirements.amenities')}: ${requirement.amenities
        .map((value) => translateRequirementAmenity(value, t))
        .join(', ')}`,
    );
  }
  if (requirement.roomTypes.length) {
    details.push(
      `${t('requirements.roomTypesTitle')}: ${requirement.roomTypes
        .map((value) => translateRequirementRoomType(value, t))
        .join(', ')}`,
    );
  }
  if (requirement.ageRange) {
    details.push(`${t('requirements.ageRangeTitle')}: ${translateRequirementAgeRange(requirement.ageRange, t)}`);
  }

  return details.join(' · ') || t('common.noData');
}
