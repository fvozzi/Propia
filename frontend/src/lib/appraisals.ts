import type { AppraisalRequest, Contact } from '../types';
import {
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  navigateWhatsAppShareWindow,
  openWhatsAppShareWindow,
} from './whatsapp';

export function buildPublicAppraisalUrl(publicToken: string) {
  return `${window.location.origin}/tasacion/${publicToken}`;
}

export function canShareAppraisalByWhatsApp(contact?: Contact | null) {
  return Boolean(contact && getContactWhatsappPhone(contact));
}

export function canShareAppraisalByEmail(contact?: Contact | null) {
  return Boolean(contact?.email);
}

export function buildAppraisalWhatsappUrl(contact: Contact, publicToken: string, message: string) {
  return buildWhatsAppShareUrl(contact, `${message}\n\n${buildPublicAppraisalUrl(publicToken)}`);
}

export function buildAppraisalMailtoUrl(contact: Contact, publicToken: string, subject: string, body: string) {
  const email = contact.email ?? '';
  const fullBody = `${body}\n\n${buildPublicAppraisalUrl(publicToken)}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
}

export function openAppraisalWhatsappShare(contact: Contact, publicToken: string, message: string) {
  const shareWindow = openWhatsAppShareWindow();
  const whatsappUrl = buildAppraisalWhatsappUrl(contact, publicToken, message);
  navigateWhatsAppShareWindow(shareWindow, whatsappUrl);
}

export function getAppraisalRequestStatus(request: Pick<AppraisalRequest, 'expiresAt' | 'submittedAt'>) {
  if (request.submittedAt) return 'COMPLETED' as const;
  if (new Date(request.expiresAt).getTime() <= Date.now()) return 'EXPIRED' as const;
  return 'OPEN' as const;
}

export function isAppraisalRequestAvailable(request: Pick<AppraisalRequest, 'expiresAt' | 'submittedAt'>) {
  return getAppraisalRequestStatus(request) === 'OPEN';
}

export function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateAppraisalAreas(input: {
  coveredArea: number | null;
  semiCoveredArea: number | null;
  uncoveredArea: number | null;
}) {
  const hasAnyArea =
    input.coveredArea !== null ||
    input.semiCoveredArea !== null ||
    input.uncoveredArea !== null;

  if (!hasAnyArea) {
    return {
      totalArea: null,
      weightedArea: null,
    };
  }

  const coveredArea = input.coveredArea ?? 0;
  const semiCoveredArea = input.semiCoveredArea ?? 0;
  const uncoveredArea = input.uncoveredArea ?? 0;

  return {
    totalArea: coveredArea + semiCoveredArea + uncoveredArea,
    weightedArea: coveredArea + (semiCoveredArea + uncoveredArea) / 2,
  };
}
