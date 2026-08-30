import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContactCombobox } from '../components/ContactCombobox';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { calendarActivityTypeOptions, useI18n, visitStatusOptions } from '../lib/i18n';
import {
  buildBirthdayWhatsappMessage,
  buildVisitWhatsappMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from '../lib/whatsapp';
import type {
  Activity,
  ActivityType,
  CalendarAgendaResponse,
  CalendarBirthdayAgendaItem,
  CalendarGoogleEventAgendaItem,
  Contact,
  Paginated,
  Property,
  Visit,
} from '../types';

type AgendaContact = Pick<Contact, 'id' | 'displayName' | 'phone' | 'whatsapp'>;

type AgendaItem = {
  id: string;
  entityType: 'activity' | 'visit' | 'birthday' | 'google';
  startsAt: string;
  allDay?: boolean;
  title: string;
  detail: string;
  status: string;
  contact?: AgendaContact | null;
  property?: Property | null;
  notes?: string | null;
  externalUrl?: string | null;
  visit?: Visit;
};

type ActivityFormState = {
  activityType: ActivityType;
  contactId: string;
  propertyId: string;
  title: string;
  description: string;
  activityDate: string;
  nextFollowUpDate: string;
  appraisalPropertyAddress: string;
};

type VisitFormState = {
  propertyId: string;
  contactId: string;
  scheduledAt: string;
  status: string;
  externalUrl: string;
  notes: string;
};

type ComposerMode = 'task' | 'visit' | null;

export function CalendarPage() {
  const { locale, t, translateEnum } = useI18n();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [birthdayItems, setBirthdayItems] = useState<CalendarBirthdayAgendaItem[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarGoogleEventAgendaItem[]>([]);
  const [showBirthdays, setShowBirthdays] = useState(true);
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleCalendarPermissionGranted, setGoogleCalendarPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [sharingVisitId, setSharingVisitId] = useState<number | null>(null);
  const [sharingBirthdayId, setSharingBirthdayId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(() =>
    createInitialActivityForm(formatDateKey(new Date())),
  );
  const [visitForm, setVisitForm] = useState<VisitFormState>(() =>
    createInitialVisitForm(formatDateKey(new Date())),
  );

  useEffect(() => {
    Promise.all([
      apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
      apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
    ])
      .then(([contactsResponse, propertiesResponse]) => {
        setContacts(contactsResponse.items);
        setProperties(propertiesResponse.items);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Could not load agenda references.');
      });
  }, []);

  useEffect(() => {
    loadAgenda();
  }, [visibleMonth]);

  async function loadAgenda() {
    setLoading(true);
    setLoadError('');
    const range = getCalendarRange(visibleMonth);

    try {
      const [activitiesData, visitsData, calendarAgenda] = await Promise.all([
        apiRequest<Paginated<Activity>>(
          `/activities?page=1&limit=100&fromDate=${range.fromDate}&toDate=${range.toDate}`,
        ),
        apiRequest<Paginated<Visit>>(
          `/visits?page=1&limit=100&fromDate=${range.fromDate}&toDate=${range.toDate}`,
        ),
        apiRequest<CalendarAgendaResponse>(
          `/calendar/agenda?fromDate=${range.fromDate}&toDate=${range.toDate}`,
        ),
      ]);

      setActivities(activitiesData.items);
      setVisits(visitsData.items);
      setBirthdayItems(calendarAgenda.birthdays);
      setGoogleEvents(calendarAgenda.googleEvents);
      setGoogleCalendarConnected(calendarAgenda.googleCalendarConnected);
      setGoogleCalendarPermissionGranted(calendarAgenda.googleCalendarPermissionGranted);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load agenda.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTask(true);

    try {
      await apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          contactId: activityForm.contactId ? Number(activityForm.contactId) : undefined,
          propertyId: activityForm.propertyId ? Number(activityForm.propertyId) : undefined,
          activityType: activityForm.activityType,
          title:
            activityForm.activityType === 'APPRAISAL_REQUEST'
              ? 'Prelisting'
              : activityForm.title,
          description:
            activityForm.activityType === 'APPRAISAL_REQUEST'
              ? undefined
              : activityForm.description || undefined,
          activityDate: activityForm.activityDate,
          nextFollowUpDate: activityForm.nextFollowUpDate || undefined,
          appraisalPropertyAddress:
            activityForm.activityType === 'APPRAISAL_REQUEST'
              ? activityForm.appraisalPropertyAddress || undefined
              : undefined,
        }),
      });
      setActivityForm(createInitialActivityForm(selectedDateKey));
      setComposerMode(null);
      await loadAgenda();
    } finally {
      setSavingTask(false);
    }
  }

  async function handleCreateVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingVisit(true);

    try {
      await apiRequest('/visits', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: Number(visitForm.propertyId),
          contactId: Number(visitForm.contactId),
          scheduledAt: visitForm.scheduledAt,
          status: visitForm.status,
          externalUrl: visitForm.externalUrl || undefined,
          notes: visitForm.notes || undefined,
        }),
      });
      setVisitForm(createInitialVisitForm(selectedDateKey));
      setComposerMode(null);
      await loadAgenda();
    } finally {
      setSavingVisit(false);
    }
  }

  async function handleShareVisit(visit: Visit) {
    if (!visit.contact || !getContactWhatsappPhone(visit.contact) || !visit.externalUrl) return;

    setSharingVisitId(visit.id);
    setLoadError('');

    try {
      const message = buildVisitWhatsappMessage(visit);
      openWhatsAppShareUrl(buildWhatsAppShareUrl(visit.contact, message));
      window.alert(t('common.whatsappSent'));
    } catch (shareError) {
      setLoadError(shareError instanceof Error ? shareError.message : t('common.whatsappSendFailed'));
    } finally {
      setSharingVisitId(null);
    }
  }

  async function handleShareBirthday(item: AgendaItem) {
    if (item.entityType !== 'birthday' || !item.contact || !getContactWhatsappPhone(item.contact)) {
      return;
    }

    setSharingBirthdayId(item.id);
    setLoadError('');

    try {
      const message = buildBirthdayWhatsappMessage(item.contact.displayName);
      openWhatsAppShareUrl(buildWhatsAppShareUrl(item.contact, message));
      window.alert(t('common.whatsappSent'));
    } catch (shareError) {
      setLoadError(
        shareError instanceof Error ? shareError.message : t('common.whatsappSendFailed'),
      );
    } finally {
      setSharingBirthdayId(null);
    }
  }

  function openTaskComposer(dayKey = selectedDateKey) {
    setSelectedDateKey(dayKey);
    setActivityForm(createInitialActivityForm(dayKey));
    setComposerMode('task');
  }

  function openVisitComposer(dayKey = selectedDateKey) {
    setSelectedDateKey(dayKey);
    setVisitForm(createInitialVisitForm(dayKey));
    setComposerMode('visit');
  }

  function closeComposer() {
    setComposerMode(null);
  }

  function handleDayContextMenu(event: MouseEvent<HTMLButtonElement>, dayKey: string) {
    event.preventDefault();
    openTaskComposer(dayKey);
  }

  function moveMonth(direction: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + direction, 1);
    setVisibleMonth(nextMonth);
    setSelectedDateKey(formatDateKey(nextMonth));
  }

  const monthLabel = new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);
  const weekdayLabels = buildWeekdayLabels(locale);
  const calendarDays = buildCalendarDays(visibleMonth);
  const schedulableActivities = activities.filter((activity) =>
    isCalendarActivityType(activity.activityType),
  );
  const visibleBirthdays = showBirthdays ? birthdayItems.map(mapBirthdayToAgendaItem) : [];
  const visibleGoogleEvents = showGoogleCalendar ? googleEvents.map(mapGoogleEventToAgendaItem) : [];
  const agendaItems = [
    ...schedulableActivities.map(mapActivityToAgendaItem),
    ...visits.map(mapVisitToAgendaItem),
    ...visibleBirthdays,
    ...visibleGoogleEvents,
  ].sort(compareAgendaItems);
  const itemsByDay = groupAgendaByDay(agendaItems);
  const selectedItems = itemsByDay.get(selectedDateKey) ?? [];
  const selectedDateTimestamp = new Date(`${selectedDateKey}T00:00:00`).getTime();
  const upcomingItems = agendaItems
    .filter((item) => new Date(item.startsAt).getTime() >= selectedDateTimestamp)
    .slice(0, 8);

  return (
    <div className="page-stack">
      <section className="page-header calendar-page-header">
        <div className="calendar-page-header-copy">
          <p className="eyebrow">{t('calendar.eyebrow')}</p>
          <h2>{t('calendar.title')}</h2>
          <p className="muted">{t('calendar.subtitle')}</p>
        </div>
        <div className="calendar-summary-grid" aria-label={t('calendar.monthItems')}>
          <article className="calendar-summary-card">
            <span className="calendar-summary-label">{t('calendar.monthItems')}</span>
            <strong className="calendar-summary-value">{agendaItems.length}</strong>
          </article>
          <article className="calendar-summary-card">
            <span className="calendar-summary-label">{t('calendar.monthTasks')}</span>
            <strong className="calendar-summary-value">{schedulableActivities.length}</strong>
          </article>
          <article className="calendar-summary-card">
            <span className="calendar-summary-label">{t('calendar.monthVisits')}</span>
            <strong className="calendar-summary-value">{visits.length}</strong>
          </article>
          <article className="calendar-summary-card">
            <span className="calendar-summary-label">{t('calendar.monthBirthdays')}</span>
            <strong className="calendar-summary-value">{birthdayItems.length}</strong>
          </article>
        </div>
      </section>

      <div className="calendar-layout">
        <section className="card calendar-month-panel">
          <div className="calendar-toolbar">
            <button type="button" className="ghost-button" onClick={() => moveMonth(-1)}>
              {t('common.previous')}
            </button>
            <div>
              <h3 className="calendar-month-title">{monthLabel}</h3>
              <p className="muted">{t('calendar.monthHint')}</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => moveMonth(1)}>
              {t('common.next')}
            </button>
          </div>

          <div className="calendar-filter-row">
            <button
              type="button"
              className={showBirthdays ? 'ghost-button active-toggle' : 'ghost-button'}
              onClick={() => setShowBirthdays((current) => !current)}
            >
              {showBirthdays ? t('calendar.hideBirthdays') : t('calendar.showBirthdays')}
            </button>
            <button
              type="button"
              className={showGoogleCalendar ? 'ghost-button active-toggle' : 'ghost-button'}
              onClick={() => setShowGoogleCalendar((current) => !current)}
              disabled={!googleCalendarConnected || !googleCalendarPermissionGranted}
              title={
                !googleCalendarConnected || !googleCalendarPermissionGranted
                  ? t('calendar.googleCalendarUnavailable')
                  : undefined
              }
            >
              {showGoogleCalendar ? t('calendar.hideGoogleCalendar') : t('calendar.showGoogleCalendar')}
            </button>
          </div>

          {googleCalendarConnected && googleCalendarPermissionGranted ? null : (
            <p className="muted calendar-source-note">{t('calendar.googleCalendarUnavailable')}</p>
          )}

          <div className="calendar-grid calendar-grid-header">
            {weekdayLabels.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const dayKey = formatDateKey(day);
              const dayItems = itemsByDay.get(dayKey) ?? [];
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = dayKey === selectedDateKey;
              const isToday = dayKey === formatDateKey(new Date());

              return (
                <button
                  key={dayKey}
                  type="button"
                  className={`calendar-day${isCurrentMonth ? '' : ' outside'}${isSelected ? ' selected' : ''}${
                    isToday ? ' today' : ''
                  }${dayItems.length ? ' has-items' : ''}`}
                  aria-label={buildCalendarDayLabel(day, dayItems.length, locale)}
                  onClick={() => setSelectedDateKey(dayKey)}
                  onDoubleClick={() => openVisitComposer(dayKey)}
                  onContextMenu={(event) => handleDayContextMenu(event, dayKey)}
                >
                  <div className="calendar-day-header">
                    <span>{day.getDate()}</span>
                    {dayItems.length ? <strong>{dayItems.length}</strong> : null}
                  </div>
                  <div className="calendar-day-list">
                    {dayItems.slice(0, 3).map((item) => (
                      <span key={item.id} className={`calendar-chip ${item.entityType}`}>
                        {item.allDay ? item.title : `${formatTime(item.startsAt, locale)} ${item.title}`}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card calendar-agenda-panel">
          <div className="calendar-selected-header">
            <div>
              <p className="eyebrow">{t('calendar.selectedDay')}</p>
              <h3>{formatLongDate(selectedDateKey, locale)}</h3>
              <p className="muted">{t('calendar.desktopHint')}</p>
            </div>
            <div className="calendar-action-row">
              <button type="button" onClick={() => openTaskComposer()}>
                {t('calendar.addTask')}
              </button>
              <button type="button" className="ghost-button" onClick={() => openVisitComposer()}>
                {t('calendar.addVisit')}
              </button>
            </div>
          </div>

          <div className="stack-gap">
            {selectedItems.length ? (
              selectedItems.map((item) => (
                <article key={item.id} className="agenda-item">
                  <div className="agenda-item-header">
                    <div>
                      <span className="agenda-time">
                        {item.allDay ? t('calendar.allDay') : formatTime(item.startsAt, locale)}
                      </span>
                      <strong>{item.title}</strong>
                    </div>
                    {renderAgendaStatus(item, t)}
                  </div>
                  <p className="muted">{item.detail}</p>
                  {item.notes ? <p className="agenda-notes">{item.notes}</p> : null}
                  <div className="agenda-links">
                    {item.contact ? (
                      <Link to={`/contacts/${item.contact.id}`} className="agenda-link">
                        {t('calendar.openContact')}
                      </Link>
                    ) : null}
                    {item.property ? (
                      <Link to={`/properties/${item.property.id}`} className="agenda-link">
                        {t('calendar.openProperty')}
                      </Link>
                    ) : null}
                    {item.entityType === 'visit' && item.externalUrl ? (
                      <a href={item.externalUrl} target="_blank" rel="noreferrer" className="agenda-link">
                        {t('visits.openListing')}
                      </a>
                    ) : null}
                    {item.entityType === 'visit' &&
                    item.visit &&
                    item.contact &&
                    item.externalUrl &&
                    getContactWhatsappPhone(item.contact) ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleShareVisit(item.visit!)}
                        disabled={sharingVisitId === item.visit.id}
                      >
                        {sharingVisitId === item.visit.id ? t('common.loading') : t('visits.shareNow')}
                      </button>
                    ) : null}
                    {item.entityType === 'google' && item.externalUrl ? (
                      <a href={item.externalUrl} target="_blank" rel="noreferrer" className="agenda-link">
                        {t('calendar.openGoogleEvent')}
                      </a>
                    ) : null}
                    {item.entityType === 'birthday' &&
                    item.contact &&
                    getContactWhatsappPhone(item.contact) ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => void handleShareBirthday(item)}
                        disabled={sharingBirthdayId === item.id}
                      >
                        {sharingBirthdayId === item.id
                          ? t('common.loading')
                          : t('calendar.sendBirthdayWhatsapp')}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">{t('calendar.emptyDay')}</p>
            )}
          </div>

          <div className="agenda-divider" />

          <div className="stack-gap">
            <div>
              <p className="eyebrow">{t('calendar.upcoming')}</p>
              <h3>{t('calendar.nextItems')}</h3>
            </div>
            {upcomingItems.length ? (
              upcomingItems.map((item) => (
                <article key={`${item.id}-upcoming`} className="mini-agenda-item">
                  <span>
                    {item.allDay
                      ? formatShortDate(item.startsAt, locale)
                      : formatShortDateTime(item.startsAt, locale)}
                  </span>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.detail}</p>
                </article>
              ))
            ) : (
              <p className="muted">{t('calendar.emptyUpcoming')}</p>
            )}
          </div>
        </section>
      </div>

      {loadError ? <div className="alert">{loadError}</div> : null}
      {loading ? <p>{t('common.loading')}</p> : null}

      {composerMode === 'task' ? (
        <div className="modal-overlay" onClick={closeComposer}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t('calendar.newTask')}</p>
                <h3>{t('calendar.taskTitle')}</h3>
                <p className="muted">{formatLongDate(selectedDateKey, locale)}</p>
              </div>
              <button type="button" className="ghost-button" onClick={closeComposer}>
                {t('calendar.closeComposer')}
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateTask}>
              <label>
                {t('common.type')}
                <select
                  value={activityForm.activityType}
                  onChange={(event) =>
                    setActivityForm({
                      ...activityForm,
                      activityType: event.target.value as ActivityType,
                    })
                  }
                >
                  {calendarActivityTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateEnum('activityType', option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {activityForm.activityType === 'VISIT'
                  ? t('activities.visitContactOptional')
                  : t('common.contact')}
                <ContactCombobox
                  contacts={contacts}
                  value={activityForm.contactId}
                  onChange={(value) =>
                    setActivityForm({ ...activityForm, contactId: value })
                  }
                  placeholder={t('contacts.searchPlaceholder')}
                  emptyLabel={t('calendar.contactOptional')}
                  loadingLabel={t('common.loading')}
                  noResultsLabel={t('common.noData')}
                  required={activityForm.activityType === 'APPRAISAL_REQUEST'}
                  remoteSearch
                />
              </label>
              <label>
                {t('common.property')}
                <select
                  value={activityForm.propertyId}
                  onChange={(event) =>
                    setActivityForm({ ...activityForm, propertyId: event.target.value })
                  }
                >
                  <option value="">{t('calendar.propertyOptional')}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="full-span calendar-related-actions">
                <Link to="/contacts/new" className="ghost-button button-link">
                  {t('contacts.newContact')}
                </Link>
                <Link to="/properties/new" className="ghost-button button-link">
                  {t('properties.newProperty')}
                </Link>
              </div>
              {activityForm.activityType === 'APPRAISAL_REQUEST' ? (
                <label className="full-span">
                  {t('appraisals.propertyAddress')}
                  <input
                    value={activityForm.appraisalPropertyAddress}
                    onChange={(event) =>
                      setActivityForm({
                        ...activityForm,
                        appraisalPropertyAddress: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              ) : null}
              <label>
                {t('activities.activityDate')}
                <input
                  type="datetime-local"
                  value={activityForm.activityDate}
                  onChange={(event) =>
                    setActivityForm({ ...activityForm, activityDate: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                {t('activities.nextFollowUp')}
                <input
                  type="datetime-local"
                  value={activityForm.nextFollowUpDate}
                  onChange={(event) =>
                    setActivityForm({ ...activityForm, nextFollowUpDate: event.target.value })
                  }
                />
              </label>
              <label className="full-span">
                {t('common.title')}
                <input
                  value={activityForm.title}
                  onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })}
                  required={activityForm.activityType !== 'APPRAISAL_REQUEST'}
                />
              </label>
              <label className="full-span">
                {t('common.description')}
                <textarea
                  rows={4}
                  value={activityForm.description}
                  onChange={(event) =>
                    setActivityForm({ ...activityForm, description: event.target.value })
                  }
                />
              </label>
              <button type="submit" disabled={savingTask}>
                {savingTask ? t('common.loading') : t('calendar.saveTask')}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {composerMode === 'visit' ? (
        <div className="modal-overlay" onClick={closeComposer}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t('calendar.newVisit')}</p>
                <h3>{t('visits.title')}</h3>
                <p className="muted">{formatLongDate(selectedDateKey, locale)}</p>
              </div>
              <button type="button" className="ghost-button" onClick={closeComposer}>
                {t('calendar.closeComposer')}
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateVisit}>
              <label>
                {t('common.property')}
                <select
                  value={visitForm.propertyId}
                  onChange={(event) => setVisitForm({ ...visitForm, propertyId: event.target.value })}
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('common.contact')}
                <ContactCombobox
                  contacts={contacts}
                  value={visitForm.contactId}
                  onChange={(value) => setVisitForm({ ...visitForm, contactId: value })}
                  placeholder={t('contacts.searchPlaceholder')}
                  emptyLabel={t('common.select')}
                  loadingLabel={t('common.loading')}
                  noResultsLabel={t('common.noData')}
                  required
                  remoteSearch
                />
              </label>
              <label>
                {t('common.dateTime')}
                <input
                  type="datetime-local"
                  value={visitForm.scheduledAt}
                  onChange={(event) => setVisitForm({ ...visitForm, scheduledAt: event.target.value })}
                  required
                />
              </label>
              <label>
                {t('common.status')}
                <select
                  value={visitForm.status}
                  onChange={(event) => setVisitForm({ ...visitForm, status: event.target.value })}
                >
                  {visitStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateEnum('visitStatus', option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-span">
                {t('visits.listingUrl')}
                <input
                  type="url"
                  value={visitForm.externalUrl}
                  onChange={(event) => setVisitForm({ ...visitForm, externalUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label className="full-span">
                {t('common.notes')}
                <textarea
                  rows={4}
                  value={visitForm.notes}
                  onChange={(event) => setVisitForm({ ...visitForm, notes: event.target.value })}
                />
              </label>
              <button type="submit" disabled={savingVisit}>
                {savingVisit ? t('common.loading') : t('calendar.saveVisit')}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function createInitialActivityForm(dayKey: string): ActivityFormState {
  return {
    activityType: 'VISIT',
    contactId: '',
    propertyId: '',
    title: '',
    description: '',
    activityDate: `${dayKey}T10:00`,
    nextFollowUpDate: '',
    appraisalPropertyAddress: '',
  };
}

function createInitialVisitForm(dayKey: string): VisitFormState {
  return {
    propertyId: '',
    contactId: '',
    scheduledAt: `${dayKey}T11:00`,
    status: 'SCHEDULED',
    externalUrl: '',
    notes: '',
  };
}

function mapActivityToAgendaItem(activity: Activity): AgendaItem {
  return {
    id: `activity-${activity.id}`,
    entityType: 'activity',
    startsAt: activity.activityDate,
    title: activity.title,
    detail: [activity.contact?.displayName, activity.property?.title].filter(Boolean).join(' - '),
    status: activity.activityType,
    contact: activity.contact,
    property: activity.property,
    notes: activity.description,
  };
}

function mapVisitToAgendaItem(visit: Visit): AgendaItem {
  return {
    id: `visit-${visit.id}`,
    entityType: 'visit',
    startsAt: visit.scheduledAt,
    title:
      visit.property?.title ??
      visit.externalPropertyTitle ??
      (visit.propertyId ? `Property #${visit.propertyId}` : 'Visita externa'),
    detail: visit.contact?.displayName ?? `Contact #${visit.contactId}`,
    status: visit.status,
    contact: visit.contact,
    property: visit.property,
    notes: visit.notes,
    externalUrl: visit.externalUrl,
    visit,
  };
}

function mapBirthdayToAgendaItem(birthday: CalendarBirthdayAgendaItem): AgendaItem {
  return {
    id: birthday.id,
    entityType: 'birthday',
    startsAt: `${birthday.date}T00:00:00`,
    allDay: true,
    title: birthday.displayName,
    detail: `Cumpleanos · ${formatBirthdayLabel(birthday.birthday)}`,
    status: 'BIRTHDAY',
    contact: {
      id: birthday.contactId,
      displayName: birthday.displayName,
      phone: birthday.phone,
      whatsapp: birthday.whatsapp,
    },
  };
}

function mapGoogleEventToAgendaItem(event: CalendarGoogleEventAgendaItem): AgendaItem {
  return {
    id: `google-${event.id}`,
    entityType: 'google',
    startsAt: event.startsAt,
    allDay: event.allDay,
    title: event.title,
    detail: event.description || 'Google Calendar',
    status: 'GOOGLE_CALENDAR',
    notes: event.description,
    externalUrl: event.externalUrl,
  };
}

function isCalendarActivityType(activityType: ActivityType) {
  return calendarActivityTypeOptions.includes(
    activityType as (typeof calendarActivityTypeOptions)[number],
  );
}

function groupAgendaByDay(items: AgendaItem[]) {
  const map = new Map<string, AgendaItem[]>();

  items.forEach((item) => {
    const key = formatDateKey(new Date(item.startsAt));
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  });

  return map;
}

function compareAgendaItems(left: AgendaItem, right: AgendaItem) {
  const leftTime = new Date(left.startsAt).getTime();
  const rightTime = new Date(right.startsAt).getTime();

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (left.allDay !== right.allDay) {
    return left.allDay ? -1 : 1;
  }

  return left.title.localeCompare(right.title, 'es');
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarRange(date: Date) {
  const calendarDays = buildCalendarDays(date);
  const firstDay = calendarDays[0];
  const lastDay = calendarDays[calendarDays.length - 1];

  return {
    fromDate: formatDateKey(firstDay),
    toDate: formatDateKey(lastDay),
  };
}

function buildCalendarDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

function buildWeekdayLabels(locale: 'es' | 'en') {
  const formatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    weekday: 'short',
  });
  const monday = new Date(2024, 0, 1);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return formatter.format(current);
  });
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLongDate(value: string, locale: 'es' | 'en') {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortDateTime(value: string, locale: 'es' | 'en') {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatShortDate(value: string, locale: 'es' | 'en') {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatTime(value: string, locale: 'es' | 'en') {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildCalendarDayLabel(day: Date, itemCount: number, locale: 'es' | 'en') {
  const formattedDate = new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(day);

  if (itemCount === 0) {
    return formattedDate;
  }

  return locale === 'es'
    ? `${formattedDate}. ${itemCount} elemento${itemCount === 1 ? '' : 's'} programado${
        itemCount === 1 ? '' : 's'
      }.`
    : `${formattedDate}. ${itemCount} scheduled item${itemCount === 1 ? '' : 's'}.`;
}

function renderAgendaStatus(
  item: AgendaItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (item.entityType === 'activity' || item.entityType === 'visit') {
    return <StatusPill value={item.status} />;
  }

  if (item.entityType === 'birthday') {
    return <span className="pill pill-active">{t('calendar.birthday')}</span>;
  }

  return <span className="pill pill-note">Google Calendar</span>;
}

function formatBirthdayLabel(value: string) {
  if (value.startsWith('--')) {
    const match = value.match(/^--(\d{2})-(\d{2})$/);
    return match ? `${match[2]}/${match[1]}` : value;
  }

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}`;
}
