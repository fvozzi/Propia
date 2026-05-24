import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import {
  buildPropertySearchMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  navigateWhatsAppShareWindow,
  openWhatsAppShareWindow,
} from '../lib/whatsapp';
import type { Activity, Contact, Paginated } from '../types';

export function ActivitiesPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [response, setResponse] = useState<Paginated<Activity> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [activityDate, setActivityDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [activityType, setActivityType] = useState('');
  const [sharingActivityId, setSharingActivityId] = useState<number | null>(null);

  async function load(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    if (activityDate) {
      params.set('fromDate', activityDate);
      params.set('toDate', activityDate);
    }

    if (contactId) params.set('contactId', contactId);
    if (activityType) params.set('activityType', activityType);

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

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteActivity'))) return;
    await apiRequest(`/activities/${id}`, { method: 'DELETE' });
    await load(page);
  }

  async function handleShare(activity: Activity) {
    if (!activity.contact || !getContactWhatsappPhone(activity.contact) || !activity.externalUrl) return;

    const shareWindow = openWhatsAppShareWindow();
    setSharingActivityId(activity.id);

    try {
      const shared = await apiRequest<Activity>(`/activities/${activity.id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({
          whatsappComment: activity.whatsappComment || undefined,
        }),
      });
      const whatsappUrl = buildWhatsAppShareUrl(activity.contact, buildPropertySearchMessage(shared));
      navigateWhatsAppShareWindow(shareWindow, whatsappUrl);

      await load(page);
    } catch (error) {
      shareWindow?.close();
      throw error;
    } finally {
      setSharingActivityId(null);
    }
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('activities.eyebrow')}
        title={t('activities.title')}
        actions={
          <>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} aria-label={t('common.contact')}>
              <option value="">{t('activities.allContacts')}</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.displayName}
                </option>
              ))}
            </select>
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
            <input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} aria-label={t('activities.activityDate')} />
            <button type="button" onClick={handleApplyFilters}>
              {t('common.apply')}
            </button>
            <Link to="/activities/new" className="button-link">
              {t('activities.newActivity')}
            </Link>
          </>
        }
      />

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
        {(response?.items ?? []).map((activity) => (
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
              {activity.whatsappComment ? <p className="muted">{activity.whatsappComment}</p> : null}
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
                  onClick={() => handleShare(activity)}
                  disabled={sharingActivityId === activity.id}
                >
                  {sharingActivityId === activity.id ? t('common.loading') : t('activities.shareNow')}
                </button>
              ) : null}
              <button type="button" className="ghost-button" onClick={() => handleDelete(activity.id)}>
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </PaginatedListCard>
    </div>
  );
}
