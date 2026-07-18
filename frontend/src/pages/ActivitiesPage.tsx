import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import {
  buildAppraisalMailtoUrl,
  buildAppraisalWhatsappMessage,
  buildPublicAppraisalUrl,
  canShareAppraisalByEmail,
  canShareAppraisalByWhatsApp,
  getAppraisalRequestStatus,
  isAppraisalRequestAvailable,
} from '../lib/appraisals';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import {
  buildPropertySearchMessage,
  buildReservationTreasuryWhatsappMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from '../lib/whatsapp';
import type { Activity, Contact, Paginated } from '../types';

type ActivityGroupBy = 'NONE' | 'ACTIVITY_TYPE' | 'CONTACT' | 'ACTIVITY_DATE';

export function ActivitiesPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialFilters = parseActivityFilters(searchParams);
  const processedSearchStringRef = useRef(searchParams.toString());
  const [response, setResponse] = useState<Paginated<Activity> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(hasAnyActivityFilter(initialFilters));
  const [activityDate, setActivityDate] = useState(initialFilters.activityDate);
  const [contactId, setContactId] = useState(initialFilters.contactId);
  const [activityType, setActivityType] = useState(initialFilters.activityType);
  const [propertySearchFeedback, setPropertySearchFeedback] = useState(
    initialFilters.propertySearchFeedback,
  );
  const [nextFollowUpStatus, setNextFollowUpStatus] = useState(
    initialFilters.nextFollowUpStatus,
  );
  const [whatsappShareStatus, setWhatsappShareStatus] = useState(
    initialFilters.whatsappShareStatus,
  );
  const [groupBy, setGroupBy] = useState<ActivityGroupBy>('ACTIVITY_TYPE');
  const [sharingActivityId, setSharingActivityId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const groupedActivities = useMemo(
    () =>
      buildActivityGroups(response?.items ?? [], groupBy, {
        listTitle: t('activities.listTitle'),
        withoutContact: t('activities.withoutContact'),
        translateActivityType: (value) => translateEnum('activityType', value),
        formatGroupDate: formatActivityGroupDate,
      }),
    [groupBy, response?.items, t, translateEnum],
  );

  async function load(
    nextPage = page,
    filters: {
      activityDate?: string;
      contactId?: string;
      activityType?: string;
      propertySearchFeedback?: string;
      nextFollowUpStatus?: string;
      whatsappShareStatus?: string;
    } = {},
  ) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    const nextActivityDate = filters.activityDate ?? activityDate;
    const nextContactId = filters.contactId ?? contactId;
    const nextActivityType = filters.activityType ?? activityType;
    const nextPropertySearchFeedback =
      filters.propertySearchFeedback ?? propertySearchFeedback;
    const nextNextFollowUpStatus =
      filters.nextFollowUpStatus ?? nextFollowUpStatus;
    const nextWhatsappShareStatus =
      filters.whatsappShareStatus ?? whatsappShareStatus;

    if (nextActivityDate) {
      params.set('fromDate', nextActivityDate);
      params.set('toDate', nextActivityDate);
    }

    if (nextContactId) params.set('contactId', nextContactId);
    if (nextActivityType) params.set('activityType', nextActivityType);
    if (nextPropertySearchFeedback) {
      params.set('propertySearchFeedback', nextPropertySearchFeedback);
    }
    if (nextNextFollowUpStatus) {
      params.set('nextFollowUpStatus', nextNextFollowUpStatus);
    }
    if (nextWhatsappShareStatus) {
      params.set('whatsappShareStatus', nextWhatsappShareStatus);
    }

    const data = await apiRequest<Paginated<Activity>>(
      `/activities?${params.toString()}`,
    );
    setResponse(data);
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  useEffect(() => {
    async function loadContacts() {
      const data = await apiRequest<Paginated<Contact>>(
        '/contacts?page=1&limit=100',
      );
      setContacts(data.items);
    }

    void loadContacts();
  }, []);

  useEffect(() => {
    const nextSearchString = searchParams.toString();
    if (nextSearchString === processedSearchStringRef.current) {
      return;
    }

    processedSearchStringRef.current = nextSearchString;
    const nextFilters = parseActivityFilters(searchParams);
    setActivityDate(nextFilters.activityDate);
    setContactId(nextFilters.contactId);
    setActivityType(nextFilters.activityType);
    setPropertySearchFeedback(nextFilters.propertySearchFeedback);
    setNextFollowUpStatus(nextFilters.nextFollowUpStatus);
    setWhatsappShareStatus(nextFilters.whatsappShareStatus);
    setFiltersOpen(hasAnyActivityFilter(nextFilters));
    setPage(1);
    void load(1, nextFilters);
  }, [searchParams]);

  async function handleApplyFilters() {
    setPage(1);
    await load(1);
  }

  async function handleClearFilters() {
    setActivityDate('');
    setContactId('');
    setActivityType('');
    setPropertySearchFeedback('');
    setNextFollowUpStatus('');
    setWhatsappShareStatus('');
    setPage(1);
    await load(1, {
      activityDate: '',
      contactId: '',
      activityType: '',
      propertySearchFeedback: '',
      nextFollowUpStatus: '',
      whatsappShareStatus: '',
    });
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteActivity'))) return;
    await apiRequest(`/activities/${id}`, { method: 'DELETE' });
    await load(page);
  }

  async function handleSendWhatsapp(activity: Activity) {
    setSharingActivityId(activity.id);
    setActionError('');

    try {
      if (
        activity.activityType === 'PROPERTY_SEARCH' &&
        activity.contact &&
        activity.externalUrl
      ) {
        const message = buildPropertySearchMessage(activity);
        openWhatsAppShareUrl(buildWhatsAppShareUrl(activity.contact, message));
        await apiRequest<Activity>(`/activities/${activity.id}/share`, {
          method: 'PATCH',
          body: JSON.stringify({
            whatsappComment: activity.whatsappComment ?? undefined,
          }),
        });
        await load(page);
      } else if (
        activity.activityType === 'APPRAISAL_REQUEST' &&
        activity.contact &&
        activity.appraisalRequest
      ) {
        const message = buildAppraisalWhatsappMessage(
          activity.appraisalRequest.publicToken,
          buildAppraisalShareMessage(activity.contact),
        );
        openWhatsAppShareUrl(buildWhatsAppShareUrl(activity.contact, message));
      } else if (activity.activityType === 'RESERVATION') {
        const treasuryPhone =
          user?.activeTeamWhatsappTreasuryPhone?.trim() || '';
        if (!treasuryPhone) {
          throw new Error(
            'Falta configurar el numero de WhatsApp de tesoreria para este equipo',
          );
        }

        const message = buildReservationTreasuryWhatsappMessage(
          activity,
          user?.name ?? null,
        );
        openWhatsAppShareUrl(
          buildWhatsAppShareUrl(
            { whatsapp: treasuryPhone, phone: null },
            message,
          ),
        );
        await apiRequest<Activity>(`/activities/${activity.id}/share`, {
          method: 'PATCH',
          body: JSON.stringify({}),
        });
        await load(page);
      } else {
        throw new Error(t('common.whatsappSendFailed'));
      }

      window.alert(t('common.whatsappSent'));
    } catch (sendError) {
      setActionError(
        sendError instanceof Error
          ? sendError.message
          : t('common.whatsappSendFailed'),
      );
    } finally {
      setSharingActivityId(null);
    }
  }

  async function handleCopyAppraisalLink(activity: Activity) {
    if (!activity.appraisalRequest) return;
    await navigator.clipboard.writeText(
      buildPublicAppraisalUrl(activity.appraisalRequest.publicToken),
    );
    window.alert(t('appraisals.copySuccess'));
  }

  function buildAppraisalShareMessage(contact: Contact) {
    const name = contact.firstName || contact.displayName;
    return t('appraisals.shareMessage').replace('{name}', name ? ` ${name}` : '');
  }

  function handleShareAppraisalEmail(activity: Activity) {
    if (
      !activity.contact ||
      !activity.appraisalRequest ||
      !canShareAppraisalByEmail(activity.contact)
    ) {
      return;
    }

    window.location.href = buildAppraisalMailtoUrl(
      activity.contact,
      activity.appraisalRequest.publicToken,
      t('appraisals.shareEmailSubject'),
      buildAppraisalShareMessage(activity.contact),
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('activities.eyebrow')}
        title={t('activities.title')}
        actions={
          <>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setFiltersOpen((current) => !current)}
            >
              {filtersOpen ? t('activities.hideFilters') : t('activities.filters')}
            </button>
            <Link to="/activities/new" className="button-link">
              {t('activities.newActivity')}
            </Link>
          </>
        }
      />

      {filtersOpen ? (
        <section className="card filters-panel">
          <div className="filters-grid">
            <label>
              {t('common.contact')}
              <select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                aria-label={t('common.contact')}
              >
                <option value="">{t('activities.allContacts')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.type')}
              <select
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
                aria-label={t('common.type')}
              >
                <option value="">{t('activities.allTypes')}</option>
                {activityTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('activityType', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('activities.buyerFeedback')}
              <select
                value={propertySearchFeedback}
                onChange={(event) =>
                  setPropertySearchFeedback(event.target.value)
                }
                aria-label={t('activities.buyerFeedback')}
              >
                <option value="">{t('activities.allResponses')}</option>
                <option value="LIKED">{t('activities.likedProperty')}</option>
                <option value="DISLIKED">{t('activities.dislikedProperty')}</option>
                <option value="PENDING">{t('activities.pendingFeedback')}</option>
              </select>
            </label>
            <label>
              {t('activities.activityDate')}
              <input
                type="date"
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value)}
                aria-label={t('activities.activityDate')}
              />
            </label>
            <label>
              {t('activities.followUpFilter')}
              <select
                value={nextFollowUpStatus}
                onChange={(event) => setNextFollowUpStatus(event.target.value)}
                aria-label={t('activities.followUpFilter')}
              >
                <option value="">{t('activities.allFollowUps')}</option>
                <option value="DUE_TODAY">{t('activities.followUpDueToday')}</option>
                <option value="OVERDUE">{t('activities.followUpOverdue')}</option>
              </select>
            </label>
            <label>
              {t('activities.whatsappShareFilter')}
              <select
                value={whatsappShareStatus}
                onChange={(event) => setWhatsappShareStatus(event.target.value)}
                aria-label={t('activities.whatsappShareFilter')}
              >
                <option value="">{t('activities.allShareStatuses')}</option>
                <option value="PENDING">{t('activities.pendingShareStatus')}</option>
                <option value="SHARED">{t('activities.sharedShareStatus')}</option>
              </select>
            </label>
          </div>
          <div className="filters-actions">
            <button type="button" onClick={handleApplyFilters}>
              {t('common.apply')}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleClearFilters}
            >
              {t('common.clear')}
            </button>
          </div>
        </section>
      ) : null}

      {actionError ? <div className="card">{actionError}</div> : null}

      <PaginatedListCard
        title={t('activities.listTitle')}
        page={response?.meta.page ?? 1}
        totalPages={response?.meta.totalPages ?? 1}
        pageLabel={t('contacts.page')}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
        onPrevious={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      >
        <div className="activities-list-toolbar">
          <label className="activities-group-by">
            <span>{t('activities.groupBy')}</span>
            <select
              value={groupBy}
              onChange={(event) =>
                setGroupBy(event.target.value as ActivityGroupBy)
              }
              aria-label={t('activities.groupBy')}
            >
              <option value="ACTIVITY_TYPE">
                {t('activities.groupByActivityType')}
              </option>
              <option value="CONTACT">{t('activities.groupByContact')}</option>
              <option value="ACTIVITY_DATE">
                {t('activities.groupByActivityDate')}
              </option>
              <option value="NONE">{t('activities.groupByNone')}</option>
            </select>
          </label>
        </div>

        {groupBy === 'NONE'
          ? (response?.items ?? []).map((activity) => (
              <ActivityListItem
                key={activity.id}
                activity={activity}
                formatDateTime={formatDateTime}
                onCopyAppraisalLink={handleCopyAppraisalLink}
                onDelete={handleDelete}
                onSendWhatsapp={handleSendWhatsapp}
                onShareAppraisalEmail={handleShareAppraisalEmail}
                sharingActivityId={sharingActivityId}
                t={t}
                translateEnum={translateEnum}
              />
            ))
          : groupedActivities.map((group) => (
              <section key={group.key} className="activities-group">
                <div className="activities-group-header">
                  <strong>{group.label}</strong>
                  <span className="activities-group-count">{group.items.length}</span>
                </div>
                <div className="activities-group-items">
                  {group.items.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      formatDateTime={formatDateTime}
                      onCopyAppraisalLink={handleCopyAppraisalLink}
                      onDelete={handleDelete}
                      onSendWhatsapp={handleSendWhatsapp}
                      onShareAppraisalEmail={handleShareAppraisalEmail}
                      sharingActivityId={sharingActivityId}
                      t={t}
                      translateEnum={translateEnum}
                    />
                  ))}
                </div>
              </section>
            ))}
      </PaginatedListCard>
    </div>
  );
}

function parseActivityFilters(searchParams: URLSearchParams) {
  return {
    activityDate: searchParams.get('activityDate') ?? '',
    contactId: searchParams.get('contactId') ?? '',
    activityType: searchParams.get('activityType') ?? '',
    propertySearchFeedback: searchParams.get('propertySearchFeedback') ?? '',
    nextFollowUpStatus: searchParams.get('nextFollowUpStatus') ?? '',
    whatsappShareStatus: searchParams.get('whatsappShareStatus') ?? '',
  };
}

function hasAnyActivityFilter(filters: ReturnType<typeof parseActivityFilters>) {
  return Object.values(filters).some(Boolean);
}

function ActivityListItem({
  activity,
  formatDateTime,
  onCopyAppraisalLink,
  onDelete,
  onSendWhatsapp,
  onShareAppraisalEmail,
  sharingActivityId,
  t,
  translateEnum,
}: {
  activity: Activity;
  formatDateTime: (value: string) => string;
  onCopyAppraisalLink: (activity: Activity) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSendWhatsapp: (activity: Activity) => Promise<void>;
  onShareAppraisalEmail: (activity: Activity) => void;
  sharingActivityId: number | null;
  t: (path: string) => string;
  translateEnum: (group: 'activityType' | 'operationType', value: string) => string;
}) {
  const appraisalRequest = activity.appraisalRequest;
  const appraisalStatus = appraisalRequest
    ? getAppraisalRequestStatus(appraisalRequest)
    : null;
  const canShareAppraisal =
    activity.activityType === 'APPRAISAL_REQUEST' &&
    appraisalRequest &&
    isAppraisalRequestAvailable(appraisalRequest) &&
    Boolean(activity.contact);

  return (
    <article className="list-item list-item-actions">
      <div>
        <strong>{activity.title}</strong>
        <p className="muted">
          {activity.contact?.displayName ?? t('activities.withoutContact')} -{' '}
          {formatDateTime(activity.activityDate)}
        </p>
        {activity.contactId ? (
          <Link
            to={buildContactHistoryLink(activity.contactId)}
            className="agenda-link"
          >
            {t('activities.openContactHistory')}
          </Link>
        ) : null}
        {activity.property ? (
          <p className="muted">
            {t('activities.linkedProperty')}: {activity.property.title}
          </p>
        ) : null}
        {activity.activityType === 'PROPERTY_SEARCH' &&
        activity.propertySearchLiked !== null ? (
          <p className="muted">
            {activity.propertySearchLiked
              ? t('activities.likedProperty')
              : t('activities.dislikedProperty')}
          </p>
        ) : null}
        {activity.activityType === 'APPRAISAL_REQUEST' && appraisalStatus ? (
          <p className="muted">
            {appraisalStatus === 'COMPLETED'
              ? t('activities.appraisalCompleted')
              : appraisalStatus === 'EXPIRED'
                ? t('activities.appraisalExpired')
                : t('activities.appraisalPending')}
          </p>
        ) : null}
        {activity.whatsappComment ? (
          <p className="muted">{activity.whatsappComment}</p>
        ) : null}
        {activity.description ? <p className="muted">{activity.description}</p> : null}
        {activity.activityType === 'RESERVATION' && activity.reservationData ? (
          <p className="muted">
            {activity.reservationData.operationType
              ? `${translateEnum('operationType', activity.reservationData.operationType)} - `
              : ''}
            {activity.reservationData.propertyAddress ?? activity.property?.address ?? ''}
            {activity.reservationData.propertyNeighborhood
              ? ` - ${activity.reservationData.propertyNeighborhood}`
              : ''}
          </p>
        ) : null}
        {activity.activityType === 'PROPERTY_SEARCH' ? (
          <ActivityPreviewCard
            activity={activity}
            title={t('activities.listingPreview')}
          />
        ) : null}
        {activity.activityType === 'PROPERTY_SEARCH' ? (
          <p className="muted">
            {activity.whatsappSharedAt
              ? `${t('activities.sharedAt')}: ${formatDateTime(activity.whatsappSharedAt)}`
              : t('activities.pendingShare')}
          </p>
        ) : null}
        {activity.activityType === 'RESERVATION' && activity.whatsappSharedAt ? (
          <p className="muted">
            {t('activities.reservationSentAt')}:{' '}
            {formatDateTime(activity.whatsappSharedAt)}
          </p>
        ) : null}
        <div className="candidate-actions">
          <StatusPill value={activity.activityType} />
          {activity.externalUrl ? (
            <a
              href={activity.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="agenda-link"
            >
              {activity.activityType === 'RESERVATION'
                ? t('activities.reservationDocumentOpen')
                : t('activities.openListing')}
            </a>
          ) : null}
          {appraisalRequest ? (
            <Link
              to={`/appraisals/${appraisalRequest.id}/edit`}
              className="agenda-link"
            >
              {t('activities.openAppraisalRequest')}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="candidate-actions">
        <Link to={`/activities/${activity.id}/edit`} className="ghost-button button-link">
          {t('activities.editActivity')}
        </Link>
        {activity.activityType === 'PROPERTY_SEARCH' &&
        activity.externalUrl &&
        !activity.whatsappSharedAt &&
        activity.contact &&
        getContactWhatsappPhone(activity.contact) ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => void onSendWhatsapp(activity)}
            disabled={sharingActivityId === activity.id}
          >
            {sharingActivityId === activity.id
              ? t('common.loading')
              : t('activities.shareNow')}
          </button>
        ) : null}
        {activity.activityType === 'APPRAISAL_REQUEST' && appraisalRequest ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => void onCopyAppraisalLink(activity)}
          >
            {t('appraisals.copyLink')}
          </button>
        ) : null}
        {canShareAppraisal &&
        activity.contact &&
        canShareAppraisalByWhatsApp(activity.contact) ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => void onSendWhatsapp(activity)}
            disabled={sharingActivityId === activity.id}
          >
            {sharingActivityId === activity.id
              ? t('common.loading')
              : t('appraisals.shareWhatsApp')}
          </button>
        ) : null}
        {canShareAppraisal &&
        activity.contact &&
        canShareAppraisalByEmail(activity.contact) ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => onShareAppraisalEmail(activity)}
          >
            {t('appraisals.shareEmail')}
          </button>
        ) : null}
        {activity.activityType === 'RESERVATION' && activity.externalUrl ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => void onSendWhatsapp(activity)}
            disabled={sharingActivityId === activity.id}
          >
            {sharingActivityId === activity.id
              ? t('common.loading')
              : activity.whatsappSharedAt
                ? t('activities.reservationResendTreasury')
                : t('activities.reservationSendTreasury')}
          </button>
        ) : null}
        <button
          type="button"
          className="ghost-button"
          onClick={() => void onDelete(activity.id)}
        >
          {t('common.delete')}
        </button>
      </div>
    </article>
  );
}

function buildActivityGroups(
  activities: Activity[],
  groupBy: ActivityGroupBy,
  labels: {
    listTitle: string;
    withoutContact: string;
    translateActivityType: (value: string) => string;
    formatGroupDate: (value: string) => string;
  },
) {
  if (groupBy === 'NONE') {
    return [];
  }

  const groups = new Map<string, { key: string; label: string; items: Activity[] }>();

  for (const activity of activities) {
    const descriptor = getActivityGroupDescriptor(activity, groupBy, labels);
    const current = groups.get(descriptor.key);

    if (current) {
      current.items.push(activity);
      continue;
    }

    groups.set(descriptor.key, {
      key: descriptor.key,
      label: descriptor.label,
      items: [activity],
    });
  }

  return Array.from(groups.values());
}

function getActivityGroupDescriptor(
  activity: Activity,
  groupBy: Exclude<ActivityGroupBy, 'NONE'>,
  labels: {
    listTitle: string;
    withoutContact: string;
    translateActivityType: (value: string) => string;
    formatGroupDate: (value: string) => string;
  },
) {
  switch (groupBy) {
    case 'CONTACT':
      return {
        key: `contact:${activity.contactId ?? 'none'}`,
        label: activity.contact?.displayName ?? labels.withoutContact,
      };
    case 'ACTIVITY_DATE': {
      const dateGroup = buildActivityDateGroup(activity.activityDate);
      return {
        key: `activity-date:${dateGroup.key}`,
        label: labels.formatGroupDate(dateGroup.labelSource),
      };
    }
    case 'ACTIVITY_TYPE':
    default:
      return {
        key: `activity-type:${activity.activityType}`,
        label: labels.translateActivityType(activity.activityType),
      };
  }
}

function buildActivityDateGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      key: value,
      labelSource: value,
    };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    key: `${year}-${month}-${day}`,
    labelSource: value,
  };
}

function formatActivityGroupDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function buildContactHistoryLink(contactId: number) {
  const params = new URLSearchParams({
    contactId: String(contactId),
  });

  return `/activities?${params.toString()}`;
}

function ActivityPreviewCard({
  activity,
  title,
}: {
  activity: Activity;
  title: string;
}) {
  const previewTitle = activity.externalPreviewTitle ?? activity.title;
  const previewDescription = activity.externalPreviewDescription;
  const previewDomain = activity.externalPreviewDomain;
  const previewImageUrl = activity.externalPreviewImageUrl;
  const previewCardClassName = previewImageUrl
    ? 'activity-preview-card'
    : 'activity-preview-card activity-preview-card-no-image';

  if (!previewTitle && !previewDescription && !previewImageUrl && !previewDomain) {
    return null;
  }

  return (
    <div className={previewCardClassName}>
      {previewImageUrl ? (
        <img
          src={previewImageUrl}
          alt={previewTitle ?? title}
          className="activity-preview-image"
        />
      ) : null}
      <div className="activity-preview-copy">
        <p className="eyebrow activity-preview-eyebrow">{title}</p>
        {previewTitle ? <strong>{previewTitle}</strong> : null}
        {previewDescription ? (
          <p className="muted activity-preview-description">
            {previewDescription}
          </p>
        ) : null}
        {previewDomain ? <p className="muted">{previewDomain}</p> : null}
      </div>
    </div>
  );
}
