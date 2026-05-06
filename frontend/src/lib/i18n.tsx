import { createContext, useContext, useEffect, useState } from 'react';

export type Locale = 'en' | 'es';

const LANGUAGE_KEY = 'propia_language';

const translations = {
  en: {
    common: {
      save: 'Save',
      update: 'Update',
      delete: 'Delete',
      search: 'Search',
      filter: 'Filter',
      apply: 'Apply',
      all: 'All',
      previous: 'Previous',
      next: 'Next',
      select: 'Select',
      unassigned: 'Unassigned',
      noContact: 'No contact',
      noProperty: 'No property',
      noData: 'No data',
      notes: 'Notes',
      email: 'Email',
      password: 'Password',
      language: 'Language',
      signOut: 'Sign out',
      loading: 'Loading...',
      yesDeleteContact: 'Delete contact?',
      yesDeleteProperty: 'Delete property?',
      yesDeleteRequirement: 'Delete requirement?',
      yesDeleteActivity: 'Delete activity?',
      yesDeleteVisit: 'Delete visit?',
      source: 'Source',
      city: 'City',
      neighborhood: 'Neighborhood',
      status: 'Status',
      price: 'Price',
      currency: 'Currency',
      description: 'Description',
      dateTime: 'Date and time',
      contact: 'Contact',
      property: 'Property',
      type: 'Type',
      phone: 'Phone',
      title: 'Title',
      owner: 'Owner',
      operation: 'Operation',
      schedule: 'Schedule',
      active: 'Active',
    },
    nav: {
      dashboard: 'Dashboard',
      calendar: 'Calendar',
      contacts: 'Contacts',
      properties: 'Properties',
      requirements: 'Requirements',
      activities: 'Activities',
      visits: 'Visits',
    },
    layout: {
      title: 'Personal real estate CRM',
      subtitle: 'Simple daily operation to capture, follow up, and close.',
    },
    login: {
      title: 'Personal real estate CRM',
      subtitle: 'Use the demo account to start managing your pipeline.',
      google: 'Continue with Google',
      or: 'or',
      submit: 'Sign in',
      submitting: 'Signing in...',
      error: 'Could not sign in.',
    },
    dashboard: {
      eyebrow: 'Daily dashboard',
      title: "Today's priorities",
      dueToday: 'Follow-ups due today',
      overdue: 'Overdue follow-ups',
      visitsToday: 'Visits today',
      activeProperties: 'Active properties',
      activeRequirements: 'Active requirements',
      propertyFallback: 'Property',
    },
    contacts: {
      eyebrow: 'Contacts',
      title: 'Commercial base',
      searchPlaceholder: 'Search by name, email, or phone',
      newContact: 'New contact',
      listTitle: 'Contacts',
      firstName: 'First name',
      lastName: 'Last name',
      displayName: 'Display name',
      whatsapp: 'WhatsApp',
      roles: 'Roles',
      save: 'Save contact',
      page: 'Page',
      detailsEyebrow: 'Contact detail',
      detailsCard: 'Contact details',
      rolesAndRequirements: 'Roles and requirements',
      timelineTitle: 'Commercial timeline',
      timelineEmpty: 'There are no interactions for this contact yet.',
      requirementSummaryPrefix: 'Requirement',
      followUpPrefix: 'Next follow-up',
    },
    properties: {
      eyebrow: 'Properties',
      title: 'Active inventory and acquisition',
      allStatuses: 'All statuses',
      allOperations: 'All operations',
      newProperty: 'New property',
      listTitle: 'Properties',
      address: 'Address',
      photoUrl: 'Photo URL',
      save: 'Save property',
      noPrice: 'No price',
      shareWhatsApp: 'Share on WhatsApp',
      detailsEyebrow: 'Property detail',
      detailsCard: 'Property details',
      photosAndOwner: 'Photos and owner',
      privateNotes: 'Private notes',
      timelineTitle: 'Property timeline',
      timelineEmpty: 'There are no activities or visits linked yet.',
      visitWith: 'Visit with',
      contactPrefix: 'Contact',
      followUpPrefix: 'Next follow-up',
    },
    requirements: {
      eyebrow: 'Search requirements',
      title: 'Active demand',
      newRequirement: 'New requirement',
      listTitle: 'List',
      neighborhoods: 'Neighborhoods',
      minPrice: 'Min price',
      maxPrice: 'Max price',
      minRooms: 'Min rooms',
      minBedrooms: 'Min bedrooms',
      save: 'Save requirement',
    },
    activities: {
      eyebrow: 'Activities',
      title: 'History and follow-ups',
      newActivity: 'New activity',
      listTitle: 'History',
      activityDate: 'Activity date',
      nextFollowUp: 'Next follow-up',
      save: 'Save activity',
      withoutContact: 'No contact',
      withoutProperty: 'No property',
    },
    visits: {
      eyebrow: 'Visits',
      title: 'Commercial agenda',
      newVisit: 'New visit',
      listTitle: 'Agenda',
      save: 'Save visit',
    },
    calendar: {
      eyebrow: 'Calendar',
      title: 'Calendar and agenda',
      subtitle: 'Plan messages, follow-ups, meetings, and property visits from one place.',
      monthItems: 'Items this month',
      monthTasks: 'Tasks',
      monthVisits: 'Visits',
      monthHint: 'Click a day to review the agenda and create new actions.',
      selectedDay: 'Selected day',
      emptyDay: 'There is nothing scheduled for this day yet.',
      upcoming: 'Upcoming',
      nextItems: 'Next scheduled items',
      emptyUpcoming: 'There are no upcoming items from this day onward.',
      newTask: 'New task',
      taskTitle: 'Schedule a task or message',
      newVisit: 'New visit',
      addTask: 'New task',
      addVisit: 'New visit',
      desktopHint: 'Double click a day to add a visit. Right click for a task.',
      useSelectedDay: 'Use selected day',
      saveTask: 'Save task',
      saveVisit: 'Save visit',
      openContact: 'Open contact',
      openProperty: 'Open property',
      contactOptional: 'No contact',
      propertyOptional: 'No property',
      closeComposer: 'Close',
    },
    timeline: {
      visitTo: 'Visit to',
      statePrefix: 'Status',
    },
    enums: {
      role: {
        OWNER: 'Owner',
        BUYER: 'Buyer',
        TENANT: 'Tenant',
        INVESTOR: 'Investor',
        REFERRER: 'Referrer',
        REALTOR: 'Realtor',
        NOTARY: 'Notary',
        OTHER: 'Other',
      },
      operationType: {
        SALE: 'Sale',
        RENT: 'Rent',
      },
      propertyType: {
        HOUSE: 'House',
        APARTMENT: 'Apartment',
        PH: 'PH',
        LAND: 'Land',
        OFFICE: 'Office',
        COMMERCIAL: 'Commercial',
        OTHER: 'Other',
      },
      propertyStatus: {
        DRAFT: 'Draft',
        APPRAISAL: 'Appraisal',
        CAPTURED: 'Captured',
        ACTIVE: 'Active',
        RESERVED: 'Reserved',
        SOLD: 'Sold',
        RENTED: 'Rented',
        ARCHIVED: 'Archived',
        LOST: 'Lost',
      },
      currency: {
        USD: 'USD',
        ARS: 'ARS',
      },
      searchRequirementStatus: {
        ACTIVE: 'Active',
        PAUSED: 'Paused',
        CLOSED: 'Closed',
      },
      activityType: {
        CALL: 'Call',
        WHATSAPP: 'WhatsApp',
        EMAIL: 'Email',
        INSTAGRAM: 'Instagram',
        MEETING: 'Meeting',
        VISIT: 'Visit',
        NOTE: 'Note',
        FOLLOW_UP: 'Follow-up',
      },
      visitStatus: {
        SCHEDULED: 'Scheduled',
        DONE: 'Done',
        CANCELLED: 'Cancelled',
        RESCHEDULED: 'Rescheduled',
      },
    },
  },
  es: {
    common: {
      save: 'Guardar',
      update: 'Actualizar',
      delete: 'Eliminar',
      search: 'Buscar',
      filter: 'Filtrar',
      apply: 'Aplicar',
      all: 'Todos',
      previous: 'Anterior',
      next: 'Siguiente',
      select: 'Seleccionar',
      unassigned: 'Sin asignar',
      noContact: 'Sin contacto',
      noProperty: 'Sin propiedad',
      noData: 'Sin dato',
      notes: 'Notas',
      email: 'Email',
      password: 'Password',
      language: 'Idioma',
      signOut: 'Salir',
      loading: 'Cargando...',
      yesDeleteContact: 'Eliminar contacto?',
      yesDeleteProperty: 'Eliminar propiedad?',
      yesDeleteRequirement: 'Eliminar requerimiento?',
      yesDeleteActivity: 'Eliminar actividad?',
      yesDeleteVisit: 'Eliminar visita?',
      source: 'Origen',
      city: 'Ciudad',
      neighborhood: 'Barrio',
      status: 'Estado',
      price: 'Precio',
      currency: 'Moneda',
      description: 'Descripcion',
      dateTime: 'Fecha y hora',
      contact: 'Contacto',
      property: 'Propiedad',
      type: 'Tipo',
      phone: 'Telefono',
      title: 'Titulo',
      owner: 'Dueno',
      operation: 'Operacion',
      schedule: 'Agenda',
      active: 'Activo',
    },
    nav: {
      dashboard: 'Dashboard',
      calendar: 'Calendario',
      contacts: 'Contactos',
      properties: 'Propiedades',
      requirements: 'Requerimientos',
      activities: 'Actividades',
      visits: 'Visitas',
    },
    layout: {
      title: 'CRM inmobiliario personal',
      subtitle: 'Operacion simple para captar, seguir y cerrar.',
    },
    login: {
      title: 'CRM inmobiliario personal',
      subtitle: 'Accede con la cuenta demo para empezar a gestionar.',
      google: 'Continuar con Google',
      or: 'o',
      submit: 'Ingresar',
      submitting: 'Ingresando...',
      error: 'No se pudo iniciar sesion.',
    },
    dashboard: {
      eyebrow: 'Dashboard diario',
      title: 'Lo prioritario de hoy',
      dueToday: 'Follow-ups de hoy',
      overdue: 'Follow-ups vencidos',
      visitsToday: 'Visitas de hoy',
      activeProperties: 'Propiedades activas',
      activeRequirements: 'Demandas activas',
      propertyFallback: 'Propiedad',
    },
    contacts: {
      eyebrow: 'Contactos',
      title: 'Base comercial',
      searchPlaceholder: 'Buscar por nombre, email o telefono',
      newContact: 'Nuevo contacto',
      listTitle: 'Contactos',
      firstName: 'Nombre',
      lastName: 'Apellido',
      displayName: 'Display name',
      whatsapp: 'WhatsApp',
      roles: 'Roles',
      save: 'Guardar contacto',
      page: 'Pagina',
      detailsEyebrow: 'Detalle de contacto',
      detailsCard: 'Datos del contacto',
      rolesAndRequirements: 'Roles y requerimientos',
      timelineTitle: 'Linea de vida comercial',
      timelineEmpty: 'Todavia no hay interacciones para este contacto.',
      requirementSummaryPrefix: 'Requerimiento',
      followUpPrefix: 'Proximo follow-up',
    },
    properties: {
      eyebrow: 'Propiedades',
      title: 'Stock activo y captacion',
      allStatuses: 'Todos los estados',
      allOperations: 'Todas las operaciones',
      newProperty: 'Nueva propiedad',
      listTitle: 'Propiedades',
      address: 'Direccion',
      photoUrl: 'URL de foto',
      save: 'Guardar propiedad',
      noPrice: 'Sin precio',
      shareWhatsApp: 'Compartir por WhatsApp',
      detailsEyebrow: 'Detalle de propiedad',
      detailsCard: 'Datos de la propiedad',
      photosAndOwner: 'Fotos y dueno',
      privateNotes: 'Notas privadas',
      timelineTitle: 'Linea de vida de la propiedad',
      timelineEmpty: 'Todavia no hay actividades ni visitas asociadas.',
      visitWith: 'Visita con',
      contactPrefix: 'Contacto',
      followUpPrefix: 'Proximo follow-up',
    },
    requirements: {
      eyebrow: 'Requerimientos',
      title: 'Demandas activas',
      newRequirement: 'Nuevo requerimiento',
      listTitle: 'Listado',
      neighborhoods: 'Barrios',
      minPrice: 'Min precio',
      maxPrice: 'Max precio',
      minRooms: 'Min ambientes',
      minBedrooms: 'Min dormitorios',
      save: 'Guardar requerimiento',
    },
    activities: {
      eyebrow: 'Actividades',
      title: 'Historial y follow-ups',
      newActivity: 'Nueva actividad',
      listTitle: 'Historial',
      activityDate: 'Fecha actividad',
      nextFollowUp: 'Proximo follow-up',
      save: 'Guardar actividad',
      withoutContact: 'Sin contacto',
      withoutProperty: 'Sin propiedad',
    },
    visits: {
      eyebrow: 'Visitas',
      title: 'Agenda comercial',
      newVisit: 'Nueva visita',
      listTitle: 'Agenda',
      save: 'Guardar visita',
    },
    calendar: {
      eyebrow: 'Calendario',
      title: 'Calendario y agenda',
      subtitle: 'Programa mensajes, follow-ups, reuniones y visitas a propiedades desde un solo lugar.',
      monthItems: 'Items del mes',
      monthTasks: 'Tareas',
      monthVisits: 'Visitas',
      monthHint: 'Hace click en un dia para revisar la agenda y crear nuevas acciones.',
      selectedDay: 'Dia seleccionado',
      emptyDay: 'Todavia no hay nada programado para este dia.',
      upcoming: 'Proximos',
      nextItems: 'Siguientes items programados',
      emptyUpcoming: 'No hay items proximos desde este dia.',
      newTask: 'Nueva tarea',
      taskTitle: 'Programar tarea o mensaje',
      newVisit: 'Nueva visita',
      addTask: 'Nueva tarea',
      addVisit: 'Nueva visita',
      desktopHint: 'Doble click en un dia para cargar una visita. Click derecho para una tarea.',
      useSelectedDay: 'Usar dia seleccionado',
      saveTask: 'Guardar tarea',
      saveVisit: 'Guardar visita',
      openContact: 'Abrir contacto',
      openProperty: 'Abrir propiedad',
      contactOptional: 'Sin contacto',
      propertyOptional: 'Sin propiedad',
      closeComposer: 'Cerrar',
    },
    timeline: {
      visitTo: 'Visita a',
      statePrefix: 'Estado',
    },
    enums: {
      role: {
        OWNER: 'Propietario',
        BUYER: 'Comprador',
        TENANT: 'Inquilino',
        INVESTOR: 'Inversor',
        REFERRER: 'Referidor',
        REALTOR: 'Corredor',
        NOTARY: 'Escribano',
        OTHER: 'Otro',
      },
      operationType: {
        SALE: 'Venta',
        RENT: 'Alquiler',
      },
      propertyType: {
        HOUSE: 'Casa',
        APARTMENT: 'Departamento',
        PH: 'PH',
        LAND: 'Lote',
        OFFICE: 'Oficina',
        COMMERCIAL: 'Comercial',
        OTHER: 'Otro',
      },
      propertyStatus: {
        DRAFT: 'Borrador',
        APPRAISAL: 'Tasacion',
        CAPTURED: 'Captada',
        ACTIVE: 'Activa',
        RESERVED: 'Reservada',
        SOLD: 'Vendida',
        RENTED: 'Alquilada',
        ARCHIVED: 'Archivada',
        LOST: 'Perdida',
      },
      currency: {
        USD: 'USD',
        ARS: 'ARS',
      },
      searchRequirementStatus: {
        ACTIVE: 'Activo',
        PAUSED: 'Pausado',
        CLOSED: 'Cerrado',
      },
      activityType: {
        CALL: 'Llamada',
        WHATSAPP: 'WhatsApp',
        EMAIL: 'Email',
        INSTAGRAM: 'Instagram',
        MEETING: 'Reunion',
        VISIT: 'Visita',
        NOTE: 'Nota',
        FOLLOW_UP: 'Follow-up',
      },
      visitStatus: {
        SCHEDULED: 'Programada',
        DONE: 'Realizada',
        CANCELLED: 'Cancelada',
        RESCHEDULED: 'Reprogramada',
      },
    },
  },
} as const;

function getNestedValue(tree: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, tree);

  return typeof value === 'string' ? value : path;
}

function detectLocale(): Locale {
  const browserLanguage =
    navigator.languages?.find((language) => language.startsWith('es') || language.startsWith('en')) ??
    navigator.language;

  return browserLanguage.startsWith('es') ? 'es' : 'en';
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
  translateEnum: (
    group:
      | 'role'
      | 'operationType'
      | 'propertyType'
      | 'propertyStatus'
      | 'currency'
      | 'searchRequirementStatus'
      | 'activityType'
      | 'visitStatus',
    value: string,
  ) => string;
  formatDateTime: (value: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'es') {
      return stored;
    }

    return detectLocale();
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    setLocale(localeValue) {
      setLocaleState(localeValue);
    },
    t(path) {
      return getNestedValue(translations[locale] as unknown as Record<string, unknown>, path);
    },
    translateEnum(group, value) {
      const groupMap = translations[locale].enums[group] as Record<string, string>;
      return groupMap[value] ?? value.replace(/_/g, ' ');
    },
    formatDateTime(value) {
      return new Date(value).toLocaleString(locale === 'es' ? 'es-AR' : 'en-US');
    },
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}

export const roleOptions = ['OWNER', 'BUYER', 'TENANT', 'INVESTOR', 'REFERRER', 'REALTOR', 'NOTARY', 'OTHER'] as const;
export const operationTypeOptions = ['SALE', 'RENT'] as const;
export const propertyTypeOptions = ['HOUSE', 'APARTMENT', 'PH', 'LAND', 'OFFICE', 'COMMERCIAL', 'OTHER'] as const;
export const propertyStatusOptions = ['DRAFT', 'APPRAISAL', 'CAPTURED', 'ACTIVE', 'RESERVED', 'SOLD', 'RENTED', 'ARCHIVED', 'LOST'] as const;
export const currencyOptions = ['USD', 'ARS'] as const;
export const searchRequirementStatusOptions = ['ACTIVE', 'PAUSED', 'CLOSED'] as const;
export const activityTypeOptions = ['CALL', 'WHATSAPP', 'EMAIL', 'INSTAGRAM', 'MEETING', 'VISIT', 'NOTE', 'FOLLOW_UP'] as const;
export const visitStatusOptions = ['SCHEDULED', 'DONE', 'CANCELLED', 'RESCHEDULED'] as const;
