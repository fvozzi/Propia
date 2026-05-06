import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { roleOptions, useI18n } from '../lib/i18n';
import type { Contact, Paginated, Role } from '../types';

const initialForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  whatsapp: '',
  email: '',
  source: '',
  notes: '',
  roles: ['BUYER'] as Role[],
};

function toggleRole(currentRoles: Role[], role: Role) {
  return currentRoles.includes(role)
    ? currentRoles.filter((currentRole) => currentRole !== role)
    : [...currentRoles, role];
}

export function ContactsPage() {
  const { t, translateEnum } = useI18n();
  const [response, setResponse] = useState<Paginated<Contact> | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(1);

  async function load() {
    const params = new URLSearchParams({
      page: String(page),
      limit: '8',
    });
    if (search) params.set('search', search);
    const data = await apiRequest<Paginated<Contact>>(`/contacts?${params.toString()}`);
    setResponse(data);
  }

  useEffect(() => {
    load();
  }, [page]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    await apiRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setForm(initialForm);
    await load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteContact'))) return;
    await apiRequest(`/contacts/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('contacts.eyebrow')}</p>
          <h2>{t('contacts.title')}</h2>
        </div>
        <div className="toolbar">
          <input
            placeholder={t('contacts.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button onClick={load}>{t('common.search')}</button>
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('contacts.newContact')}</h3>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              {t('contacts.firstName')}
              <input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            </label>
            <label>
              {t('contacts.lastName')}
              <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            </label>
            <label>
              {t('contacts.displayName')}
              <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </label>
            <label>
              {t('common.phone')}
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              {t('contacts.whatsapp')}
              <input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
            </label>
            <label>
              {t('common.email')}
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              {t('common.source')}
              <input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
            </label>
            <div className="full-span">
              <span className="field-label">{t('contacts.roles')}</span>
              <div className="checkbox-grid">
                {roleOptions.map((role) => (
                  <label key={role} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(role)}
                      onChange={() => setForm({ ...form, roles: toggleRole(form.roles, role) as Role[] })}
                    />
                    <span>{translateEnum('role', role)}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="full-span">
              {t('common.notes')}
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} />
            </label>
            <button type="submit">{t('contacts.save')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('contacts.listTitle')}</h3>
          {(response?.items ?? []).map((contact) => (
            <article key={contact.id} className="list-item list-item-actions">
              <div>
                <Link to={`/contacts/${contact.id}`}>{contact.displayName}</Link>
                <p className="muted">
                  {contact.roles.map((role) => translateEnum('role', role.role)).join(', ')} · {contact.phone || contact.email || t('common.noData')}
                </p>
              </div>
              <button className="ghost-button" onClick={() => handleDelete(contact.id)}>
                {t('common.delete')}
              </button>
            </article>
          ))}
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              {t('common.previous')}
            </button>
            <span>
              {t('contacts.page')} {response?.meta.page ?? 1} / {response?.meta.totalPages ?? 1}
            </span>
            <button
              disabled={page >= (response?.meta.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('common.next')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
