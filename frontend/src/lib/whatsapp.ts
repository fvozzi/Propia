import type { Activity, Contact } from '../types';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const normalizedPhone = getContactWhatsappPhone(contact).replace(/\D/g, '');
  const params = new URLSearchParams({ text: message });
  const baseUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}` : 'https://wa.me/';
  return `${baseUrl}?${params.toString()}`;
}

export function openWhatsAppShareUrl(url: string) {
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    window.location.href = url;
  }
}
