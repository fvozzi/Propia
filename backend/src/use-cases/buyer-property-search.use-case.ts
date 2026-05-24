export type BuyerPropertyShareStatus = 'PENDING_WHATSAPP' | 'SHARED_WHATSAPP';

export type BuyerPropertyCandidate = {
  contactId: number;
  portal: string;
  url: string;
  title: string;
  internalNotes: string | null;
  shareComments: string | null;
  shareStatus: BuyerPropertyShareStatus;
  createdAt: string;
  sharedAt: string | null;
};

type RegisterBuyerPropertyCandidateInput = {
  contactId: number;
  portal: string;
  url: string;
  title: string;
  internalNotes?: string | null;
  createdAt: string;
};

type ShareBuyerPropertyCandidateInput = {
  comments?: string | null;
  sharedAt: string;
};

function normalizeOptionalText(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function registerBuyerPropertyCandidate(
  input: RegisterBuyerPropertyCandidateInput,
): BuyerPropertyCandidate {
  return {
    contactId: input.contactId,
    portal: input.portal.trim(),
    url: input.url.trim(),
    title: input.title.trim(),
    internalNotes: normalizeOptionalText(input.internalNotes),
    shareComments: null,
    shareStatus: 'PENDING_WHATSAPP',
    createdAt: input.createdAt,
    sharedAt: null,
  };
}

export function shareBuyerPropertyCandidate(
  candidate: BuyerPropertyCandidate,
  input: ShareBuyerPropertyCandidateInput,
): BuyerPropertyCandidate {
  return {
    ...candidate,
    shareComments: normalizeOptionalText(input.comments),
    shareStatus: 'SHARED_WHATSAPP',
    sharedAt: input.sharedAt,
  };
}

export function buildBuyerPropertyWhatsAppMessage(candidate: BuyerPropertyCandidate) {
  return [candidate.shareComments, candidate.url].filter(Boolean).join('\n\n');
}

export function countPendingBuyerPropertyShares(candidates: BuyerPropertyCandidate[]) {
  return candidates.filter((candidate) => candidate.shareStatus === 'PENDING_WHATSAPP').length;
}
