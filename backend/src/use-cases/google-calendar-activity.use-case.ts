import { ActivityType } from '../common/enums';

type CalendarContactLike = {
  displayName?: string | null;
};

type CalendarPropertyLike = {
  title?: string | null;
  address?: string | null;
  city?: string | null;
};

type CalendarAppraisalRequestLike = {
  publicToken?: string | null;
  propertyAddress?: string | null;
  city?: string | null;
  submittedAt?: Date | null;
  expiresAt?: Date | null;
};

export type CalendarActivityLike = {
  activityType: ActivityType;
  title: string;
  description?: string | null;
  externalUrl?: string | null;
  whatsappComment?: string | null;
  whatsappSharedAt?: Date | null;
  propertySearchLiked?: boolean | null;
  activityDate: Date;
  nextFollowUpDate?: Date | null;
  contact?: CalendarContactLike | null;
  property?: CalendarPropertyLike | null;
  appraisalRequest?: CalendarAppraisalRequestLike | null;
};

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getActivityTypeLabel(activityType: ActivityType) {
  switch (activityType) {
    case ActivityType.CALL:
      return 'Llamada';
    case ActivityType.WHATSAPP:
      return 'WhatsApp';
    case ActivityType.EMAIL:
      return 'Email';
    case ActivityType.INSTAGRAM:
      return 'Instagram';
    case ActivityType.MEETING:
      return 'Reunion';
    case ActivityType.VISIT:
      return 'Visita';
    case ActivityType.NOTE:
      return 'Nota';
    case ActivityType.FOLLOW_UP:
      return 'Seguimiento';
    case ActivityType.PROPERTY_SEARCH:
      return 'Busqueda de propiedad';
    case ActivityType.APPRAISAL_REQUEST:
      return 'Solicitud de tasacion';
    default:
      return 'Actividad';
  }
}

function buildSummary(activityType: ActivityType, title: string) {
  const typeLabel = getActivityTypeLabel(activityType);
  return title.startsWith(`${typeLabel} -`) ? title : `${typeLabel} - ${title}`;
}

function buildLocation(activity: CalendarActivityLike) {
  const propertyAddress = [activity.property?.address, activity.property?.city].filter(Boolean).join(', ');
  if (propertyAddress) {
    return propertyAddress;
  }

  const appraisalAddress = [activity.appraisalRequest?.propertyAddress, activity.appraisalRequest?.city].filter(Boolean).join(', ');
  return appraisalAddress || undefined;
}

function buildAppraisalPublicUrl(frontendUrl: string | undefined, publicToken: string | null | undefined) {
  if (!frontendUrl || !publicToken) {
    return null;
  }

  const normalizedBase = frontendUrl.replace(/\/+$/, '');
  return `${normalizedBase}/tasacion/${publicToken}`;
}

export function buildActivityCalendarEvent(
  activity: CalendarActivityLike,
  options?: { frontendUrl?: string },
) {
  const endDate = new Date(activity.activityDate);
  endDate.setHours(endDate.getHours() + 1);

  const appraisalPublicUrl = buildAppraisalPublicUrl(
    options?.frontendUrl,
    activity.appraisalRequest?.publicToken,
  );

  const descriptionLines = [
    `Tipo: ${getActivityTypeLabel(activity.activityType)}`,
    activity.contact?.displayName ? `Contacto: ${activity.contact.displayName}` : null,
    activity.property?.title ? `Propiedad: ${activity.property.title}` : null,
    buildLocation(activity) ? `Direccion: ${buildLocation(activity)}` : null,
    activity.description?.trim() ? `Descripcion: ${activity.description.trim()}` : null,
    activity.externalUrl?.trim() ? `Link: ${activity.externalUrl.trim()}` : null,
    activity.whatsappComment?.trim() ? `Comentario WhatsApp: ${activity.whatsappComment.trim()}` : null,
    activity.whatsappSharedAt ? `Compartido por WhatsApp: ${formatDateTime(activity.whatsappSharedAt)}` : null,
    activity.propertySearchLiked === true
      ? 'Respuesta del cliente: Le gusto'
      : activity.propertySearchLiked === false
        ? 'Respuesta del cliente: No le gusto'
        : null,
    activity.nextFollowUpDate ? `Proximo seguimiento: ${formatDateTime(activity.nextFollowUpDate)}` : null,
    appraisalPublicUrl ? `Formulario publico: ${appraisalPublicUrl}` : null,
    activity.appraisalRequest?.submittedAt
      ? `Estado de solicitud: Respondida (${formatDateTime(activity.appraisalRequest.submittedAt)})`
      : activity.appraisalRequest?.expiresAt
        ? `Estado de solicitud: Pendiente (vence ${formatDateTime(activity.appraisalRequest.expiresAt)})`
        : null,
  ].filter((value): value is string => Boolean(value));

  return {
    summary: buildSummary(activity.activityType, activity.title),
    description: descriptionLines.join('\n'),
    location: buildLocation(activity),
    start: {
      dateTime: activity.activityDate.toISOString(),
    },
    end: {
      dateTime: endDate.toISOString(),
    },
  };
}
