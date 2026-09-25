export type CalendarVisitLike = {
  scheduledAt: Date;
  status: string;
  contactId: number;
  propertyId?: number | null;
  externalPropertyTitle?: string | null;
  externalPropertyAddress?: string | null;
  externalUrl?: string | null;
  colleagueName?: string | null;
  notes?: string | null;
  contact?: { displayName?: string | null } | null;
  colleagueContact?: { displayName?: string | null } | null;
  property?: {
    title?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
};

export function buildVisitCalendarEvent(visit: CalendarVisitLike) {
  const endDate = new Date(visit.scheduledAt);
  endDate.setHours(endDate.getHours() + 1);

  const propertyTitle =
    visit.property?.title ??
    visit.externalPropertyTitle?.trim() ??
    (visit.propertyId ? `Propiedad #${visit.propertyId}` : 'Propiedad externa');
  const propertyAddress = visit.property?.address
    ? [visit.property.address, visit.property.city].filter(Boolean).join(', ')
    : visit.externalPropertyAddress?.trim() || 'Direccion pendiente';
  const contactName =
    visit.contact?.displayName ?? `Contacto #${visit.contactId}`;
  const colleagueName =
    visit.colleagueContact?.displayName ?? visit.colleagueName?.trim() ?? null;

  return {
    summary: `Visita a propiedad de colega - ${propertyTitle}`,
    description: [
      `Contacto comprador: ${contactName}`,
      colleagueName ? `Colega: ${colleagueName}` : null,
      `Propiedad: ${propertyTitle}`,
      `Direccion: ${propertyAddress}`,
      `Estado: ${visit.status}`,
      visit.externalUrl?.trim()
        ? `Link de la propiedad: ${visit.externalUrl.trim()}`
        : null,
      visit.notes ? `Notas: ${visit.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    location: propertyAddress,
    start: {
      dateTime: visit.scheduledAt.toISOString(),
    },
    end: {
      dateTime: endDate.toISOString(),
    },
  };
}
