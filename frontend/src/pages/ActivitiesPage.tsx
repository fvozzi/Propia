import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import {
  buildAppraisalMailtoUrl,
  buildPublicAppraisalUrl,
  canShareAppraisalByEmail,
  canShareAppraisalByWhatsApp,
  getAppraisalRequestStatus,
  isAppraisalRequestAvailable,
} from '../lib/appraisals';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import { getContactWhatsappPhone } from '../lib/whatsapp';
import type { Activity, Contact, Paginated } from '../types';

export function ActivitiesPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [response, setResponse] = useState<Paginated<Activity> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activityDate, setActivityDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [activityType, setActivityType] = useState('');
  const [propertySearchFeedback, setPropertySearchFeedback] = useState('');
  const [sharingActivityId, setSharingActivityId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  async function load(
    nextPage = page,
    filters: {
      activityDate?: string;
      contactId?: string;
      activityType?: string;
      propertySearchFeedback?: string;
    } = {},
  ) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    const nextActivityDate = filters.activityDate ?? activityDate;
    const nextContactId = filters.contactId ?? contactId;
    const nextActivityType = filters.activityType ?? activityType;
    const nextPropertySearchFeedback = filters.propertySearchFeedback ?? propertySearchFeedback;

    if (nextActivityDate) {
      params.set('fromDate', nextActivityDate);
      params.set('toDate', nextActivityDate);
    }

    if (nextContactId) params.set('contactId', nextContactId);
    if (nextActivityType) params.set('activityType', nextActivityType);
    if (nextPropertySearchFeedback) params.set('propertySearchFeedback', nextPropertySearchFeedback);

    const data = await apiRequest<Paginated<Activity>>(`/activities?${params.toString()}`);
    setResponse(data);
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  useEffect(() => {
    async function loadContacts() {
      const data = await apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100');
      setContacts(data.items);
    }

    void loadContacts();
  }, []);

  async function handleApplyFilters() {
    setPage(1);
    await load(1);
  }

  async function handleClearFilters() {
    setActivityDate('');
    setContactId('');
    setActivityType('');
    setPropertySearchFeedback('');
    setPage(1);
    await load(1, {
      activityDate: '',
      contactId: '',
      activityType: '',
      propertySearchFeedback: '',
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
      await apiRequest<Activity>(`/activities/${activity.id}/send-whatsapp`, {
        method: 'POST',
      });
      window.alert(t('common.whatsappSent'));
      await load(page);
    } catch (sendError) {
      setActionError(
        sendError instanceof Error ? sendError.message : t('common.whatsappSendFailed'),
      );
    } finally {
      setSharingActivityId(null);
    }
  }

  async function handleCopyAppraisalLink(activity: Activity) {
    if (!activity.appraisalRequest) return;
    await navigator.clipboard.writeText(buildPublicAppraisalUrl(activity.appraisalRequest.publicToken));
    window.alert(t('appraisals.copySuccess'));
  }

  function buildAppraisalShareMessage(contact: Contact) {
    const name = contact.firstName || contact.displayName;
    return t('appraisals.shareMessage').replace('{name}', name ? ` ${name}` : '');
  }

  function handleShareAppraisalEmail(activity: Activity) {
    if (!activity.contact || !activity.appraisalRequest || !canShareAppraisalByEmail(activity.contact)) return;
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
            <button type="button" className="ghost-button" onClick={() => setFiltersOpen((current) => !current)}>
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
              <select value={contactId} onChange={(event) => setContactId(event.target.value)} aria-label={t('common.contact')}>
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
                onChange={(event) => setPropertySearchFeedback(event.target.value)}
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
              <input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} aria-label={t('activities.activityDate')} />
            </label>
          </div>
          <div className="filters-actions">
            <button type="button" onClick={handleApplyFilters}>
              {t('common.apply')}
            </button>
            <button type="button" className="ghost-button" onClick={handleClearFilters}>
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
        {(response?.items ?? []).map((activity) => {
          const appraisalRequest = activity.appraisalRequest;
          const appraisalStatus = appraisalRequest ? getAppraisalRequestStatus(appraisalRequest) : null;
          const canShareAppraisal =
            activity.activityType === 'APPRAISAL_REQUEST' &&
            appraisalRequest &&
            isAppraisalRequestAvailable(appraisalRequest) &&
            Boolean(activity.contact);

          return (
            <article key={activity.id} className="list-item list-item-actions">
              <div>
                <strong>{activity.title}</strong>
                <p className="muted">
                  {activity.contact?.displayName ?? t('activities.withoutContact')} · {formatDateTime(activity.activityDate)}
                </p>
                {activity.property ? (
                  <p className="muted">
                    {t('activities.linkedProperty')}: {activity.property.title}
                  </p>
                ) : null}
                {activity.activityType === 'PROPERTY_SEARCH' && activity.propertySearchLiked !== null ? (
                  <p className="muted">
                    {activity.propertySearchLiked ? t('activities.likedProperty') : t('activities.dislikedProperty')}
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
                {activity.whatsappComment ? <p className="muted">{activity.whatsappComment}</p> : null}
                {activity.description ? <p className="muted">{activity.description}</p> : null}
                {activity.activityType === 'PROPERTY_SEARCH' ? (
                  <ActivityPreviewCard activity={activity} title={t('activities.listingPreview')} />
                ) : null}
                {activity.activityType === 'PROPERTY_SEARCH' ? (
                  <p className="muted">
                    {activity.whatsappSharedAt
                      ? `${t('activities.sharedAt')}: ${formatDateTime(activity.whatsappSharedAt)}`
                      : t('activities.pendingShare')}
                  </p>
                ) : null}
                <div className="candidate-actions">
                  <StatusPill value={activity.activityType} />
                  {activity.externalUrl ? (
                    <a href={activity.externalUrl} target="_blank" rel="noreferrer" className="agenda-link">
                      {t('activities.openListing')}
                    </a>
                  ) : null}
                  {appraisalRequest ? (
                    <Link to={`/appraisals/${appraisalRequest.id}/edit`} className="agenda-link">
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
                    onClick={() => handleSendWhatsapp(activity)}
                    disabled={sharingActivityId === activity.id}
                  >
                    {sharingActivityId === activity.id ? t('common.loading') : t('activities.shareNow')}
                  </button>
                ) : null}
                {activity.activityType === 'APPRAISAL_REQUEST' && appraisalRequest ? (
                  <button type="button" className="ghost-button" onClick={() => handleCopyAppraisalLink(activity)}>
                    {t('appraisals.copyLink')}
                  </button>
                ) : null}
                {canShareAppraisal && activity.contact && canShareAppraisalByWhatsApp(activity.contact) ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleSendWhatsapp(activity)}
                    disabled={sharingActivityId === activity.id}
                  >
                    {sharingActivityId === activity.id
                      ? t('common.loading')
                      : t('appraisals.shareWhatsApp')}
                  </button>
                ) : null}
                {canShareAppraisal && activity.contact && canShareAppraisalByEmail(activity.contact) ? (
                  <button type="button" className="ghost-button" onClick={() => handleShareAppraisalEmail(activity)}>
                    {t('appraisals.shareEmail')}
                  </button>
                ) : null}
                <button type="button" className="ghost-button" onClick={() => handleDelete(activity.id)}>
                  {t('common.delete')}
                </button>
              </div>
            </article>
          );
        })}
      </PaginatedListCard>
    </div>
  );
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

  if (!previewTitle && !previewDescription && !previewImageUrl && !previewDomain) {
    return null;
  }

  return (
    <div className="activity-preview-card">
      {previewImageUrl ? <img src={previewImageUrl} alt={previewTitle ?? title} className="activity-preview-image" /> : null}
      <div className="activity-preview-copy">
        <p className="eyebrow activity-preview-eyebrow">{title}</p>
        {previewTitle ? <strong>{previewTitle}</strong> : null}
        {previewDescription ? <p className="muted">{previewDescription}</p> : null}
        {previewDomain ? <p className="muted">{previewDomain}</p> : null}
      </div>
    </div>
  );
}
