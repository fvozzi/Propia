import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  buildAppraisalMailtoUrl,
  buildAppraisalWhatsappMessage,
  buildPublicAppraisalUrl,
  canShareAppraisalByEmail,
  canShareAppraisalByWhatsApp,
} from '../lib/appraisals';
import { useI18n } from '../lib/i18n';
import type { AppraisalRequest, Contact, Paginated } from '../types';

type AppraisalStatusFilter = '' | 'OPEN' | 'COMPLETED' | 'EXPIRED';

export function AppraisalRequestsPage() {
  const { t, formatDateTime } = useI18n();
  const [response, setResponse] = useState<Paginated<AppraisalRequest> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [contactId, setContactId] = useState('');
  const [status, setStatus] = useState<AppraisalStatusFilter>('');

  async function load(
    nextPage = page,
    nextFilters: {
      contactId?: string;
      status?: AppraisalStatusFilter;
    } = {},
  ) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    const effectiveContactId = nextFilters.contactId ?? contactId;
    const effectiveStatus = nextFilters.status ?? status;

    if (effectiveContactId) params.set('contactId', effectiveContactId);
    if (effectiveStatus) params.set('status', effectiveStatus);

    const data = await apiRequest<Paginated<AppraisalRequest>>(`/appraisal-requests?${params.toString()}`);
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
    setContactId('');
    setStatus('');
    setPage(1);
    await load(1, { contactId: '', status: '' });
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteAppraisal'))) return;
    await apiRequest(`/appraisal-requests/${id}`, { method: 'DELETE' });
    await load(page);
  }

  async function handleCopyLink(publicToken: string) {
    await navigator.clipboard.writeText(buildPublicAppraisalUrl(publicToken));
    window.alert(t('appraisals.copySuccess'));
  }

  function getShareMessage(contact?: Contact) {
    const displayName = contact?.firstName || contact?.displayName || '';
    return t('appraisals.shareMessage').replace('{name}', displayName ? ` ${displayName}` : '');
  }

  async function handleShareWhatsApp(appraisalRequest: AppraisalRequest) {
    if (!appraisalRequest.contact || !canShareAppraisalByWhatsApp(appraisalRequest.contact)) return;
    await navigator.clipboard.writeText(
      buildAppraisalWhatsappMessage(appraisalRequest.publicToken, getShareMessage(appraisalRequest.contact)),
    );
    window.alert(t('common.copySuccess'));
  }

  function handleShareEmail(appraisalRequest: AppraisalRequest) {
    if (!appraisalRequest.contact || !canShareAppraisalByEmail(appraisalRequest.contact)) return;
    window.location.href = buildAppraisalMailtoUrl(
      appraisalRequest.contact,
      appraisalRequest.publicToken,
      t('appraisals.shareEmailSubject'),
      getShareMessage(appraisalRequest.contact),
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('appraisals.eyebrow')}
        title={t('appraisals.title')}
        actions={
          <>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} aria-label={t('common.contact')}>
              <option value="">{t('appraisals.allContacts')}</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.displayName}
                </option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as AppraisalStatusFilter)} aria-label={t('common.status')}>
              <option value="">{t('appraisals.allStatuses')}</option>
              <option value="OPEN">{t('appraisals.statusOpen')}</option>
              <option value="COMPLETED">{t('appraisals.statusCompleted')}</option>
              <option value="EXPIRED">{t('appraisals.statusExpired')}</option>
            </select>
            <button type="button" onClick={handleApplyFilters}>
              {t('common.apply')}
            </button>
            <button type="button" className="ghost-button" onClick={handleClearFilters}>
              {t('common.clear')}
            </button>
            <Link to="/appraisals/new" className="button-link">
              {t('appraisals.newRequest')}
            </Link>
          </>
        }
      />

      <PaginatedListCard
        title={t('appraisals.listTitle')}
        page={response?.meta.page ?? 1}
        totalPages={response?.meta.totalPages ?? 1}
        pageLabel={t('contacts.page')}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
        onPrevious={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      >
        {(response?.items ?? []).length === 0 ? (
          <div className="empty-list-state">
            <p className="muted">{t('appraisals.emptyList')}</p>
            <p className="muted">{t('appraisals.shareHint')}</p>
          </div>
        ) : null}
        {(response?.items ?? []).map((appraisalRequest) => {
          const isCompleted = Boolean(appraisalRequest.submittedAt);
          const isExpired = !isCompleted && new Date(appraisalRequest.expiresAt).getTime() <= Date.now();
          const statusLabel = isCompleted
            ? t('appraisals.statusCompleted')
            : isExpired
              ? t('appraisals.statusExpired')
              : t('appraisals.statusOpen');

          return (
            <article key={appraisalRequest.id} className="list-item list-item-actions">
              <div>
                <strong>{appraisalRequest.propertyAddress || t('common.noData')}</strong>
                <p className="muted">{appraisalRequest.contact?.displayName ?? t('common.noContact')}</p>
                <p className="muted">
                  {t('appraisals.expiresAt')}: {formatDateTime(appraisalRequest.expiresAt)}
                </p>
                {appraisalRequest.submittedAt ? (
                  <p className="muted">
                    {t('appraisals.submittedAt')}: {formatDateTime(appraisalRequest.submittedAt)}
                  </p>
                ) : null}
                <span className={`pill ${isCompleted ? 'pill-active' : isExpired ? 'pill-lost' : 'pill-note'}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="candidate-actions">
                <button type="button" className="ghost-button" onClick={() => handleCopyLink(appraisalRequest.publicToken)}>
                  {t('appraisals.copyLink')}
                </button>
                {canShareAppraisalByWhatsApp(appraisalRequest.contact) ? (
                  <button type="button" className="ghost-button" onClick={() => handleShareWhatsApp(appraisalRequest)}>
                    {t('appraisals.shareWhatsApp')}
                  </button>
                ) : null}
                {canShareAppraisalByEmail(appraisalRequest.contact) ? (
                  <button type="button" className="ghost-button" onClick={() => handleShareEmail(appraisalRequest)}>
                    {t('appraisals.shareEmail')}
                  </button>
                ) : null}
                <a href={`/tasacion/${appraisalRequest.publicToken}`} target="_blank" rel="noreferrer" className="ghost-button button-link">
                  {t('appraisals.openPublicForm')}
                </a>
                <Link to={`/appraisals/${appraisalRequest.id}/edit`} className="ghost-button button-link">
                  {t('appraisals.editRequest')}
                </Link>
                <button type="button" className="ghost-button" onClick={() => handleDelete(appraisalRequest.id)}>
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
