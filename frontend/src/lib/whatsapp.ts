import type {
  Activity,
  Contact,
  CurrencyType,
  OperationType,
  Property,
  PropertyType,
  ReservationActivityData,
  Visit,
} from '../types';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;
type ShareableVisit = Pick<
  Visit,
  | 'scheduledAt'
  | 'status'
  | 'notes'
  | 'externalUrl'
  | 'externalPropertyTitle'
  | 'externalPropertyAddress'
> & {
  property?: Pick<Property, 'address' | 'city' | 'neighborhood' | 'title'> | null;
};
type ShareableVisitActivity = Pick<
  Activity,
  'activityDate' | 'description' | 'externalUrl' | 'title'
> & {
  property?: Pick<Property, 'address' | 'city' | 'neighborhood' | 'title'> | null;
};
type ShareableCandidateProperty = Pick<
  Property,
  'address' | 'city' | 'neighborhood' | 'title'
>;

export function buildPropertySearchMessage(
  activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>,
) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function buildVisitWhatsappMessage(
  visit: ShareableVisit | ShareableVisitActivity,
) {
  const scheduledAt = 'scheduledAt' in visit ? visit.scheduledAt : visit.activityDate;
  const statusLine =
    'status' in visit ? getVisitWhatsappStatusLine(visit.status) : 'VISITA CONFIRMADA';
  const notes = 'notes' in visit ? visit.notes : visit.description;
  const fallbackTitle =
    'externalPropertyTitle' in visit
      ? visit.externalPropertyTitle?.trim() || null
      : 'title' in visit
        ? visit.title?.trim() || null
        : null;
  const date = new Date(scheduledAt);
  const weekday = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
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
  const address =
    [visit.property?.address, visit.property?.neighborhood || visit.property?.city]
      .filter(Boolean)
      .join(', ') ||
    ('externalPropertyAddress' in visit ? visit.externalPropertyAddress?.trim() : null) ||
    fallbackTitle ||
    '';

  return [
    statusLine,
    `Fecha: ${weekday} ${calendarDate}`,
    `Hora: ${time} hs`,
    address ? `Propiedad: ${address}` : null,
    notes?.trim() ? `Notas: ${notes.trim()}` : null,
    visit.externalUrl?.trim() ? `URL: ${visit.externalUrl.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildBirthdayWhatsappMessage(contactName: string) {
  const trimmedName = contactName.trim();
  const greetingTarget = trimmedName ? ` ${trimmedName}` : '';

  return `Feliz cumpleanos${greetingTarget}! Espero que tengas un gran dia.`;
}

export function buildBuyerSearchAgentMessage(input: {
  agentName?: string | null;
  teamName?: string | null;
  candidateTitle: string;
  candidateUrl?: string | null;
  property?: ShareableCandidateProperty | null;
}) {
  const introParts = [input.agentName?.trim(), input.teamName?.trim()].filter(Boolean);
  const intro = introParts.length > 0 ? `Hola, soy ${introParts.join(' de ')}.` : 'Hola.';
  const propertyTitle = input.property?.title?.trim() || input.candidateTitle.trim();
  const propertyUrl = input.candidateUrl?.trim() || null;

  return [
    intro,
    'Te escribo por,',
    '',
    `Propiedad: ${propertyTitle}`,
    propertyUrl ? `URL: ${propertyUrl}` : null,
    '',
    'Tengo un comprador interesado, quisiera consultar disponibilidad y posibles horarios para visitarla.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function buildBuyerTourWhatsappMessage(
  buyerName: string,
  candidates: Array<{
    title: string;
    scheduledVisitAt: string;
    property?: ShareableCandidateProperty | null;
  }>,
) {
  const lines = candidates
    .slice()
    .sort(
      (left, right) =>
        new Date(left.scheduledVisitAt).getTime() -
        new Date(right.scheduledVisitAt).getTime(),
    )
    .map((candidate) => {
      const date = new Date(candidate.scheduledVisitAt);
      const dateLabel = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(date);
      const timeLabel = new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(date);
      const place = candidate.property
        ? [candidate.property.address, candidate.property.neighborhood || candidate.property.city]
            .filter(Boolean)
            .join(', ')
        : candidate.title;

      return `${dateLabel} ${timeLabel} hs - ${place}`;
    });

  return [`Hola ${buyerName}, te comparto la recorrida confirmada:`, ...lines].join('\n');
}

export function buildReservationTreasuryWhatsappMessage(
  activity: Pick<Activity, 'externalUrl' | 'description'> & {
    reservationData: ReservationActivityData | null;
    property?: Pick<Property, 'address' | 'neighborhood'> | null;
  },
  fallbackAgentName: string | null,
) {
  const reservation = activity.reservationData;
  if (!reservation) {
    return '';
  }

  const observations =
    reservation.observations?.trim() || activity.description?.trim() || '-';

  return [
    `* Agente: ${reservation.agentName || fallbackAgentName || '-'}`,
    `* Monto operacion: ${formatMoney(
      reservation.operationAmount,
      reservation.operationCurrency,
    )}`,
    `* Direccion: ${reservation.propertyAddress || activity.property?.address || '-'}`,
    `* Barrio: ${reservation.propertyNeighborhood || activity.property?.neighborhood || '-'}`,
    `* Operacion: ${formatOperationType(reservation.operationType)}`,
    `* Puntas: ${formatScalar(reservation.sidesCount)}`,
    `* Porcentaje: ${formatPercent(reservation.commissionPercent)}`,
    `* Cuanto dejaron de reserva: ${formatMoney(
      reservation.reservationAmount,
      reservation.reservationCurrency,
    )}`,
    `* Compartida con Inmobiliaria: ${formatYesNo(reservation.sharedWithRealEstate)}`,
    `* Conformada: ${formatYesNo(reservation.conformed)}`,
    `* Credito: ${formatYesNo(reservation.credit)}`,
    `* Tipo propiedad: ${formatPropertyType(reservation.propertyType)}`,
    `* Reubicacion: ${formatYesNo(reservation.relocation)}`,
    `* Mes estimado de Cierre: ${reservation.estimatedClosingMonth || '-'}`,
    `* Documento reserva: ${activity.externalUrl?.trim() || '-'}`,
    `* Observaciones: ${observations}`,
  ].join('\n');
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

export function buildWhatsAppPickerUrl(message: string) {
  const params = new URLSearchParams({ text: message });
  const mobileTarget = isMobileWhatsAppShareTarget();
  const baseUrl = mobileTarget ? 'whatsapp://send' : 'https://wa.me/';

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
      return 'VISITA REALIZADA';
    case 'CANCELLED':
      return 'VISITA CANCELADA';
    case 'RESCHEDULED':
      return 'VISITA REPROGRAMADA';
    case 'SCHEDULED':
    default:
      return 'VISITA CONFIRMADA';
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

function formatMoney(
  amount: number | null | undefined,
  currency: CurrencyType | null | undefined,
) {
  if (amount === null || amount === undefined) {
    return '-';
  }

  const formattedAmount = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currency === 'ARS' ? '$' : 'U$S'} ${formattedAmount}`;
}

function formatYesNo(value: boolean | null | undefined) {
  if (value === true) return 'Si';
  if (value === false) return 'No';
  return '-';
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '-' : `${value}%`;
}

function formatScalar(value: number | string | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function formatOperationType(value: OperationType | null | undefined) {
  switch (value) {
    case 'SALE':
      return 'Venta';
    case 'BUY':
      return 'Compra';
    case 'RENT':
      return 'Alquiler';
    default:
      return '-';
  }
}

function formatPropertyType(value: PropertyType | null | undefined) {
  switch (value) {
    case 'HOUSE':
      return 'Casa';
    case 'APARTMENT':
      return 'Departamento';
    case 'PH':
      return 'PH';
    case 'LAND':
      return 'Lote';
    case 'OFFICE':
      return 'Oficina';
    case 'COMMERCIAL':
      return 'Local comercial';
    case 'OTHER':
      return 'Otro';
    default:
      return '-';
  }
}
