import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest, getGoogleAuthUrl, isGoogleAuthEnabled } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { Contact, Paginated } from '../types';

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  contactsScopeGranted: boolean;
};

type GoogleContactsSyncResult = {
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  email: string | null;
};

export function ContactsPage() {
  const { t, translateEnum } = useI18n();
  const googleAuthEnabled = isGoogleAuthEnabled();
  const [response, setResponse] = useState<Paginated<Contact> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);

  async function load(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    if (search) params.set('search', search);

    const data = await apiRequest<Paginated<Contact>>(`/contacts?${params.toString()}`);
    setResponse(data);
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  useEffect(() => {
    if (!googleAuthEnabled) {
      return;
    }

    void loadGoogleStatus();
  }, [googleAuthEnabled]);

  async function handleSearch() {
    setError('');
    setPage(1);
    await load(1);
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteContact'))) return;
    await apiRequest(`/contacts/${id}`, { method: 'DELETE' });
    await load(page);
  }

  async function loadGoogleStatus() {
    try {
      const status = await apiRequest<GoogleStatus>('/auth/google/status');
      setGoogleStatus(status);
    } catch {
      setGoogleStatus(null);
    }
  }

  async function handleGoogleSync() {
    setSyncing(true);
    setError('');
    setNotice('');

    try {
      const result = await apiRequest<GoogleContactsSyncResult>('/contacts/google/sync', {
        method: 'POST',
      });
      setNotice(
        [
          t('contacts.syncSummaryPrefix'),
          `${result.createdCount} ${t('contacts.syncSummaryCreated')}`,
          `${result.updatedCount} ${t('contacts.syncSummaryUpdated')}`,
          `${result.skippedCount} ${t('contacts.syncSummarySkipped')}`,
        ].join(' '),
      );
      setPage(1);
      await load(1);
      await loadGoogleStatus();
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : t('contacts.syncGoogleContactsError'),
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleGoogleReconnect() {
    window.location.href = getGoogleAuthUrl();
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('contacts.eyebrow')}
        title={t('contacts.title')}
        actions={
          <>
            <input
              placeholder={t('contacts.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" onClick={handleSearch}>
              {t('common.search')}
            </button>
            {googleAuthEnabled ? (
              googleStatus?.connected && googleStatus.contactsScopeGranted ? (
                <button type="button" onClick={() => void handleGoogleSync()} disabled={syncing}>
                  {syncing ? t('contacts.syncGoogleContactsLoading') : t('contacts.syncGoogleContacts')}
                </button>
              ) : (
                <button type="button" className="ghost-button" onClick={handleGoogleReconnect}>
                  {t('contacts.reconnectGoogleContacts')}
                </button>
              )
            ) : null}
            <Link to="/contacts/new" className="button-link">
              {t('contacts.newContact')}
            </Link>
          </>
        }
      />

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}
      {googleAuthEnabled ? (
        <div className="card">
          <p className="muted">
            {googleStatus?.connected && googleStatus.contactsScopeGranted
              ? `${t('contacts.googleContactsConnected')} ${googleStatus.email ?? t('common.noData')}.`
              : t('contacts.googleContactsReconnectHelp')}
          </p>
        </div>
      ) : null}

      <PaginatedListCard
        title={t('contacts.listTitle')}
        page={response?.meta.page ?? 1}
        totalPages={response?.meta.totalPages ?? 1}
        pageLabel={t('contacts.page')}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
        onPrevious={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      >
        {(response?.items ?? []).map((contact) => (
          <article key={contact.id} className="list-item list-item-actions">
            <div>
              <Link to={`/contacts/${contact.id}`}>{contact.displayName}</Link>
              <p className="muted">
                {contact.roles.map((role) => translateEnum('role', role.role)).join(', ')} ·{' '}
                {contact.phone || contact.email || t('common.noData')}
              </p>
            </div>
            <div className="candidate-actions">
              <Link to={`/contacts/${contact.id}`} className="ghost-button button-link">
                {t('contacts.editContact')}
              </Link>
              <button type="button" className="ghost-button" onClick={() => handleDelete(contact.id)}>
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </PaginatedListCard>
    </div>
  );
}
