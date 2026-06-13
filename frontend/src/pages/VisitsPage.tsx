import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { useI18n, visitStatusOptions } from '../lib/i18n';
import type { Contact, Paginated, Property, Visit } from '../types';

export function VisitsPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [searchParams] = useSearchParams();
  const [visits, setVisits] = useState<Paginated<Visit> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filters, setFilters] = useState({
    date: searchParams.get('date') ?? '',
    status: searchParams.get('status') ?? '',
  });

  async function load() {
    const params = new URLSearchParams({ page: '1', limit: '20' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const [visitsData, contactsData, propertiesData] = await Promise.all([
      apiRequest<Paginated<Visit>>(`/visits?${params.toString()}`),
      apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
      apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
    ]);
    setVisits(visitsData);
    setContacts(contactsData.items);
    setProperties(propertiesData.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiRequest('/visits', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: Number(formData.get('propertyId')),
        contactId: Number(formData.get('contactId')),
        scheduledAt: formData.get('scheduledAt'),
        status: formData.get('visitStatus'),
        notes: formData.get('notes'),
      }),
    });
    event.currentTarget.reset();
    await load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteVisit'))) return;
    await apiRequest(`/visits/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('visits.eyebrow')}</p>
          <h2>{t('visits.title')}</h2>
        </div>
        <div className="toolbar">
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters({ ...filters, date: event.target.value })}
          />
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">{t('common.all')}</option>
            {visitStatusOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('visitStatus', option)}
              </option>
            ))}
          </select>
          <button onClick={load}>{t('common.filter')}</button>
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('visits.newVisit')}</h3>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              {t('common.property')}
              <select name="propertyId" required>
                <option value="">{t('common.select')}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.contact')}
              <select name="contactId" required>
                <option value="">{t('common.select')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.dateTime')}
              <input type="datetime-local" name="scheduledAt" required />
            </label>
            <label>
              {t('common.status')}
              <select name="visitStatus" defaultValue="SCHEDULED">
                {visitStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('visitStatus', option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              {t('common.notes')}
              <textarea name="notes" rows={3} />
            </label>
            <button type="submit">{t('visits.save')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('visits.listTitle')}</h3>
          {(visits?.items ?? []).map((visit) => (
            <article key={visit.id} className="list-item list-item-actions">
              <div>
                <strong>{visit.property?.title ?? `${t('common.property')} #${visit.propertyId}`}</strong>
                <p className="muted">
                  {visit.contact?.displayName ?? `${t('common.contact')} #${visit.contactId}`} · {formatDateTime(visit.scheduledAt)}
                </p>
                <StatusPill value={visit.status} />
              </div>
              <button className="ghost-button" onClick={() => handleDelete(visit.id)}>
                {t('common.delete')}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
