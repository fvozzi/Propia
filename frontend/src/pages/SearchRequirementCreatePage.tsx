import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  currencyOptions,
  operationTypeOptions,
  propertyTypeOptions,
  searchRequirementAgeRangeOptions,
  searchRequirementAmenityOptions,
  searchRequirementRoomTypeOptions,
  searchRequirementStatusOptions,
  useI18n,
} from '../lib/i18n';
import {
  translateRequirementAgeRange,
  translateRequirementAmenity,
  translateRequirementRoomType,
} from '../lib/requirements';
import type {
  Contact,
  CurrencyType,
  OperationType,
  Paginated,
  Property,
  PropertyType,
  SearchRequirementAgeRange,
  SearchRequirementAmenity,
  SearchRequirementRoomType,
  SearchRequirementStatus,
} from '../types';

type RequirementFormState = {
  contactId: string;
  operationType: OperationType;
  propertyType: PropertyType;
  selectedPropertyId: string;
  neighborhoods: string;
  minPrice: string;
  maxPrice: string;
  currency: CurrencyType;
  minRooms: string;
  minBedrooms: string;
  minBathrooms: string;
  needsParking: boolean;
  creditEligible: boolean;
  professionalUse: boolean;
  accessible: boolean;
  bright: boolean;
  amenities: SearchRequirementAmenity[];
  roomTypes: SearchRequirementRoomType[];
  ageRange: SearchRequirementAgeRange | '';
  notes: string;
  status: SearchRequirementStatus;
};

const initialForm: RequirementFormState = {
  contactId: '',
  operationType: 'BUY',
  propertyType: 'APARTMENT',
  selectedPropertyId: '',
  neighborhoods: '',
  minPrice: '',
  maxPrice: '',
  currency: 'USD',
  minRooms: '',
  minBedrooms: '',
  minBathrooms: '',
  needsParking: false,
  creditEligible: false,
  professionalUse: false,
  accessible: false,
  bright: false,
  amenities: [],
  roomTypes: [],
  ageRange: '',
  notes: '',
  status: 'ACTIVE',
};

function toggleOption<T extends string>(currentValues: T[], value: T) {
  return currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value];
}

export function SearchRequirementCreatePage() {
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState<RequirementFormState>(initialForm);

  useEffect(() => {
    async function loadDependencies() {
      const [contactsData, propertiesData] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
      ]);

      setContacts(contactsData.items);
      setProperties(propertiesData.items);
    }

    void loadDependencies();
  }, []);

  const selectedProperty = properties.find((property) => String(property.id) === form.selectedPropertyId) ?? null;
  const isSaleRequirement = form.operationType === 'SALE';
  const usingExistingProperty = isSaleRequirement && Boolean(selectedProperty);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiRequest('/search-requirements', {
      method: 'POST',
      body: JSON.stringify({
        contactId: Number(form.contactId),
        propertyId: usingExistingProperty ? Number(form.selectedPropertyId) : undefined,
        operationType: form.operationType,
        propertyType: form.propertyType,
        neighborhoods: form.neighborhoods
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        minPrice: form.minPrice ? Number(form.minPrice) : undefined,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
        currency: form.currency,
        minRooms: form.minRooms ? Number(form.minRooms) : undefined,
        minBedrooms: form.minBedrooms ? Number(form.minBedrooms) : undefined,
        minBathrooms: form.minBathrooms ? Number(form.minBathrooms) : undefined,
        needsParking: form.needsParking,
        creditEligible: form.creditEligible,
        professionalUse: form.professionalUse,
        accessible: form.accessible,
        bright: form.bright,
        amenities: form.amenities,
        roomTypes: form.roomTypes,
        ageRange: form.ageRange || undefined,
        notes: form.notes || undefined,
        status: form.status,
      }),
    });

    navigate('/requirements');
  }

  function handleOperationTypeChange(nextOperationType: OperationType) {
    setForm((current) => ({
      ...current,
      operationType: nextOperationType,
      selectedPropertyId: nextOperationType === 'SALE' ? current.selectedPropertyId : '',
    }));
  }

  function handlePropertyChange(nextPropertyId: string) {
    const property = properties.find((item) => String(item.id) === nextPropertyId);
    setForm((current) => ({
      ...current,
      selectedPropertyId: nextPropertyId,
      propertyType: property?.propertyType ?? current.propertyType,
      neighborhoods: property?.neighborhood ?? current.neighborhoods,
    }));
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('requirements.eyebrow')}
        title={t('requirements.newRequirement')}
        actions={
          <Link to="/requirements" className="ghost-button button-link">
            {t('requirements.backToList')}
          </Link>
        }
      />

      <section className="card">
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            {t('common.contact')}
            <select
              value={form.contactId}
              onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
              required
            >
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
            <select
              value={form.operationType}
              onChange={(event) => handleOperationTypeChange(event.target.value as OperationType)}
            >
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
                <select value={form.selectedPropertyId} onChange={(event) => handlePropertyChange(event.target.value)}>
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
                  {t('common.type')}: {translateEnum('propertyType', selectedProperty.propertyType)} · {t('common.neighborhood')}:{' '}
                  {selectedProperty.neighborhood ?? t('common.noData')}
                </p>
              ) : null}
            </div>
          ) : null}
          <label>
            {t('common.type')}
            <select
              value={form.propertyType}
              onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value as PropertyType }))}
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
              value={form.neighborhoods}
              onChange={(event) => setForm((current) => ({ ...current, neighborhoods: event.target.value }))}
              placeholder="Caballito, Almagro"
              disabled={usingExistingProperty}
            />
          </label>
          <label>
            {t('requirements.minPrice')}
            <input value={form.minPrice} onChange={(event) => setForm((current) => ({ ...current, minPrice: event.target.value }))} />
          </label>
          <label>
            {t('requirements.maxPrice')}
            <input value={form.maxPrice} onChange={(event) => setForm((current) => ({ ...current, maxPrice: event.target.value }))} />
          </label>
          <label>
            {t('common.currency')}
            <select
              value={form.currency}
              onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as CurrencyType }))}
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('currency', option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('requirements.minRooms')}
            <input value={form.minRooms} onChange={(event) => setForm((current) => ({ ...current, minRooms: event.target.value }))} />
          </label>
          <label>
            {t('requirements.minBedrooms')}
            <input
              value={form.minBedrooms}
              onChange={(event) => setForm((current) => ({ ...current, minBedrooms: event.target.value }))}
            />
          </label>
          <label>
            {t('requirements.minBathrooms')}
            <input
              value={form.minBathrooms}
              onChange={(event) => setForm((current) => ({ ...current, minBathrooms: event.target.value }))}
            />
          </label>

          <div className="full-span requirement-section">
            <span className="field-label requirement-section-title">{t('requirements.propertyFeaturesTitle')}</span>
            <div className="checkbox-grid">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.creditEligible}
                  onChange={(event) => setForm((current) => ({ ...current, creditEligible: event.target.checked }))}
                />
                <span>{t('requirements.creditEligible')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.professionalUse}
                  onChange={(event) => setForm((current) => ({ ...current, professionalUse: event.target.checked }))}
                />
                <span>{t('requirements.professionalUse')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.accessible}
                  onChange={(event) => setForm((current) => ({ ...current, accessible: event.target.checked }))}
                />
                <span>{t('requirements.accessible')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.bright}
                  onChange={(event) => setForm((current) => ({ ...current, bright: event.target.checked }))}
                />
                <span>{t('requirements.bright')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.needsParking}
                  onChange={(event) => setForm((current) => ({ ...current, needsParking: event.target.checked }))}
                />
                <span>{t('requirements.needsParking')}</span>
              </label>
            </div>
          </div>

          <div className="full-span requirement-section">
            <span className="field-label requirement-section-title">{t('requirements.amenitiesTitle')}</span>
            <div className="checkbox-grid">
              {searchRequirementAmenityOptions.map((option) => (
                <label key={option} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(option)}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        amenities: toggleOption(current.amenities, option),
                      }))
                    }
                  />
                  <span>{translateRequirementAmenity(option, t)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="full-span requirement-section">
            <span className="field-label requirement-section-title">{t('requirements.roomTypesTitle')}</span>
            <div className="checkbox-grid">
              {searchRequirementRoomTypeOptions.map((option) => (
                <label key={option} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.roomTypes.includes(option)}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        roomTypes: toggleOption(current.roomTypes, option),
                      }))
                    }
                  />
                  <span>{translateRequirementRoomType(option, t)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="full-span requirement-section">
            <span className="field-label requirement-section-title">{t('requirements.ageRangeTitle')}</span>
            <div className="radio-stack">
              {searchRequirementAgeRangeOptions.map((option) => (
                <label key={option} className="checkbox-item radio-item">
                  <input
                    type="radio"
                    name="ageRange"
                    checked={form.ageRange === option}
                    onChange={() => setForm((current) => ({ ...current, ageRange: option }))}
                  />
                  <span>{translateRequirementAgeRange(option, t)}</span>
                </label>
              ))}
              <button
                type="button"
                className="ghost-button requirement-clear-button"
                onClick={() => setForm((current) => ({ ...current, ageRange: '' }))}
              >
                {t('common.clear')}
              </button>
            </div>
          </div>

          <label>
            {t('common.status')}
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SearchRequirementStatus }))}
            >
              {searchRequirementStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('searchRequirementStatus', option)}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            {t('common.notes')}
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
          </label>
          <button type="submit" className="full-span">
            {t('requirements.save')}
          </button>
        </form>
      </section>
    </div>
  );
}
