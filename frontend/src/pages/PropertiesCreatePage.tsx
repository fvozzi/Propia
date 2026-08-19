import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ContactCombobox } from '../components/ContactCombobox';
import { apiRequest } from '../lib/api';
import { appraisalDispositionOptions, appraisalOrientationOptions, currencyOptions, operationTypeOptions, propertyStatusOptions, propertyTypeOptions, useI18n } from '../lib/i18n';
import { calculateAppraisalAreas, parseNullableNumber } from '../lib/appraisals';
import type {
  AppraisalDisposition,
  AppraisalOrientation,
  AppraisalRequest,
  Contact,
  CurrencyType,
  OperationType,
  Paginated,
  PropertyStatus,
  PropertyType,
} from '../types';

type PropertyFormState = {
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood: string;
  operationType: OperationType;
  propertyType: PropertyType;
  status: PropertyStatus;
  price: string;
  currency: CurrencyType;
  expenses: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  coveredArea: string;
  semiCoveredArea: string;
  uncoveredArea: string;
  floor: string;
  amenities: string;
  orientation: AppraisalOrientation | '';
  disposition: AppraisalDisposition | '';
  ageYears: string;
  hasGarage: boolean;
  ownerContactId: string;
  appraisalRequestId: string;
  photoUrl: string;
  privateNotes: string;
  publicationUrl: string;
};

const initialForm: PropertyFormState = {
  title: '',
  description: '',
  address: '',
  city: 'Buenos Aires',
  neighborhood: '',
  operationType: 'SALE',
  propertyType: 'APARTMENT',
  status: 'ACTIVE',
  price: '',
  currency: 'USD',
  expenses: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  coveredArea: '',
  semiCoveredArea: '',
  uncoveredArea: '',
  floor: '',
  amenities: '',
  orientation: '',
  disposition: '',
  ageYears: '',
  hasGarage: false,
  ownerContactId: '',
  appraisalRequestId: '',
  photoUrl: '',
  privateNotes: '',
  publicationUrl: '',
};

function stringifyNumber(value: number | null) {
  return value === null ? '' : String(value);
}

function stringifyAppraisalFloor(value: string | null) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : '';
}

function buildPrivateNotesFromAppraisal(request: AppraisalRequest) {
  return [
    request.conditionNotes ? `Estado y mejoras: ${request.conditionNotes}` : null,
    request.valuationReason ? `Motivo de tasacion: ${request.valuationReason}` : null,
    request.availabilityNotes ? `Disponibilidad: ${request.availabilityNotes}` : null,
    request.additionalNotes ? `Notas adicionales: ${request.additionalNotes}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n\n');
}

function buildAppraisalOptionLabel(request: AppraisalRequest) {
  const parts = [
    request.contact?.displayName ?? `Contacto #${request.contactId}`,
    request.propertyAddress ?? 'Sin direccion',
    request.neighborhood ?? null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(' · ');
}

export function PropertiesCreatePage() {
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalRequest[]>([]);
  const [form, setForm] = useState<PropertyFormState>(initialForm);

  useEffect(() => {
    async function load() {
      const [contactsResponse, appraisalsResponse] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        apiRequest<Paginated<AppraisalRequest>>('/appraisal-requests?page=1&limit=100&status=COMPLETED'),
      ]);
      setContacts(contactsResponse.items);
      setAppraisals(appraisalsResponse.items);
    }

    void load();
  }, []);

  const availableAppraisals = useMemo(
    () =>
      appraisals.filter((request) => {
        const linkedPropertyId = request.properties?.[0]?.id;
        return !linkedPropertyId;
      }),
    [appraisals],
  );

  const computedAreas = useMemo(
    () =>
      calculateAppraisalAreas({
        coveredArea: parseNullableNumber(form.coveredArea),
        semiCoveredArea: parseNullableNumber(form.semiCoveredArea),
        uncoveredArea: parseNullableNumber(form.uncoveredArea),
      }),
    [form.coveredArea, form.semiCoveredArea, form.uncoveredArea],
  );

  function applyAppraisalRequest(appraisalRequestId: string) {
    const request = availableAppraisals.find((item) => String(item.id) === appraisalRequestId);
    if (!request) {
      setForm((current) => ({ ...current, appraisalRequestId }));
      return;
    }

    setForm((current) => ({
      ...current,
      appraisalRequestId,
      address: request.propertyAddress ?? current.address,
      city: request.city ?? current.city,
      neighborhood: request.neighborhood ?? current.neighborhood,
      operationType: request.operationType ?? current.operationType,
      propertyType: request.propertyType ?? current.propertyType,
      expenses: stringifyNumber(request.expenses),
      rooms: stringifyNumber(request.rooms),
      bedrooms: stringifyNumber(request.bedrooms),
      bathrooms: stringifyNumber(request.bathrooms),
      coveredArea: stringifyNumber(request.coveredArea),
      semiCoveredArea: stringifyNumber(request.semiCoveredArea),
      uncoveredArea: stringifyNumber(request.uncoveredArea),
      floor: stringifyAppraisalFloor(request.floor),
      amenities: request.amenities ?? current.amenities,
      orientation: request.orientation ?? current.orientation,
      disposition: request.disposition ?? current.disposition,
      ageYears: stringifyNumber(request.ageYears),
      hasGarage: request.hasGarage ?? current.hasGarage,
      ownerContactId: String(request.contactId),
      privateNotes: buildPrivateNotesFromAppraisal(request) || current.privateNotes,
    }));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    await apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        price: form.price ? Number(form.price) : undefined,
        expenses: parseNullableNumber(form.expenses) ?? undefined,
        rooms: parseNullableNumber(form.rooms) ?? undefined,
        bedrooms: parseNullableNumber(form.bedrooms) ?? undefined,
        bathrooms: parseNullableNumber(form.bathrooms) ?? undefined,
        coveredArea: parseNullableNumber(form.coveredArea) ?? undefined,
        semiCoveredArea: parseNullableNumber(form.semiCoveredArea) ?? undefined,
        uncoveredArea: parseNullableNumber(form.uncoveredArea) ?? undefined,
        totalArea: computedAreas.totalArea ?? undefined,
        weightedArea: computedAreas.weightedArea ?? undefined,
        floor: parseNullableNumber(form.floor) ?? undefined,
        ageYears: parseNullableNumber(form.ageYears) ?? undefined,
        orientation: form.orientation || undefined,
        disposition: form.disposition || undefined,
        ownerContactId: form.ownerContactId ? Number(form.ownerContactId) : undefined,
        appraisalRequestId: form.appraisalRequestId ? Number(form.appraisalRequestId) : undefined,
        title: form.title.trim() || undefined,
        publicationUrl: form.publicationUrl.trim() || undefined,
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
            {t('properties.linkedAppraisal')}
            <select value={form.appraisalRequestId} onChange={(event) => applyAppraisalRequest(event.target.value)}>
              <option value="">{t('properties.withoutAppraisal')}</option>
              {availableAppraisals.map((request) => (
                <option key={request.id} value={request.id}>
                  {buildAppraisalOptionLabel(request)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('common.owner')}
            <ContactCombobox
              contacts={contacts}
              value={form.ownerContactId}
              onChange={(value) =>
                setForm((current) => ({ ...current, ownerContactId: value }))
              }
              placeholder={t('contacts.searchPlaceholder')}
              emptyLabel={t('common.unassigned')}
              loadingLabel={t('common.loading')}
              noResultsLabel={t('common.noData')}
              disabled={Boolean(form.appraisalRequestId)}
            />
          </label>
          <label>
            {t('properties.address')}
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          </label>
          <label>
            {t('common.city')}
            <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
          </label>
          <label>
            {t('common.neighborhood')}
            <input
              value={form.neighborhood}
              onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}
            />
          </label>
          <label>
            {t('common.operation')}
            <select
              value={form.operationType}
              onChange={(event) => setForm((current) => ({ ...current, operationType: event.target.value as OperationType }))}
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
              onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value as PropertyType }))}
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
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PropertyStatus }))}
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
            <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
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
            {t('appraisals.expenses')}
            <input value={form.expenses} onChange={(event) => setForm((current) => ({ ...current, expenses: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.rooms')}
            <input value={form.rooms} onChange={(event) => setForm((current) => ({ ...current, rooms: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.bedrooms')}
            <input value={form.bedrooms} onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.bathrooms')}
            <input value={form.bathrooms} onChange={(event) => setForm((current) => ({ ...current, bathrooms: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.coveredArea')}
            <input
              value={form.coveredArea}
              onChange={(event) => setForm((current) => ({ ...current, coveredArea: event.target.value }))}
            />
          </label>
          <label>
            {t('appraisals.semiCoveredArea')}
            <input
              value={form.semiCoveredArea}
              onChange={(event) => setForm((current) => ({ ...current, semiCoveredArea: event.target.value }))}
            />
          </label>
          <label>
            {t('appraisals.uncoveredArea')}
            <input
              value={form.uncoveredArea}
              onChange={(event) => setForm((current) => ({ ...current, uncoveredArea: event.target.value }))}
            />
          </label>
          <label>
            {t('appraisals.totalArea')}
            <input value={computedAreas.totalArea ?? ''} disabled />
          </label>
          <label>
            {t('appraisals.weightedArea')}
            <input value={computedAreas.weightedArea ?? ''} disabled />
          </label>
          <label>
            {t('appraisals.floor')}
            <input value={form.floor} onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.ageYears')}
            <input value={form.ageYears} onChange={(event) => setForm((current) => ({ ...current, ageYears: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.orientation')}
            <select
              value={form.orientation}
              onChange={(event) => setForm((current) => ({ ...current, orientation: event.target.value as AppraisalOrientation | '' }))}
            >
              <option value="">{t('common.unassigned')}</option>
              {appraisalOrientationOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('appraisalOrientation', option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('appraisals.disposition')}
            <select
              value={form.disposition}
              onChange={(event) => setForm((current) => ({ ...current, disposition: event.target.value as AppraisalDisposition | '' }))}
            >
              <option value="">{t('common.unassigned')}</option>
              {appraisalDispositionOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('appraisalDisposition', option)}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            {t('appraisals.amenitiesText')}
            <input value={form.amenities} onChange={(event) => setForm((current) => ({ ...current, amenities: event.target.value }))} />
          </label>
          <label className="checkbox-field full-span">
            <input
              type="checkbox"
              checked={form.hasGarage}
              onChange={(event) => setForm((current) => ({ ...current, hasGarage: event.target.checked }))}
            />
            <span>{t('appraisals.hasGarage')}</span>
          </label>
          <label>
            {t('properties.publicationUrl')}
            <input
              type="url"
              value={form.publicationUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, publicationUrl: event.target.value }))
              }
            />
          </label>
          <label>
            {t('properties.photoUrl')}
            <input value={form.photoUrl} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} />
          </label>
          <label className="full-span">
            {t('common.description')}
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="full-span">
            {t('properties.privateNotes')}
            <textarea
              rows={5}
              value={form.privateNotes}
              onChange={(event) => setForm((current) => ({ ...current, privateNotes: event.target.value }))}
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
