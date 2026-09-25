import type {
  Activity,
  Contact,
  CurrencyType,
  ExpenseBreakdownActivityData,
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
  | 'colleagueName'
  | 'colleagueWhatsapp'
> & {
  property?: Pick<Property, 'address' | 'city' | 'neighborhood' | 'title'> | null;
  colleagueContact?: Pick<Contact, 'displayName'> | null;
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
  const colleagueName =
    'colleagueName' in visit
      ? visit.colleagueContact?.displayName?.trim() || visit.colleagueName?.trim() || null
      : null;
  const calendarUrl =
    'scheduledAt' in visit
      ? buildVisitRecipientCalendarUrl({
          scheduledAt,
          title: fallbackTitle || visit.property?.title || 'Visita a propiedad',
          address,
          propertyUrl: visit.externalUrl,
          colleagueName,
          notes,
        })
      : null;

  return [
    statusLine,
    `Fecha: ${weekday} ${calendarDate}`,
    `Hora: ${time} hs`,
    colleagueName ? `Colega: ${colleagueName}` : null,
    address ? `Propiedad: ${address}` : null,
    notes?.trim() ? `Notas: ${notes.trim()}` : null,
    visit.externalUrl?.trim() ? `URL: ${visit.externalUrl.trim()}` : null,
    calendarUrl ? `Agendar en mi calendario: ${calendarUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildVisitRecipientCalendarUrl(input: {
  scheduledAt: string;
  title: string;
  address?: string | null;
  propertyUrl?: string | null;
  colleagueName?: string | null;
  notes?: string | null;
}) {
  const start = new Date(input.scheduledAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const details = [
    input.colleagueName?.trim() ? `Colega: ${input.colleagueName.trim()}` : null,
    input.address?.trim() ? `Direccion: ${input.address.trim()}` : null,
    input.propertyUrl?.trim()
      ? `Link de la propiedad: ${input.propertyUrl.trim()}`
      : null,
    input.notes?.trim() ? `Notas: ${input.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Visita a propiedad de colega - ${input.title.trim()}`,
    dates: `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
    details,
    location: input.address?.trim() || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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

export function calculateExpenseBreakdown(
  data: ExpenseBreakdownActivityData,
) {
  const operationAmount = data.operationAmount ?? 0;
  const commissionPercent = data.commissionPercent ?? 0;
  const vatPercent = data.vatPercent ?? 0;
  const commissionAmount = roundMoney(
    operationAmount * (commissionPercent / 100),
  );
  const standardVatAmount = roundMoney(
    commissionAmount * (vatPercent / 100),
  );
  const vatAmount = roundMoney(
    data.invoicedVatAmount ?? standardVatAmount,
  );
  const total = roundMoney(commissionAmount + vatAmount);
  const amountAlreadyPaid = roundMoney(
    data.checklist?.totalDeliveredAmount ?? data.amountAlreadyPaid ?? 0,
  );

  return {
    commissionAmount,
    standardVatAmount,
    vatAmount,
    total,
    amountAlreadyPaid,
    balance: roundMoney(total - amountAlreadyPaid),
  };
}

export function buildExpenseBreakdownWhatsappMessage(
  activity: Pick<Activity, 'expenseBreakdownData' | 'description'> & {
    contact?: Pick<Contact, 'firstName' | 'displayName'> | null;
    property?: Pick<Property, 'address'> | null;
  },
) {
  const data = activity.expenseBreakdownData;
  if (!data) {
    return '';
  }

  const calculation = calculateExpenseBreakdown(data);
  const isSale = data.operationType === 'SALE';
  const operationLabel = isSale ? 'Venta' : 'Compra';
  const contactName =
    activity.contact?.firstName?.trim() ||
    activity.contact?.displayName?.trim() ||
    '';
  const address =
    data.propertyAddress?.trim() || activity.property?.address?.trim() || '-';
  const commissionPercent = formatPercent(data.commissionPercent);
  const vatPercent = formatPercent(data.vatPercent);
  const hasReducedVat =
    data.invoicedVatAmount !== null &&
    data.invoicedVatAmount < calculation.standardVatAmount;
  const checklist = data.checklist;
  const totalDelivered =
    checklist?.totalDeliveredAmount ?? data.amountAlreadyPaid;
  const moneyLines = [
    checklist?.reservationAmount !== null && checklist?.reservationAmount !== undefined
      ? `• Reserva${checklist.reservationDate ? ` (${formatChecklistDate(checklist.reservationDate)})` : ''}: ${formatMoney(
          checklist.reservationAmount,
          data.operationCurrency,
        )}`
      : null,
    checklist?.reservationHeldBy?.trim()
      ? `• La reserva está en: ${checklist.reservationHeldBy.trim()}`
      : null,
    checklist?.reinforcementAmount !== null && checklist?.reinforcementAmount !== undefined
      ? `• Refuerzo${checklist.reinforcementDate ? ` (${formatChecklistDate(checklist.reinforcementDate)})` : ''}: ${formatMoney(
          checklist.reinforcementAmount,
          data.operationCurrency,
        )}`
      : null,
    totalDelivered !== null && totalDelivered !== undefined
      ? `*• Total de dinero entregado: ${formatMoney(
          totalDelivered,
          data.operationCurrency,
        )}*`
      : null,
    checklist?.allMoneyHeldBy?.trim()
      ? `• Todo el dinero está en: ${checklist.allMoneyHeldBy.trim()}`
      : null,
  ].filter((line): line is string => Boolean(line));
  const balanceLines =
    !isSale && totalDelivered !== null && totalDelivered !== undefined
      ? [
          calculation.balance > 0
            ? `• Saldo de honorarios a abonar: ${formatMoney(
                calculation.balance,
                data.operationCurrency,
              )}`
            : calculation.balance < 0
              ? `• Saldo a favor para compensar en la escritura: ${formatMoney(
                  Math.abs(calculation.balance),
                  data.operationCurrency,
                )}`
              : '• Honorarios cubiertos con lo ya entregado',
        ]
      : [];
  const closingLines = [
    checklist?.paymentMethod?.trim()
      ? `• Forma de pago: ${checklist.paymentMethod.trim()}`
      : null,
    checklist?.notaryName?.trim()
      ? `• Escribanía interviniente: ${checklist.notaryName.trim()}`
      : null,
    checklist?.deedDate
      ? `• Fecha de escritura: ${formatChecklistDate(checklist.deedDate)}`
      : null,
    checklist?.deedTime?.trim()
      ? `• Horario: ${checklist.deedTime.trim()}`
      : null,
    checklist?.deedAddress?.trim()
      ? `• Lugar: ${checklist.deedAddress.trim()}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return [
    `Hola${contactName ? ` ${contactName}` : ''}, te comparto el detalle de gastos previo a la escritura.`,
    '',
    `*${operationLabel} - ${address}*`,
    checklist?.counterpartyRealEstateAgency?.trim()
      ? `• Inmobiliaria contraparte: ${checklist.counterpartyRealEstateAgency.trim()}`
      : null,
    `• Precio de cierre: ${formatMoney(data.operationAmount, data.operationCurrency)}`,
    `• Honorarios inmobiliarios (${commissionPercent}): ${formatMoney(
      calculation.commissionAmount,
      data.operationCurrency,
    )}`,
    `• IVA sobre honorarios (${vatPercent}): ${formatMoney(
      calculation.vatAmount,
      data.operationCurrency,
    )}`,
    hasReducedVat
      ? `  _(IVA reducido desde ${formatMoney(
          calculation.standardVatAmount,
          data.operationCurrency,
        )})_`
      : null,
    `*• Total de honorarios: ${formatMoney(
      calculation.total,
      data.operationCurrency,
    )}*`,
    moneyLines.length ? '' : null,
    moneyLines.length ? '*Dinero entregado*' : null,
    ...moneyLines,
    ...balanceLines,
    closingLines.length ? '' : null,
    closingLines.length ? '*Datos de la escritura*' : null,
    ...closingLines,
    '',
    data.notaryExpenses?.trim()
      ? `Gastos de escribanía: ${data.notaryExpenses.trim()}`
      : 'Los gastos de escribanía te los informa la escribanía.',
    isSale
      ? 'Para la escritura recordá llevar lo solicitado por la escribanía y las llaves de la propiedad.'
      : 'Para la escritura recordá llevar dólares cara grande, sin manchas ni marcas, DNI y lo solicitado por la escribanía.',
    data.observations?.trim() || activity.description?.trim()
      ? `Observaciones: ${data.observations?.trim() || activity.description?.trim()}`
      : null,
  ]
    .filter((line) => line !== null)
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

function formatChecklistDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatGoogleCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
