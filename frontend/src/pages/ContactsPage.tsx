import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest, getGoogleAuthUrl, isGoogleAuthEnabled } from '../lib/api';
import { roleOptions, useI18n } from '../lib/i18n';
import type { Contact, Paginated, Role } from '../types';

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
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [filters, setFilters] = useState({
    displayName: '',
    role: '',
    birthdayMonth: '',
    tag: '',
    lastContact: '',
    nextContact: '',
    phone: '',
  });

  async function load(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    if (filters.displayName) params.set('displayName', filters.displayName);
    if (filters.role) params.set('role', filters.role);
    if (filters.birthdayMonth) params.set('birthdayMonth', filters.birthdayMonth);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.lastContact) params.set('lastContact', filters.lastContact);
    if (filters.nextContact) params.set('nextContact', filters.nextContact);
    if (filters.phone) params.set('phone', filters.phone);

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

  async function applyFilter(
    key: keyof typeof filters,
    value: string,
  ) {
    setError('');
    const nextFilters = {
      ...filters,
      [key]: value,
    };
    setFilters(nextFilters);
    setPage(1);
    await loadWithFilters(nextFilters, 1);
  }

  async function clearColumnFilters() {
    setError('');
    const nextFilters = {
      displayName: '',
      role: '',
      birthdayMonth: '',
      tag: '',
      lastContact: '',
      nextContact: '',
      phone: '',
    };
    setFilters(nextFilters);
    setPage(1);
    await loadWithFilters(nextFilters, 1);
  }

  async function loadWithFilters(
    nextFilters: typeof filters,
    nextPage: number,
  ) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    if (nextFilters.displayName) params.set('displayName', nextFilters.displayName);
    if (nextFilters.role) params.set('role', nextFilters.role);
    if (nextFilters.birthdayMonth) params.set('birthdayMonth', nextFilters.birthdayMonth);
    if (nextFilters.tag) params.set('tag', nextFilters.tag);
    if (nextFilters.lastContact) params.set('lastContact', nextFilters.lastContact);
    if (nextFilters.nextContact) params.set('nextContact', nextFilters.nextContact);
    if (nextFilters.phone) params.set('phone', nextFilters.phone);

    const data = await apiRequest<Paginated<Contact>>(`/contacts?${params.toString()}`);
    setResponse(data);
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('contacts.eyebrow')}
        title={t('contacts.title')}
        actions={
          <>
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
                <tr className="table-filter-row">
                  <th>
                    <input
                      className="table-filter-control"
                      placeholder={t('contacts.displayName')}
                      value={filters.displayName}
                      onChange={(event) => void applyFilter('displayName', event.target.value)}
                    />
                  </th>
                  <th>
                    <select
                      className="table-filter-control"
                      value={filters.role}
                      onChange={(event) => void applyFilter('role', event.target.value)}
                    >
                      <option value="">{t('contacts.allRoles')}</option>
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {translateEnum('role', role)}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <select
                      className="table-filter-control"
                      value={filters.birthdayMonth}
                      onChange={(event) => void applyFilter('birthdayMonth', event.target.value)}
                    >
                      <option value="">{t('contacts.allMonths')}</option>
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <input
                      className="table-filter-control"
                      placeholder={t('contacts.tagFilterPlaceholder')}
                      value={filters.tag}
                      onChange={(event) => void applyFilter('tag', event.target.value)}
                    />
                  </th>
                  <th>
                    <select
                      className="table-filter-control"
                      value={filters.lastContact}
                      onChange={(event) => void applyFilter('lastContact', event.target.value)}
                    >
                      <option value="">{t('contacts.allValues')}</option>
                      <option value="WITH_VALUE">{t('contacts.withValue')}</option>
                      <option value="WITHOUT_VALUE">{t('contacts.withoutValue')}</option>
                    </select>
                  </th>
                  <th>
                    <select
                      className="table-filter-control"
                      value={filters.nextContact}
                      onChange={(event) => void applyFilter('nextContact', event.target.value)}
                    >
                      <option value="">{t('contacts.allValues')}</option>
                      <option value="WITH_VALUE">{t('contacts.withValue')}</option>
                      <option value="WITHOUT_VALUE">{t('contacts.withoutValue')}</option>
                      <option value="OVERDUE">{t('contacts.overdue')}</option>
                    </select>
                  </th>
                  <th>
                    <input
                      className="table-filter-control"
                      placeholder={t('common.phone')}
                      value={filters.phone}
                      onChange={(event) => void applyFilter('phone', event.target.value)}
                    />
                  </th>
                  <th>
                    <div className="table-filter-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => void clearColumnFilters()}
                      >
                        {t('contacts.clearColumnFilters')}
                      </button>
                    </div>
                  </th>
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

const monthOptions = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
] as const;

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
