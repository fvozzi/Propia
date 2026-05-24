import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { Contact, Paginated } from '../types';

export function ContactsPage() {
  const { t, translateEnum } = useI18n();
  const [response, setResponse] = useState<Paginated<Contact> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  async function handleSearch() {
    setPage(1);
    await load(1);
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteContact'))) return;
    await apiRequest(`/contacts/${id}`, { method: 'DELETE' });
    await load(page);
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
            <Link to="/contacts/new" className="button-link">
              {t('contacts.newContact')}
            </Link>
          </>
        }
      />

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
