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
  activity?: Activity;
};

type ActivityFormState = {
  activityType: ActivityType | 'EXTERNAL_VISIT';
  contactId: string;
  propertyId: string;
  title: string;
  description: string;
  activityDate: string;
  nextFollowUpDate: string;
  appraisalPropertyAddress: string;
  status: string;
  externalUrl: string;
  externalPropertyAddress: string;
};

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
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [taskError, setTaskError] = useState('');
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [sharingVisitId, setSharingVisitId] = useState<number | null>(null);
  const [sharingBirthdayId, setSharingBirthdayId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(() =>
    createInitialActivityForm(formatDateKey(new Date())),
  );
  const isExternalVisit = activityForm.activityType === 'EXTERNAL_VISIT';
  const isEditing = Boolean(editingActivity || editingVisit);


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

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingTask) return;
    setSavingTask(true);
    setTaskError('');

    try {
      if (isExternalVisit) {
        await apiRequest(editingVisit ? `/visits/${editingVisit.id}` : '/visits', {
          method: editingVisit ? 'PATCH' : 'POST',
          body: JSON.stringify({
            contactId: Number(activityForm.contactId),
            propertyId: activityForm.propertyId ? Number(activityForm.propertyId) : null,
            scheduledAt: new Date(activityForm.activityDate).toISOString(),
            status: activityForm.status,
            externalPropertyTitle: activityForm.title.trim()
              || activityForm.externalPropertyAddress.trim()
              || activityForm.externalUrl.trim()
              || null,
            externalPropertyAddress: activityForm.externalPropertyAddress.trim() || null,
            externalUrl: activityForm.externalUrl.trim() || null,
            notes: activityForm.description || null,
          }),
        });
      } else {
        await apiRequest(editingActivity ? `/activities/${editingActivity.id}` : '/activities', {
          method: editingActivity ? 'PATCH' : 'POST',
          body: JSON.stringify({
            contactId: activityForm.contactId ? Number(activityForm.contactId) : null,
            propertyId: activityForm.propertyId ? Number(activityForm.propertyId) : null,
            activityType: activityForm.activityType,
            title:
              activityForm.activityType === 'APPRAISAL_REQUEST'
                ? 'Prelisting'
                : activityForm.title,
            description:
              activityForm.activityType === 'APPRAISAL_REQUEST'
                ? null
                : activityForm.description || null,
            activityDate: new Date(activityForm.activityDate).toISOString(),
            nextFollowUpDate: activityForm.nextFollowUpDate
              ? new Date(activityForm.nextFollowUpDate).toISOString()
              : null,
            appraisalPropertyAddress:
              activityForm.activityType === 'APPRAISAL_REQUEST'
                ? activityForm.appraisalPropertyAddress || undefined
                : undefined,
          }),
        });
      }
      const savedDate = new Date(activityForm.activityDate);
      const savedDayKey = formatDateKey(savedDate);
      setSelectedDateKey(savedDayKey);
      setActivityForm(createInitialActivityForm(savedDayKey));
      setEditingActivity(null);
      setEditingVisit(null);
      setComposerOpen(false);
      if (startOfMonth(savedDate).getTime() !== visibleMonth.getTime()) {
        setVisibleMonth(startOfMonth(savedDate));
      } else {
        await loadAgenda();
      }
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : t('calendar.saveTaskError'));
    } finally {
      setSavingTask(false);
    }
  }

  async function handleRetrySync(item: AgendaItem) {
    if (syncingItemId !== null || (!item.activity && !item.visit)) return;
    setSyncingItemId(item.id);
    setLoadError('');
    try {
      if (item.visit) {
        const updated = await apiRequest<Visit>(`/visits/${item.visit.id}/sync-calendar`, { method: 'POST' });
        setVisits((current) => current.map((visit) => visit.id === updated.id ? updated : visit));
      } else if (item.activity) {
        const updated = await apiRequest<Activity>(`/activities/${item.activity.id}/sync-calendar`, { method: 'POST' });
        setActivities((current) => current.map((activity) => activity.id === updated.id ? updated : activity));
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('calendar.googleSyncFailed'));
    } finally {
      setSyncingItemId(null);
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
    setEditingActivity(null);
    setEditingVisit(null);
    setTaskError('');
    setSelectedDateKey(dayKey);
    setActivityForm(createInitialActivityForm(dayKey));
    setComposerOpen(true);
  }

  function openActivityEditor(activity: Activity) {
    const { contact, property } = activity;
    setEditingActivity(activity);
    setEditingVisit(null);
    setTaskError('');
    setSelectedDateKey(formatDateKey(new Date(activity.activityDate)));
    setActivityForm({
      ...createInitialActivityForm(formatDateKey(new Date(activity.activityDate))),
      activityType: activity.activityType,
      contactId: activity.contactId ? String(activity.contactId) : '',
      propertyId: activity.propertyId ? String(activity.propertyId) : '',
      title: activity.title,
      description: activity.description ?? '',
      activityDate: toDateTimeLocalValue(activity.activityDate),
      nextFollowUpDate: toDateTimeLocalValue(activity.nextFollowUpDate),
      appraisalPropertyAddress: activity.appraisalRequest?.propertyAddress ?? '',
    });
    if (contact) {
      setContacts((current) =>
        current.some((item) => item.id === contact.id) ? current : [...current, contact],
      );
    }
    if (property) {
      setProperties((current) =>
        current.some((item) => item.id === property.id) ? current : [...current, property],
      );
    }
    setComposerOpen(true);
  }

  function openAgendaEditor(item: AgendaItem) {
    if (item.activity) {
      openActivityEditor(item.activity);
    } else if (item.visit) {
      const visit = item.visit;
      const dayKey = formatDateKey(new Date(visit.scheduledAt));
      setEditingActivity(null);
      setEditingVisit(visit);
      setTaskError('');
      setSelectedDateKey(dayKey);
      setActivityForm({
        ...createInitialActivityForm(dayKey),
        activityType: 'EXTERNAL_VISIT',
        contactId: String(visit.contactId),
        propertyId: visit.propertyId ? String(visit.propertyId) : '',
        title: visit.externalPropertyTitle ?? '',
        description: visit.notes ?? '',
        activityDate: toDateTimeLocalValue(visit.scheduledAt),
        status: visit.status,
        externalUrl: visit.externalUrl ?? '',
        externalPropertyAddress: visit.externalPropertyAddress ?? '',
      });
      const { contact, property } = visit;
      if (contact) {
        setContacts((current) => current.some((item) => item.id === contact.id) ? current : [...current, contact]);
      }
      if (property) {
        setProperties((current) => current.some((item) => item.id === property.id) ? current : [...current, property]);
      }
      setComposerOpen(true);
    }
  }

  function closeComposer() {
    if (savingTask) return;
    setComposerOpen(false);
    setEditingActivity(null);
    setEditingVisit(null);
    setTaskError('');
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
            <strong className="calendar-summary-value">{schedulableActivities.length + visits.length}</strong>
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
                  onDoubleClick={() => openTaskComposer(dayKey)}
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
            </div>
          </div>

          <div className="stack-gap">
            {selectedItems.length ? (
              selectedItems.map((item) => {
                const record = item.activity ?? item.visit;
                return (
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
                    {record ? (
                      <div className="stack-gap" aria-live="polite">
                        <p className="muted">
                          {record.googleSyncStatus === 'SYNCED'
                            ? t('calendar.googleSynced')
                            : record.googleSyncStatus === 'ERROR'
                              ? t('calendar.googleSyncFailed')
                              : record.googleSyncStatus === 'NOT_CONNECTED'
                                ? t('calendar.googleSyncNotConnected')
                                : t('calendar.googleSyncPending')}
                        </p>
                        {record.googleSyncStatus === 'ERROR' && record.googleSyncError ? (
                          <p className="agenda-notes">{record.googleSyncError}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="agenda-links">
                      {record ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => openAgendaEditor(item)}
                        >
                          {t('activities.editActivity')}
                        </button>
                      ) : null}
                      {record && record.googleSyncStatus !== 'SYNCED' ? (
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={syncingItemId !== null}
                          onClick={() => void handleRetrySync(item)}
                        >
                          {syncingItemId === item.id
                            ? t('common.loading')
                            : t('calendar.retryGoogleSync')}
                        </button>
                      ) : null}
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
                );
              })
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
                  {item.activity || item.visit ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => openAgendaEditor(item)}
                    >
                      {t('activities.editActivity')}
                    </button>
                  ) : null}
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

      {composerOpen ? (
        <div className="modal-overlay" onClick={closeComposer}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{isEditing ? t('activities.editActivity') : t('calendar.newTask')}</p>
                <h3>{isEditing ? t('activities.editActivity') : t('calendar.taskTitle')}</h3>
                <p className="muted">{formatLongDate(selectedDateKey, locale)}</p>
              </div>
              <button type="button" className="ghost-button" onClick={closeComposer}>
                {t('calendar.closeComposer')}
              </button>
            </div>
            {taskError ? <div className="alert" role="alert">{taskError}</div> : null}
            <form className="form-grid" onSubmit={handleSaveTask}>
              <label>
                {t('common.type')}
                <select
                  value={activityForm.activityType}
                  disabled={Boolean(editingVisit) || editingActivity?.activityType === 'APPRAISAL_REQUEST'}
                  onChange={(event) =>
                    setActivityForm({
                      ...activityForm,
                      activityType: event.target.value as ActivityFormState['activityType'],
                    })
                  }
                >
                  {calendarActivityTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateEnum('activityType', option)}
                    </option>
                  ))}
                  <option value="EXTERNAL_VISIT" disabled={Boolean(editingActivity)}>
                    {t('calendar.externalVisitType')}
                  </option>
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
                  emptyLabel={isExternalVisit ? t('common.select') : t('calendar.contactOptional')}
                  loadingLabel={t('common.loading')}
                  noResultsLabel={t('common.noData')}
                  required={isExternalVisit || activityForm.activityType === 'APPRAISAL_REQUEST'}
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
              {!isExternalVisit ? <label>
                {t('activities.nextFollowUp')}
                <input
                  type="datetime-local"
                  value={activityForm.nextFollowUpDate}
                  onChange={(event) =>
                    setActivityForm({ ...activityForm, nextFollowUpDate: event.target.value })
                  }
                />
              </label> : null}
              {isExternalVisit ? (
                <>
                  <label>
                    {t('common.status')}
                    <select value={activityForm.status} onChange={(event) => setActivityForm({ ...activityForm, status: event.target.value })}>
                      {visitStatusOptions.map((status) => (
                        <option key={status} value={status}>{translateEnum('visitStatus', status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="full-span">
                    {t('calendar.externalPropertyAddress')}
                    <input value={activityForm.externalPropertyAddress} onChange={(event) => setActivityForm({ ...activityForm, externalPropertyAddress: event.target.value })} />
                  </label>
                  <label className="full-span">
                    {t('visits.listingUrl')}
                    <input type="url" placeholder="https://..." value={activityForm.externalUrl} onChange={(event) => setActivityForm({ ...activityForm, externalUrl: event.target.value })} />
                  </label>
                </>
              ) : null}
              <label className="full-span">
                {isExternalVisit ? t('calendar.externalPropertyTitle') : t('common.title')}
                <input
                  value={activityForm.title}
                  onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })}
                  required={isExternalVisit
                    ? !activityForm.propertyId && !activityForm.externalPropertyAddress.trim() && !activityForm.externalUrl.trim()
                    : activityForm.activityType !== 'APPRAISAL_REQUEST'}
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
                {savingTask
                  ? t('common.loading')
                  : isEditing ? t('common.saveChanges') : t('calendar.saveTask')}
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
    status: 'SCHEDULED',
    externalUrl: '',
    externalPropertyAddress: '',
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
    activity,
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
    detail: [visit.contact?.displayName ?? `Contact #${visit.contactId}`, visit.externalPropertyAddress].filter(Boolean).join(' - '),
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

function toDateTimeLocalValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateKey(date)}T${hours}:${minutes}`;
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
  if (item.entityType === 'visit') {
    return <div><span className="pill">{t('calendar.externalVisitType')}</span> <StatusPill value={item.status} /></div>;
  }

  if (item.entityType === 'activity') {
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
