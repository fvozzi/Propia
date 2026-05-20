import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import {
  currencyOptions,
  operationTypeOptions,
  propertyTypeOptions,
  searchRequirementStatusOptions,
  useI18n,
} from '../lib/i18n';
import type {
  Contact,
  OperationType,
  Paginated,
  Property,
  PropertyType,
  SearchRequirement,
  SearchRequirementStatus,
} from '../types';

export function SearchRequirementsPage() {
  const { t, translateEnum } = useI18n();
  const [requirements, setRequirements] = useState<Paginated<SearchRequirement> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [status, setStatus] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('SALE');
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [neighborhoods, setNeighborhoods] = useState('');

  async function load() {
    const params = new URLSearchParams({ page: '1', limit: '20' });
    if (status) params.set('status', status);

    const [requirementsData, contactsData, propertiesData] = await Promise.all([
      apiRequest<Paginated<SearchRequirement>>(`/search-requirements?${params.toString()}`),
      apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
      apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
    ]);

    setRequirements(requirementsData);
    setContacts(contactsData.items);
    setProperties(propertiesData.items);
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedProperty = properties.find((property) => String(property.id) === selectedPropertyId) ?? null;
  const isSaleRequirement = operationType === 'SALE';
  const usingExistingProperty = isSaleRequirement && Boolean(selectedProperty);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiRequest('/search-requirements', {
      method: 'POST',
      body: JSON.stringify({
        contactId: Number(formData.get('contactId')),
        propertyId: usingExistingProperty ? Number(selectedPropertyId) : undefined,
        operationType,
        propertyType,
        neighborhoods: neighborhoods
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        minPrice: formData.get('minPrice') ? Number(formData.get('minPrice')) : undefined,
        maxPrice: formData.get('maxPrice') ? Number(formData.get('maxPrice')) : undefined,
        currency: formData.get('currency'),
        minRooms: formData.get('minRooms') ? Number(formData.get('minRooms')) : undefined,
        minBedrooms: formData.get('minBedrooms') ? Number(formData.get('minBedrooms')) : undefined,
        notes: formData.get('notes'),
        status: formData.get('requirementStatus') as SearchRequirementStatus,
      }),
    });
    event.currentTarget.reset();
    setOperationType('SALE');
    setPropertyType('APARTMENT');
    setSelectedPropertyId('');
    setNeighborhoods('');
    await load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteRequirement'))) return;
    await apiRequest(`/search-requirements/${id}`, { method: 'DELETE' });
    await load();
  }

  function handleOperationTypeChange(nextOperationType: OperationType) {
    setOperationType(nextOperationType);

    if (nextOperationType !== 'SALE') {
      setSelectedPropertyId('');
      return;
    }

    if (selectedProperty) {
      setPropertyType(selectedProperty.propertyType);
      setNeighborhoods(selectedProperty.neighborhood ?? '');
    }
  }

  function handlePropertyChange(nextPropertyId: string) {
    setSelectedPropertyId(nextPropertyId);
    const property = properties.find((item) => String(item.id) === nextPropertyId);

    if (!property) {
      return;
    }

    setPropertyType(property.propertyType);
    setNeighborhoods(property.neighborhood ?? '');
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('requirements.eyebrow')}</p>
          <h2>{t('requirements.title')}</h2>
        </div>
        <div className="toolbar">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {searchRequirementStatusOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('searchRequirementStatus', option)}
              </option>
            ))}
          </select>
          <button type="button" onClick={load}>
            {t('common.filter')}
          </button>
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('requirements.newRequirement')}</h3>
          <form className="form-grid" onSubmit={handleCreate}>
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
              {t('common.operation')}
              <select value={operationType} onChange={(event) => handleOperationTypeChange(event.target.value as OperationType)}>
                {operationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('operationType', option)}
                  </option>
                ))}
              </select>
            </label>
            {isSaleRequirement ? (
              <div className="full-span stack-gap">
                <label>
                  {t('common.property')}
                  <select value={selectedPropertyId} onChange={(event) => handlePropertyChange(event.target.value)}>
                    <option value="">{t('common.select')}</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedProperty ? (
                  <p className="muted">
                    {t('common.type')}: {translateEnum('propertyType', selectedProperty.propertyType)} ·{' '}
                    {t('common.neighborhood')}: {selectedProperty.neighborhood ?? t('common.noData')}
                  </p>
                ) : null}
              </div>
            ) : null}
            <label>
              {t('common.type')}
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value as PropertyType)}
                disabled={usingExistingProperty}
              >
                {propertyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('propertyType', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('requirements.neighborhoods')}
              <input
                value={neighborhoods}
                onChange={(event) => setNeighborhoods(event.target.value)}
                placeholder="Caballito, Almagro"
                disabled={usingExistingProperty}
              />
            </label>
            <label>
              {t('requirements.minPrice')}
              <input name="minPrice" />
            </label>
            <label>
              {t('requirements.maxPrice')}
              <input name="maxPrice" />
            </label>
            <label>
              {t('common.currency')}
              <select name="currency" defaultValue="USD">
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('currency', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.status')}
              <select name="requirementStatus" defaultValue="ACTIVE">
                {searchRequirementStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('searchRequirementStatus', option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              {t('common.notes')}
              <textarea name="notes" rows={3} />
            </label>
            <button type="submit">{t('requirements.save')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('requirements.listTitle')}</h3>
          {(requirements?.items ?? []).map((requirement) => (
            <article key={requirement.id} className="list-item list-item-actions">
              <div>
                <strong>{requirement.contact?.displayName ?? `${t('common.contact')} #${requirement.contactId}`}</strong>
                <p className="muted">
                  {translateEnum('operationType', requirement.operationType)} ·{' '}
                  {translateEnum('propertyType', requirement.propertyType)} · {requirement.neighborhoods.join(', ')}
                </p>
                {requirement.property ? (
                  <Link to={`/properties/${requirement.property.id}`} className="agenda-link">
                    {t('common.property')}: {requirement.property.title}
                  </Link>
                ) : null}
                <StatusPill value={requirement.status} />
              </div>
              <button type="button" className="ghost-button" onClick={() => handleDelete(requirement.id)}>
                {t('common.delete')}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
