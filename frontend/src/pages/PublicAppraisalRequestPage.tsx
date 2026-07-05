import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../lib/api';
import { calculateAppraisalAreas, parseNullableNumber } from '../lib/appraisals';
import {
  appraisalDispositionOptions,
  appraisalOrientationOptions,
  operationTypeOptions,
  propertyTypeOptions,
  useI18n,
} from '../lib/i18n';
import type {
  AppraisalDisposition,
  AppraisalOrientation,
  OperationType,
  PropertyType,
  PublicAppraisalRequest,
} from '../types';

type PublicFormState = {
  propertyAddress: string;
  city: string;
  neighborhood: string;
  propertyType: PropertyType | '';
  operationType: OperationType | '';
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  expenses: string;
  floor: string;
  amenities: string;
  orientation: AppraisalOrientation | '';
  disposition: AppraisalDisposition | '';
  ageYears: string;
  coveredArea: string;
  semiCoveredArea: string;
  uncoveredArea: string;
  totalArea: string;
  weightedArea: string;
  hasGarage: boolean;
  conditionNotes: string;
  valuationReason: string;
  availabilityNotes: string;
  additionalNotes: string;
};

const initialForm: PublicFormState = {
  propertyAddress: '',
  city: '',
  neighborhood: '',
  propertyType: '',
  operationType: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  expenses: '',
  floor: '',
  amenities: '',
  orientation: '',
  disposition: '',
  ageYears: '',
  coveredArea: '',
  semiCoveredArea: '',
  uncoveredArea: '',
  totalArea: '',
  weightedArea: '',
  hasGarage: false,
  conditionNotes: '',
  valuationReason: '',
  availabilityNotes: '',
  additionalNotes: '',
};

export function PublicAppraisalRequestPage() {
  const { token = '' } = useParams();
  const { t, translateEnum } = useI18n();
  const [request, setRequest] = useState<PublicAppraisalRequest | null>(null);
  const [form, setForm] = useState<PublicFormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadRequest() {
      const response = await fetch(`${getApiUrl()}/public/appraisal-requests/${token}`);
      if (!response.ok) {
        setRequest(null);
        return;
      }

      const data = (await response.json()) as PublicAppraisalRequest;
      setRequest(data);
      setSubmitted(Boolean(data.submittedAt));
      setForm({
        propertyAddress: data.propertyAddress ?? '',
        city: data.city ?? '',
        neighborhood: data.neighborhood ?? '',
        propertyType: data.propertyType ?? '',
        operationType: data.operationType ?? '',
        rooms: data.rooms ? String(data.rooms) : '',
        bedrooms: data.bedrooms ? String(data.bedrooms) : '',
        bathrooms: data.bathrooms ? String(data.bathrooms) : '',
        expenses: data.expenses ? String(data.expenses) : '',
        floor: data.floor ? String(data.floor) : '',
        amenities: data.amenities ?? '',
        orientation: data.orientation ?? '',
        disposition: data.disposition ?? '',
        ageYears: data.ageYears ? String(data.ageYears) : '',
        coveredArea: data.coveredArea ? String(data.coveredArea) : '',
        semiCoveredArea: data.semiCoveredArea ? String(data.semiCoveredArea) : '',
        uncoveredArea: data.uncoveredArea ? String(data.uncoveredArea) : '',
        totalArea: data.totalArea ? String(data.totalArea) : '',
        weightedArea: data.weightedArea ? String(data.weightedArea) : '',
        hasGarage: Boolean(data.hasGarage),
        conditionNotes: data.conditionNotes ?? '',
        valuationReason: data.valuationReason ?? '',
        availabilityNotes: data.availabilityNotes ?? '',
        additionalNotes: data.additionalNotes ?? '',
      });
    }

    void loadRequest();
  }, [token]);

  const computedAreas = calculateAppraisalAreas({
    coveredArea: parseNullableNumber(form.coveredArea),
    semiCoveredArea: parseNullableNumber(form.semiCoveredArea),
    uncoveredArea: parseNullableNumber(form.uncoveredArea),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch(`${getApiUrl()}/public/appraisal-requests/${token}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyAddress: form.propertyAddress,
        city: form.city || undefined,
        neighborhood: form.neighborhood || undefined,
        propertyType: form.propertyType || undefined,
        operationType: form.operationType || undefined,
        rooms: form.rooms ? Number(form.rooms) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        expenses: form.expenses ? Number(form.expenses) : undefined,
        floor: form.floor ? Number(form.floor) : undefined,
        amenities: form.amenities || undefined,
        orientation: form.orientation || undefined,
        disposition: form.disposition || undefined,
        ageYears: form.ageYears ? Number(form.ageYears) : undefined,
        coveredArea: form.coveredArea ? Number(form.coveredArea) : undefined,
        semiCoveredArea: form.semiCoveredArea ? Number(form.semiCoveredArea) : undefined,
        uncoveredArea: form.uncoveredArea ? Number(form.uncoveredArea) : undefined,
        hasGarage: form.hasGarage,
        conditionNotes: form.conditionNotes || undefined,
        valuationReason: form.valuationReason || undefined,
        availabilityNotes: form.availabilityNotes || undefined,
        additionalNotes: form.additionalNotes || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error('Could not submit prelisting form');
    }

    const data = (await response.json()) as PublicAppraisalRequest;
    setRequest(data);
    setSubmitted(true);
  }

  if (!request) {
    return <main className="login-screen"><section className="login-card"><p>{t('appraisals.expiredBody')}</p></section></main>;
  }

  if (!request.isAvailable && submitted) {
    return (
      <main className="login-screen">
        <section className="login-card stack-gap">
          <h1>{t('appraisals.successTitle')}</h1>
          <p>{t('appraisals.successBody')}</p>
        </section>
      </main>
    );
  }

  if (!request.isAvailable) {
    return (
      <main className="login-screen">
        <section className="login-card stack-gap">
          <h1>{t('appraisals.expiredTitle')}</h1>
          <p>{t('appraisals.expiredBody')}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <section className="login-card left-aligned-card">
        <p className="eyebrow">{t('appraisals.eyebrow')}</p>
        <h1>{t('appraisals.publicTitle')}</h1>
        <p className="muted">
          {request.contactDisplayName}. {t('appraisals.publicSubtitle')}
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="full-span">
            {t('common.contact')}
            <input value={request.contactDisplayName} disabled />
          </label>
          <label className="full-span">
            {t('appraisals.propertyAddress')}
            <input
              value={form.propertyAddress}
              onChange={(event) => setForm((current) => ({ ...current, propertyAddress: event.target.value }))}
              required
            />
          </label>
          <label>
            {t('common.city')}
            <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
          </label>
          <label>
            {t('common.neighborhood')}
            <input value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} />
          </label>
          <label>
            {t('common.type')}
            <select
              value={form.propertyType}
              onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value as PropertyType | '' }))}
            >
              <option value="">{t('common.select')}</option>
              {propertyTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('propertyType', option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('common.operation')}
            <select
              value={form.operationType}
              onChange={(event) => setForm((current) => ({ ...current, operationType: event.target.value as OperationType | '' }))}
            >
              <option value="">{t('common.select')}</option>
              {operationTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('operationType', option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('appraisals.rooms')}
            <input type="number" min="0" value={form.rooms} onChange={(event) => setForm((current) => ({ ...current, rooms: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.bedrooms')}
            <input type="number" min="0" value={form.bedrooms} onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.bathrooms')}
            <input type="number" min="0" value={form.bathrooms} onChange={(event) => setForm((current) => ({ ...current, bathrooms: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.expenses')}
            <input type="number" min="0" step="0.01" value={form.expenses} onChange={(event) => setForm((current) => ({ ...current, expenses: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.floor')}
            <input type="number" min="0" value={form.floor} onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))} />
          </label>
          <label className="full-span">
            {t('appraisals.amenitiesText')}
            <input value={form.amenities} onChange={(event) => setForm((current) => ({ ...current, amenities: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.orientation')}
            <select
              value={form.orientation}
              onChange={(event) => setForm((current) => ({ ...current, orientation: event.target.value as AppraisalOrientation | '' }))}
            >
              <option value="">{t('common.select')}</option>
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
              <option value="">{t('common.select')}</option>
              {appraisalDispositionOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('appraisalDisposition', option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('appraisals.ageYears')}
            <input type="number" min="0" value={form.ageYears} onChange={(event) => setForm((current) => ({ ...current, ageYears: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.coveredArea')}
            <input type="number" min="0" step="0.01" value={form.coveredArea} onChange={(event) => setForm((current) => ({ ...current, coveredArea: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.semiCoveredArea')}
            <input type="number" min="0" step="0.01" value={form.semiCoveredArea} onChange={(event) => setForm((current) => ({ ...current, semiCoveredArea: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.uncoveredArea')}
            <input type="number" min="0" step="0.01" value={form.uncoveredArea} onChange={(event) => setForm((current) => ({ ...current, uncoveredArea: event.target.value }))} />
          </label>
          <label>
            {t('appraisals.totalArea')}
            <input value={computedAreas.totalArea ?? ''} disabled />
          </label>
          <label>
            {t('appraisals.weightedArea')}
            <input value={computedAreas.weightedArea ?? ''} disabled />
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={form.hasGarage}
              onChange={(event) => setForm((current) => ({ ...current, hasGarage: event.target.checked }))}
            />
            <span>{t('appraisals.hasGarage')}</span>
          </label>
          <label className="full-span">
            {t('appraisals.valuationReason')}
            <textarea rows={3} value={form.valuationReason} onChange={(event) => setForm((current) => ({ ...current, valuationReason: event.target.value }))} />
          </label>
          <label className="full-span">
            {t('appraisals.conditionNotes')}
            <textarea rows={3} value={form.conditionNotes} onChange={(event) => setForm((current) => ({ ...current, conditionNotes: event.target.value }))} />
          </label>
          <label className="full-span">
            {t('appraisals.availabilityNotes')}
            <textarea rows={3} value={form.availabilityNotes} onChange={(event) => setForm((current) => ({ ...current, availabilityNotes: event.target.value }))} />
          </label>
          <label className="full-span">
            {t('appraisals.additionalNotes')}
            <textarea rows={3} value={form.additionalNotes} onChange={(event) => setForm((current) => ({ ...current, additionalNotes: event.target.value }))} />
          </label>
          <button type="submit" className="full-span">
            {t('appraisals.submit')}
          </button>
        </form>
      </section>
    </main>
  );
}
