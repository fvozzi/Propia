import type { Activity, Contact } from '../types';

const WHATSAPP_SHARE_TARGET = 'propia-whatsapp-share';
let whatsappShareWindow: Window | null = null;

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const normalizedPhone = getContactWhatsappPhone(contact).replace(/\D/g, '');
  const params = new URLSearchParams({
    text: message,
  });

  if (normalizedPhone) {
    params.set('phone', normalizedPhone);
  }

  params.set('type', 'phone_number');
  params.set('app_absent', '0');

  return `https://web.whatsapp.com/send?${params.toString()}`;
}

export function openWhatsAppShareWindow() {
  if (whatsappShareWindow && !whatsappShareWindow.closed) {
    return whatsappShareWindow;
  }

  return null;
}

export function navigateWhatsAppShareWindow(shareWindow: Window | null, whatsappUrl: string) {
  const targetWindow = shareWindow && !shareWindow.closed ? shareWindow : whatsappShareWindow;

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.replace(whatsappUrl);
    targetWindow.focus();
    whatsappShareWindow = targetWindow;
    return;
  }

  const nextWindow = window.open(whatsappUrl, WHATSAPP_SHARE_TARGET);
  whatsappShareWindow = nextWindow;
  nextWindow?.focus();
}
