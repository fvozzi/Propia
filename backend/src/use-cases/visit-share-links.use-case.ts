import type { CalendarVisitLike } from './google-calendar-visit.use-case';

type ShareableVisit = CalendarVisitLike & {
  publicToken: string;
};

export function sanitizeSharedPropertyUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const removableParameters = new Set([
    'fbclid',
    'gclid',
    'n_src',
    'n_pills',
    'n_pg',
    'n_pos',
    'n_search_id',
  ]);

  for (const key of Array.from(url.searchParams.keys())) {
    if (key.toLowerCase().startsWith('utm_') || removableParameters.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

export function buildVisitCalendarIcs(visit: ShareableVisit) {
  const start = new Date(visit.scheduledAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const propertyTitle =
    visit.property?.title?.trim() ||
    visit.externalPropertyTitle?.trim() ||
    'Propiedad';
  const propertyAddress =
    (visit.property?.address
      ? [visit.property.address, visit.property.city].filter(Boolean).join(', ')
      : visit.externalPropertyAddress?.trim()) || '';
  const colleagueName =
    visit.colleagueContact?.displayName?.trim() || visit.colleagueName?.trim() || null;
  const description = [
    colleagueName ? `Colega: ${colleagueName}` : null,
    visit.externalUrl?.trim()
      ? `Propiedad: ${sanitizeSharedPropertyUrl(visit.externalUrl.trim())}`
      : null,
    visit.notes?.trim() ? `Notas: ${visit.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InFlow//Visita a propiedad//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:visit-${visit.publicToken}@inflow`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(`Visita a propiedad de colega - ${propertyTitle}`)}`,
    `LOCATION:${escapeIcsText(propertyAddress)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

function formatIcsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
