import type { Activity, Contact } from '../types';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const rawPhone = getContactWhatsappPhone(contact).trim();
  const params = new URLSearchParams({ text: message });
  const mobileTarget = isMobileWhatsAppShareTarget();
  const phoneParam = mobileTarget ? normalizeMobileWhatsappPhone(rawPhone) : rawPhone;
  if (phoneParam) {
    params.set('phone', phoneParam);
  }

  const baseUrl = mobileTarget ? 'whatsapp://send' : 'https://api.whatsapp.com/send/';

  return `${baseUrl}?${params.toString()}`;
}

export function openWhatsAppShareUrl(url: string) {
  if (url.startsWith('whatsapp://')) {
    window.location.href = url;
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function isMobileWhatsAppShareTarget() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile|tablet/.test(userAgent);
}

function normalizeMobileWhatsappPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('549')) {
    return digits;
  }

  if (digits.startsWith('54')) {
    return digits;
  }

  const localDigits = digits.startsWith('0') ? digits.slice(1) : digits;
  if (localDigits.length >= 10 && localDigits.length <= 11) {
    return `549${localDigits}`;
  }

  return digits;
}
