import type { Activity, Contact } from '../types';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const normalizedPhone = normalizeWhatsAppSharePhone(getContactWhatsappPhone(contact));
  const params = new URLSearchParams({ text: message });
  if (normalizedPhone) {
    params.set('phone', normalizedPhone);
  }

  const baseUrl = isMobileWhatsAppShareTarget()
    ? 'https://api.whatsapp.com/send/'
    : 'https://web.whatsapp.com/send/';

  return `${baseUrl}?${params.toString()}`;
}

export function openWhatsAppShareUrl(url: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function normalizeWhatsAppSharePhone(rawPhone: string) {
  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return '';
  }

  const compact = trimmed.replace(/[\s()./-]/g, '');

  if (compact.startsWith('+')) {
    return compact.slice(1).replace(/\D/g, '');
  }

  if (compact.startsWith('00')) {
    return compact.slice(2).replace(/\D/g, '');
  }

  const digits = compact.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('54')) {
    return digits;
  }

  const localDigits = digits.startsWith('0') ? digits.slice(1) : digits;
  if (localDigits.length >= 10 && localDigits.length <= 11) {
    return `54${localDigits}`;
  }

  return digits;
}

function isMobileWhatsAppShareTarget() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile|tablet/.test(userAgent);
}
