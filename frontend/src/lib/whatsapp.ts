import type { Activity, Contact } from '../types';

const WHATSAPP_SHARE_TARGET = 'propia-whatsapp-share';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const normalizedPhone = getContactWhatsappPhone(contact).replace(/\D/g, '');
  const base = normalizedPhone ? `https://wa.me/${normalizedPhone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppShareWindow() {
  return window.open('', WHATSAPP_SHARE_TARGET);
}

export function navigateWhatsAppShareWindow(shareWindow: Window | null, whatsappUrl: string) {
  if (shareWindow && !shareWindow.closed) {
    shareWindow.location.href = whatsappUrl;
    shareWindow.focus();
    return;
  }

  const nextWindow = window.open(whatsappUrl, WHATSAPP_SHARE_TARGET);
  nextWindow?.focus();
}
