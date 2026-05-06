import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import {
  currencyOptions,
  operationTypeOptions,
  propertyStatusOptions,
  propertyTypeOptions,
  useI18n,
} from '../lib/i18n';
import type {
  Contact,
  CurrencyType,
  OperationType,
  Paginated,
  Property,
  PropertyStatus,
  PropertyType,
} from '../types';

const initialForm = {
  title: '',
  description: '',
  address: '',
  city: 'Buenos Aires',
  neighborhood: '',
  operationType: 'SALE' as OperationType,
  propertyType: 'APARTMENT' as PropertyType,
  status: 'ACTIVE' as PropertyStatus,
  price: '',
  currency: 'USD' as CurrencyType,
  ownerContactId: '',
  photoUrl: '',
};

export function PropertiesPage() {
  const { t, translateEnum } = useI18n();
  const [response, setResponse] = useState<Paginated<Property> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    status: '',
    operationType: '',
    propertyType: '',
    neighborhood: '',
  });

  async function load() {
    const params = new URLSearchParams({ page: '1', limit: '8' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const [propertiesData, contactsData] = await Promise.all([
      apiRequest<Paginated<Property>>(`/properties?${params.toString()}`),
      apiRequest<Paginated<Contact>>('/contacts?page=1&limit=50'),
    ]);
    setResponse(propertiesData);
    setContacts(contactsData.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    await apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        price: form.price ? Number(form.price) : undefined,
        ownerContactId: form.ownerContactId ? Number(form.ownerContactId) : undefined,
        photos: form.photoUrl
          ? [{ url: form.photoUrl, thumbnailUrl: form.photoUrl, caption: 'Main', orderIndex: 0 }]
          : [],
      }),
    });
    setForm(initialForm);
    await load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteProperty'))) return;
    await apiRequest(`/properties/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('properties.eyebrow')}</p>
          <h2>{t('properties.title')}</h2>
        </div>
        <div className="toolbar toolbar-wrap">
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">{t('properties.allStatuses')}</option>
            {propertyStatusOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('propertyStatus', option)}
              </option>
            ))}
          </select>
          <select
            value={filters.operationType}
            onChange={(event) => setFilters({ ...filters, operationType: event.target.value })}
          >
            <option value="">{t('properties.allOperations')}</option>
            {operationTypeOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('operationType', option)}
              </option>
            ))}
          </select>
          <input
            placeholder={t('common.neighborhood')}
            value={filters.neighborhood}
            onChange={(event) => setFilters({ ...filters, neighborhood: event.target.value })}
          />
          <button onClick={load}>{t('common.filter')}</button>
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('properties.newProperty')}</h3>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              {t('common.title')}
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              {t('properties.address')}
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
            <label>
              {t('common.city')}
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            </label>
            <label>
              {t('common.neighborhood')}
              <input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} />
            </label>
            <label>
              {t('common.operation')}
              <select
                value={form.operationType}
                onChange={(event) => setForm({ ...form, operationType: event.target.value as OperationType })}
              >
                {operationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('operationType', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.type')}
              <select
                value={form.propertyType}
                onChange={(event) => setForm({ ...form, propertyType: event.target.value as PropertyType })}
              >
                {propertyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('propertyType', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.status')}
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as PropertyStatus })}
              >
                {propertyStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('propertyStatus', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.price')}
              <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </label>
            <label>
              {t('common.currency')}
              <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as CurrencyType })}>
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('currency', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.owner')}
              <select
                value={form.ownerContactId}
                onChange={(event) => setForm({ ...form, ownerContactId: event.target.value })}
              >
                <option value="">{t('common.unassigned')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('properties.photoUrl')}
              <input value={form.photoUrl} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} />
            </label>
            <label className="full-span">
              {t('common.description')}
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <button type="submit">{t('properties.save')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('properties.listTitle')}</h3>
          {(response?.items ?? []).map((property) => (
            <article key={property.id} className="list-item list-item-actions">
              <div>
                <Link to={`/properties/${property.id}`}>{property.title}</Link>
                <p className="muted">
                  {property.neighborhood} · {property.price ? `${property.currency} ${property.price}` : t('properties.noPrice')}
                </p>
                <StatusPill value={property.status} />
              </div>
              <button className="ghost-button" onClick={() => handleDelete(property.id)}>
                {t('common.delete')}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
