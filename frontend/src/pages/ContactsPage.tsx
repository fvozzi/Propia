import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('contacts.eyebrow')}</p>
          <h2>{t('contacts.title')}</h2>
        </div>
        <div className="toolbar toolbar-wrap">
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
        </div>
      </section>

      <section className="card">
        <h3>{t('contacts.listTitle')}</h3>
        {(response?.items ?? []).map((contact) => (
          <article key={contact.id} className="list-item list-item-actions">
            <div>
              <Link to={`/contacts/${contact.id}`}>{contact.displayName}</Link>
              <p className="muted">
                {contact.roles.map((role) => translateEnum('role', role.role)).join(', ')} ·{' '}
                {contact.phone || contact.email || t('common.noData')}
              </p>
            </div>
            <button type="button" className="ghost-button" onClick={() => handleDelete(contact.id)}>
              {t('common.delete')}
            </button>
          </article>
        ))}
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            {t('common.previous')}
          </button>
          <span>
            {t('contacts.page')} {response?.meta.page ?? 1} / {response?.meta.totalPages ?? 1}
          </span>
          <button
            type="button"
            disabled={page >= (response?.meta.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('common.next')}
          </button>
        </div>
      </section>
    </div>
  );
}
