import { randomBytes } from 'crypto';
import { AppraisalDisposition, AppraisalOrientation, OperationType, PropertyType } from '../common/enums';

export type AppraisalDraft = {
  propertyAddress?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  propertyType?: PropertyType | null;
  operationType?: OperationType | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  expenses?: number | null;
  floor?: number | null;
  amenities?: string | null;
  orientation?: AppraisalOrientation | null;
  disposition?: AppraisalDisposition | null;
  ageYears?: number | null;
  coveredArea?: number | null;
  semiCoveredArea?: number | null;
  uncoveredArea?: number | null;
  totalArea?: number | null;
  weightedArea?: number | null;
  hasGarage?: boolean | null;
  conditionNotes?: string | null;
  valuationReason?: string | null;
  availabilityNotes?: string | null;
  additionalNotes?: string | null;
};

export function calculateAppraisalAreas(draft: Pick<AppraisalDraft, 'coveredArea' | 'semiCoveredArea' | 'uncoveredArea'>) {
  const coveredArea = draft.coveredArea ?? 0;
  const semiCoveredArea = draft.semiCoveredArea ?? 0;
  const uncoveredArea = draft.uncoveredArea ?? 0;
  const hasAnyArea =
    (draft.coveredArea !== null && draft.coveredArea !== undefined) ||
    (draft.semiCoveredArea !== null && draft.semiCoveredArea !== undefined) ||
    (draft.uncoveredArea !== null && draft.uncoveredArea !== undefined);

  if (!hasAnyArea) {
    return {
      totalArea: null,
      weightedArea: null,
    };
  }

  return {
    totalArea: coveredArea + semiCoveredArea + uncoveredArea,
    weightedArea: coveredArea + (semiCoveredArea + uncoveredArea) / 2,
  };
}

export function createPublicFormToken() {
  return randomBytes(24).toString('hex');
}

export function createAppraisalRequestExpiration(now = new Date()) {
  return new Date(now.getTime() + 48 * 60 * 60 * 1000);
}

export function buildAppraisalRequestActivityTitle(propertyAddress?: string | null) {
  return propertyAddress?.trim()
    ? `Solicitud de tasacion · ${propertyAddress.trim()}`
    : 'Solicitud de tasacion';
}

export function isAppraisalRequestAvailable(
  expiresAt: Date | string,
  submittedAt?: Date | string | null,
  now = new Date(),
) {
  if (submittedAt) return false;
  return new Date(expiresAt).getTime() > now.getTime();
}

export function summarizeAppraisalAnswers(draft: AppraisalDraft) {
  const lines = [
    draft.propertyAddress ? `Direccion: ${draft.propertyAddress}` : null,
    draft.city ? `Ciudad: ${draft.city}` : null,
    draft.neighborhood ? `Barrio: ${draft.neighborhood}` : null,
    draft.propertyType ? `Tipo: ${draft.propertyType}` : null,
    draft.operationType ? `Operacion: ${draft.operationType}` : null,
    draft.rooms ? `Ambientes: ${draft.rooms}` : null,
    draft.bedrooms ? `Dormitorios: ${draft.bedrooms}` : null,
    draft.bathrooms ? `Banos: ${draft.bathrooms}` : null,
    draft.expenses ? `Expensas ARS: ${draft.expenses}` : null,
    draft.floor ? `Piso: ${draft.floor}` : null,
    draft.amenities ? `Amenities: ${draft.amenities}` : null,
    draft.orientation ? `Orientacion: ${draft.orientation}` : null,
    draft.disposition ? `Disposicion: ${draft.disposition}` : null,
    draft.ageYears ? `Antiguedad: ${draft.ageYears}` : null,
    draft.coveredArea ? `Superficie cubierta: ${draft.coveredArea}` : null,
    draft.semiCoveredArea ? `Superficie semicubierta: ${draft.semiCoveredArea}` : null,
    draft.uncoveredArea ? `Superficie descubierta: ${draft.uncoveredArea}` : null,
    draft.totalArea ? `Superficie total: ${draft.totalArea}` : null,
    draft.weightedArea ? `Superficie ponderada: ${draft.weightedArea}` : null,
    draft.hasGarage === null || draft.hasGarage === undefined ? null : `Cochera: ${draft.hasGarage ? 'Si' : 'No'}`,
    draft.conditionNotes ? `Estado y mejoras: ${draft.conditionNotes}` : null,
    draft.valuationReason ? `Motivo de tasacion: ${draft.valuationReason}` : null,
    draft.availabilityNotes ? `Disponibilidad: ${draft.availabilityNotes}` : null,
    draft.additionalNotes ? `Notas adicionales: ${draft.additionalNotes}` : null,
  ];

  return lines.filter(Boolean).join('\n');
}
