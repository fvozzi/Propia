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
  const { t, translateEnum, formatDateTime } = useI18n();
  const googleAuthEnabled = isGoogleAuthEnabled();
  const [response, setResponse] = useState<Paginated<Contact> | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
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

    if (search) {
      params.set('search', search);
    }

    if (tagFilter) {
      params.set('tag', tagFilter);
    }

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

  async function handleQuickTagFilter(tag: string) {
    setError('');
    setTagFilter(tag);
    setPage(1);
    await load(1);
  }

  async function handleClearFilters() {
    setError('');
    setSearch('');
    setTagFilter('');
    setPage(1);
    await load(1);
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteContact'))) {
      return;
    }

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
            <input
              placeholder={t('contacts.tagFilterPlaceholder')}
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              aria-label={t('contacts.tagFilter')}
            />
            <button type="button" onClick={handleSearch}>
              {t('common.search')}
            </button>
            <button
              type="button"
              className={tagFilter === 'No Contactables' ? 'active-toggle' : 'ghost-button'}
              onClick={() => void handleQuickTagFilter('No Contactables')}
            >
              {t('contacts.noContactablesFilter')}
            </button>
            <button type="button" className="ghost-button" onClick={() => void handleClearFilters()}>
              {t('contacts.clearFilters')}
            </button>
            {googleAuthEnabled ? (
              googleStatus?.connected && googleStatus.contactsScopeGranted ? (
                <button
                  type="button"
                  onClick={() => void handleGoogleSync()}
                  disabled={syncing}
                >
                  {syncing
                    ? t('contacts.syncGoogleContactsLoading')
                    : t('contacts.syncGoogleContacts')}
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleGoogleReconnect}
                >
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
        {response?.items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('contacts.displayName')}</th>
                  <th>{t('contacts.roles')}</th>
                  <th>{t('contacts.birthday')}</th>
                  <th>{t('contacts.tags')}</th>
                  <th>{t('contacts.lastContact')}</th>
                  <th>{t('contacts.nextContact')}</th>
                  <th>{t('common.phone')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(response?.items ?? []).map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="table-cell-stack">
                        <Link to={`/contacts/${contact.id}`}>{contact.displayName}</Link>
                        <span className="muted">{contact.email || t('common.noData')}</span>
                      </div>
                    </td>
                    <td>
                      {contact.roles.map((role) => translateEnum('role', role.role)).join(', ') ||
                        t('common.noData')}
                    </td>
                    <td>{formatBirthday(contact.birthday, t('common.noData'))}</td>
                    <td>
                      {contact.googleTags.length
                        ? contact.googleTags.join(', ')
                        : t('common.noData')}
                    </td>
                    <td>
                      {contact.lastContactAt
                        ? formatDateTime(contact.lastContactAt)
                        : t('common.noData')}
                    </td>
                    <td>
                      {contact.nextContactAt
                        ? formatDateTime(contact.nextContactAt)
                        : t('common.noData')}
                    </td>
                    <td>{contact.phone || contact.whatsapp || t('common.noData')}</td>
                    <td>
                      <div className="candidate-actions">
                        <Link to={`/contacts/${contact.id}`} className="ghost-button button-link">
                          {t('contacts.editContact')}
                        </Link>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleDelete(contact.id)}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PaginatedListCard>
    </div>
  );
}

function formatBirthday(value: string | null, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  if (value.startsWith('--')) {
    const match = value.match(/^--(\d{2})-(\d{2})$/);
    return match ? `${match[2]}/${match[1]}` : value;
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}
