import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export function PropertiesCreatePage() {
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100').then((response) => {
      setContacts(response.items);
    });
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
    navigate('/properties');
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('properties.eyebrow')}</p>
          <h2>{t('properties.newProperty')}</h2>
        </div>
        <Link to="/properties" className="ghost-button button-link">
          {t('properties.backToList')}
        </Link>
      </section>

      <section className="card">
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
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <button type="submit" className="full-span">
            {t('properties.save')}
          </button>
        </form>
      </section>
    </div>
  );
}
