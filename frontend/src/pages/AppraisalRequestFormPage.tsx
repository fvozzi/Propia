import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  calculateAppraisalAreas,
  buildAppraisalMailtoUrl,
  buildPublicAppraisalUrl,
  canShareAppraisalByEmail,
  canShareAppraisalByWhatsApp,
  openAppraisalWhatsappShare,
  parseNullableNumber,
} from '../lib/appraisals';
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
  AppraisalRequest,
  Contact,
  OperationType,
  Paginated,
  PropertyType,
} from '../types';

type AppraisalFormState = {
  contactId: string;
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

const initialForm: AppraisalFormState = {
  contactId: '',
  propertyAddress: '',
  city: '',
  neighborhood: '',
  propertyType: '',
  operationType: 'SALE',
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

export function AppraisalRequestFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<AppraisalFormState>(() => ({
    ...initialForm,
    contactId: searchParams.get('contactId') ?? '',
  }));
  const [request, setRequest] = useState<AppraisalRequest | null>(null);

  const requestId = id ? Number(id) : null;
  const isEditing = Boolean(requestId);
  const selectedContact = contacts.find((contact) => contact.id === Number(form.contactId)) ?? request?.contact ?? null;

  useEffect(() => {
    async function loadDependencies() {
      const [contactsData, requestData] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        isEditing && requestId ? apiRequest<AppraisalRequest>(`/appraisal-requests/${requestId}`) : Promise.resolve(null),
      ]);

      setContacts(contactsData.items);

      if (requestData) {
        setRequest(requestData);
        setForm({
          contactId: String(requestData.contactId),
          propertyAddress: requestData.propertyAddress ?? '',
          city: requestData.city ?? '',
          neighborhood: requestData.neighborhood ?? '',
          propertyType: requestData.propertyType ?? '',
          operationType: requestData.operationType ?? '',
          rooms: requestData.rooms ? String(requestData.rooms) : '',
          bedrooms: requestData.bedrooms ? String(requestData.bedrooms) : '',
          bathrooms: requestData.bathrooms ? String(requestData.bathrooms) : '',
          expenses: requestData.expenses ? String(requestData.expenses) : '',
          floor: requestData.floor ? String(requestData.floor) : '',
          amenities: requestData.amenities ?? '',
          orientation: requestData.orientation ?? '',
          disposition: requestData.disposition ?? '',
          ageYears: requestData.ageYears ? String(requestData.ageYears) : '',
          coveredArea: requestData.coveredArea ? String(requestData.coveredArea) : '',
          semiCoveredArea: requestData.semiCoveredArea ? String(requestData.semiCoveredArea) : '',
          uncoveredArea: requestData.uncoveredArea ? String(requestData.uncoveredArea) : '',
          totalArea: requestData.totalArea ? String(requestData.totalArea) : '',
          weightedArea: requestData.weightedArea ? String(requestData.weightedArea) : '',
          hasGarage: Boolean(requestData.hasGarage),
          conditionNotes: requestData.conditionNotes ?? '',
          valuationReason: requestData.valuationReason ?? '',
          availabilityNotes: requestData.availabilityNotes ?? '',
          additionalNotes: requestData.additionalNotes ?? '',
        });
      }
    }

    void loadDependencies();
  }, [isEditing, requestId, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await apiRequest<AppraisalRequest>(isEditing && requestId ? `/appraisal-requests/${requestId}` : '/appraisal-requests', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify(buildPayload(form)),
    });

    navigate(`/appraisals/${saved.id}/edit`);
  }

  const computedAreas = calculateAppraisalAreas({
    coveredArea: parseNullableNumber(form.coveredArea),
    semiCoveredArea: parseNullableNumber(form.semiCoveredArea),
    uncoveredArea: parseNullableNumber(form.uncoveredArea),
  });

  async function handleCopyLink() {
    if (!request) return;
    await navigator.clipboard.writeText(buildPublicAppraisalUrl(request.publicToken));
    window.alert(t('appraisals.copySuccess'));
  }

  function getShareMessage() {
    const displayName = selectedContact?.firstName || selectedContact?.displayName || '';
    return t('appraisals.shareMessage').replace('{name}', displayName ? ` ${displayName}` : '');
  }

  function handleShareWhatsApp() {
    if (!request || !selectedContact || !canShareAppraisalByWhatsApp(selectedContact)) return;
    openAppraisalWhatsappShare(selectedContact, request.publicToken, getShareMessage());
  }

  function handleShareEmail() {
    if (!request || !selectedContact || !canShareAppraisalByEmail(selectedContact)) return;
    window.location.href = buildAppraisalMailtoUrl(
      selectedContact,
      request.publicToken,
      t('appraisals.shareEmailSubject'),
      getShareMessage(),
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('appraisals.eyebrow')}
        title={isEditing ? t('appraisals.editRequest') : t('appraisals.newRequest')}
        actions={
          <Link to="/appraisals" className="ghost-button button-link">
            {t('nav.appraisals')}
          </Link>
        }
      />

      <section className="card">
        {!request ? <p className="muted appraisal-share-hint">{t('appraisals.createBeforeShare')}</p> : null}
        {request ? (
          <div className="candidate-actions appraisal-request-actions">
            <button type="button" className="ghost-button" onClick={handleCopyLink}>
              {t('appraisals.copyLink')}
            </button>
            {canShareAppraisalByWhatsApp(selectedContact) ? (
              <button type="button" className="ghost-button" onClick={handleShareWhatsApp}>
                {t('appraisals.shareWhatsApp')}
              </button>
            ) : null}
            {canShareAppraisalByEmail(selectedContact) ? (
              <button type="button" className="ghost-button" onClick={handleShareEmail}>
                {t('appraisals.shareEmail')}
              </button>
            ) : null}
            <a href={`/tasacion/${request.publicToken}`} target="_blank" rel="noreferrer" className="ghost-button button-link">
              {t('appraisals.openPublicForm')}
            </a>
          </div>
        ) : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('common.contact')}
            <select
              value={form.contactId}
              onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
              required
              disabled={isEditing}
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
            <input
              value={form.neighborhood}
              onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}
            />
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
            <textarea
              rows={3}
              value={form.valuationReason}
              onChange={(event) => setForm((current) => ({ ...current, valuationReason: event.target.value }))}
            />
          </label>
          <label className="full-span">
            {t('appraisals.conditionNotes')}
            <textarea
              rows={3}
              value={form.conditionNotes}
              onChange={(event) => setForm((current) => ({ ...current, conditionNotes: event.target.value }))}
            />
          </label>
          <label className="full-span">
            {t('appraisals.availabilityNotes')}
            <textarea
              rows={3}
              value={form.availabilityNotes}
              onChange={(event) => setForm((current) => ({ ...current, availabilityNotes: event.target.value }))}
            />
          </label>
          <label className="full-span">
            {t('appraisals.additionalNotes')}
            <textarea
              rows={3}
              value={form.additionalNotes}
              onChange={(event) => setForm((current) => ({ ...current, additionalNotes: event.target.value }))}
            />
          </label>
          <button type="submit" className="full-span">
            {t('appraisals.save')}
          </button>
        </form>
      </section>
    </div>
  );
}

function buildPayload(form: AppraisalFormState) {
  return {
    contactId: Number(form.contactId),
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
  };
}
