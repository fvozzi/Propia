import type { Activity, Contact, Property, Visit } from '../types';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;
type ShareableVisit = Pick<Visit, 'scheduledAt' | 'status' | 'notes' | 'externalUrl'> & {
  property?: Pick<Property, 'address' | 'city' | 'neighborhood'> | null;
};

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function buildVisitWhatsappMessage(visit: ShareableVisit) {
  const statusLine = getVisitWhatsappStatusLine(visit.status);
  const date = new Date(visit.scheduledAt);
  const weekday = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
    .format(date)
    .toUpperCase();
  const calendarDate = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
  const time = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
  const address = [visit.property?.address, visit.property?.neighborhood || visit.property?.city]
    .filter(Boolean)
    .join(', ');

  return [
    statusLine,
    `🗓️ ${weekday} ${calendarDate}`,
    `🕒 ${time} hs`,
    address ? `📍 ${address}` : null,
    visit.notes?.trim() ? visit.notes.trim() : null,
    visit.externalUrl?.trim() ? `🔗 ${visit.externalUrl.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const rawPhone = getContactWhatsappPhone(contact).trim();
  const params = new URLSearchParams({ text: message });
  const mobileTarget = isMobileWhatsAppShareTarget();
  const phoneParam = mobileTarget ? normalizeMobileWhatsappPhone(rawPhone) : rawPhone;
  if (mobileTarget && rawPhone && !phoneParam) {
    throw new Error(
      'El WhatsApp del contacto debe incluir un numero argentino valido con codigo de area para abrir la app en Android.',
    );
  }
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

function getVisitWhatsappStatusLine(status: Visit['status']) {
  switch (status) {
    case 'DONE':
      return '✅ VISITA REALIZADA';
    case 'CANCELLED':
      return '❌ VISITA CANCELADA';
    case 'RESCHEDULED':
      return '🔄 VISITA REPROGRAMADA';
    case 'SCHEDULED':
    default:
      return '✅ VISITA CONFIRMADA';
  }
}

function normalizeMobileWhatsappPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('549') && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }

  if (digits.startsWith('54') && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }

  const localDigits = digits.startsWith('0') ? digits.slice(1) : digits;
  if (localDigits.length >= 10 && localDigits.length <= 11) {
    return `549${localDigits}`;
  }

  return '';
}
