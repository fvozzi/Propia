import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContactCombobox } from '../components/ContactCombobox';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { useI18n, visitStatusOptions } from '../lib/i18n';
import {
  buildVisitWhatsappMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from '../lib/whatsapp';
import type { Contact, Paginated, Property, Visit } from '../types';

export function VisitsPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [searchParams] = useSearchParams();
  const [visits, setVisits] = useState<Paginated<Visit> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [createContactId, setCreateContactId] = useState('');
  const [actionError, setActionError] = useState('');
  const [sharingVisitId, setSharingVisitId] = useState<number | null>(null);
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
        externalUrl: formData.get('externalUrl') || undefined,
      }),
    });
    event.currentTarget.reset();
    setCreateContactId('');
    await load();
  }

  async function handleShareWhatsapp(visit: Visit) {
    if (!visit.contact || !getContactWhatsappPhone(visit.contact) || !visit.externalUrl) return;

    setSharingVisitId(visit.id);
    setActionError('');

    try {
      const message = buildVisitWhatsappMessage(visit);
      openWhatsAppShareUrl(buildWhatsAppShareUrl(visit.contact, message));
      window.alert(t('common.whatsappSent'));
    } catch (shareError) {
      setActionError(
        shareError instanceof Error ? shareError.message : t('common.whatsappSendFailed'),
      );
    } finally {
      setSharingVisitId(null);
    }
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
          <p className="muted">{t('visits.subtitle')}</p>
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
              <ContactCombobox
                contacts={contacts}
                value={createContactId}
                onChange={setCreateContactId}
                placeholder={t('contacts.searchPlaceholder')}
                emptyLabel={t('common.select')}
                loadingLabel={t('common.loading')}
                noResultsLabel={t('common.noData')}
                required
                name="contactId"
                remoteSearch
              />
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
              {t('visits.listingUrl')}
              <input type="url" name="externalUrl" placeholder="https://..." />
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
          {actionError ? <p className="alert">{actionError}</p> : null}
          {(visits?.items ?? []).map((visit) => (
            <article key={visit.id} className="list-item list-item-actions">
              <div>
                <strong>
                  {visit.property?.title ??
                    visit.externalPropertyTitle ??
                    (visit.propertyId
                      ? `${t('common.property')} #${visit.propertyId}`
                      : t('dashboard.propertyFallback'))}
                </strong>
                <p className="muted">
                  {visit.contact?.displayName ?? `${t('common.contact')} #${visit.contactId}`} - {formatDateTime(visit.scheduledAt)}
                </p>
                <StatusPill value={visit.status} />
              </div>
              <div className="toolbar">
                {visit.externalUrl ? (
                  <a href={visit.externalUrl} target="_blank" rel="noreferrer" className="agenda-link">
                    {t('visits.openListing')}
                  </a>
                ) : null}
                {visit.contact && getContactWhatsappPhone(visit.contact) && visit.externalUrl ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleShareWhatsapp(visit)}
                    disabled={sharingVisitId === visit.id}
                  >
                    {sharingVisitId === visit.id ? t('common.loading') : t('visits.shareNow')}
                  </button>
                ) : null}
                <button type="button" className="ghost-button" onClick={() => handleDelete(visit.id)}>
                  {t('common.delete')}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
