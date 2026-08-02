import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  calculateAppraisalAreas,
  buildAppraisalMailtoUrl,
  buildAppraisalWhatsappMessage,
  buildPublicAppraisalUrl,
  canShareAppraisalByEmail,
  canShareAppraisalByWhatsApp,
  parseNullableNumber,
} from '../lib/appraisals';
import {
  appraisalDispositionOptions,
  appraisalOrientationOptions,
  operationTypeOptions,
  propertyTypeOptions,
  useI18n,
} from '../lib/i18n';
import { buildWhatsAppShareUrl, openWhatsAppShareUrl } from '../lib/whatsapp';
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
  const { t, translateEnum, formatDateTime } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<AppraisalFormState>(() => ({
    ...initialForm,
    contactId: searchParams.get('contactId') ?? '',
  }));
  const [request, setRequest] = useState<AppraisalRequest | null>(null);
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false);
  const [actionError, setActionError] = useState('');

  const requestId = id ? Number(id) : null;
  const isEditing = Boolean(requestId);
  const selectedContact = contacts.find((contact) => contact.id === Number(form.contactId)) ?? request?.contact ?? null;
  const computedAreas = calculateAppraisalAreas({
    coveredArea: parseNullableNumber(form.coveredArea),
    semiCoveredArea: parseNullableNumber(form.semiCoveredArea),
    uncoveredArea: parseNullableNumber(form.uncoveredArea),
  });

  useEffect(() => {
    async function loadDependencies() {
      const [contactsData, requestData] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        isEditing && requestId ? apiRequest<AppraisalRequest>(`/appraisal-requests/${requestId}`) : Promise.resolve(null),
      ]);

      setContacts(contactsData.items);

      if (requestData) {
        setRequest(requestData);
        setForm(buildFormState(requestData));
      }
    }

    void loadDependencies();
  }, [isEditing, requestId, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiRequest<AppraisalRequest>(isEditing && requestId ? `/appraisal-requests/${requestId}` : '/appraisal-requests', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify(buildPayload(form)),
    });
    navigate('/appraisals');
  }

  async function handleCopyLink() {
    if (!request) return;
    await navigator.clipboard.writeText(buildPublicAppraisalUrl(request.publicToken));
    window.alert(t('appraisals.copySuccess'));
  }

  function getShareMessage() {
    const displayName = selectedContact?.firstName || selectedContact?.displayName || '';
    return t('appraisals.shareMessage').replace('{name}', displayName ? ` ${displayName}` : '');
  }

  async function handleShareWhatsApp() {
    if (!request || !selectedContact || !canShareAppraisalByWhatsApp(selectedContact)) return;
    setSharingWhatsapp(true);
    setActionError('');

    try {
      const message = buildAppraisalWhatsappMessage(request.publicToken, getShareMessage());
      openWhatsAppShareUrl(buildWhatsAppShareUrl(selectedContact, message));
      window.alert(t('common.whatsappSent'));
    } catch (sendError) {
      setActionError(
        sendError instanceof Error ? sendError.message : t('common.whatsappSendFailed'),
      );
    } finally {
      setSharingWhatsapp(false);
    }
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
        {actionError ? <div className="card">{actionError}</div> : null}
        {!request ? <p className="muted appraisal-share-hint">{t('appraisals.createBeforeShare')}</p> : null}
        {request ? (
          <div className="candidate-actions appraisal-request-actions">
            <button type="button" className="ghost-button" onClick={handleCopyLink}>
              {t('appraisals.copyLink')}
            </button>
            {canShareAppraisalByWhatsApp(selectedContact) ? (
              <button type="button" className="ghost-button" onClick={handleShareWhatsApp} disabled={sharingWhatsapp}>
                {sharingWhatsapp ? t('common.loading') : t('appraisals.shareWhatsApp')}
              </button>
            ) : null}
            {canShareAppraisalByEmail(selectedContact) ? (
              <button type="button" className="ghost-button" onClick={handleShareEmail}>
                {t('appraisals.shareEmail')}
              </button>
            ) : null}
            <a href={`/prelisting/${request.publicToken}`} target="_blank" rel="noreferrer" className="ghost-button button-link">
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
            <input
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
          </label>
          <label>
            {t('common.neighborhood')}
            <input
              value={form.neighborhood}
              onChange={(event) =>
                setForm((current) => ({ ...current, neighborhood: event.target.value }))
              }
            />
          </label>
          <label>
            {t('common.type')}
            <select
              value={form.propertyType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  propertyType: event.target.value as PropertyType | '',
                }))
              }
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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  operationType: event.target.value as OperationType | '',
                }))
              }
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
            <input
              type="number"
              min="0"
              value={form.rooms}
              onChange={(event) => setForm((current) => ({ ...current, rooms: event.target.value }))}
            />
          </label>
          <label>
            {t('appraisals.bedrooms')}
            <input
              type="number"
              min="0"
              value={form.bedrooms}
              onChange={(event) =>
                setForm((current) => ({ ...current, bedrooms: event.target.value }))
              }
            />
          </label>
          <label>
            {t('appraisals.bathrooms')}
            <input
              type="number"
              min="0"
              value={form.bathrooms}
              onChange={(event) =>
                setForm((current) => ({ ...current, bathrooms: event.target.value }))
              }
            />
          </label>
          <label>
            {t('appraisals.expenses')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.expenses}
              onChange={(event) =>
                setForm((current) => ({ ...current, expenses: event.target.value }))
              }
            />
          </label>
          <label>
            {t('appraisals.floor')}
            <input
              value={form.floor}
              onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))}
            />
          </label>
          <label className="full-span">
            {t('appraisals.amenitiesText')}
            <input
              value={form.amenities}
              onChange={(event) =>
                setForm((current) => ({ ...current, amenities: event.target.value }))
              }
            />
          </label>
          <label>
            {t('appraisals.orientation')}
            <select
              value={form.orientation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  orientation: event.target.value as AppraisalOrientation | '',
                }))
              }
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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  disposition: event.target.value as AppraisalDisposition | '',
                }))
              }
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
            <input
              type="number"
              min="0"
              value={form.ageYears}
              onChange={(event) =>
                setForm((current) => ({ ...current, ageYears: event.target.value }))
              }
            />
          </label>
          <label>
            {t('appraisals.coveredArea')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.coveredArea}
              onChange={(event) =>
                setForm((current) => ({ ...current, coveredArea: event.target.value }))
              }
            />
          </label>
          <label>
            {t('appraisals.semiCoveredArea')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.semiCoveredArea}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  semiCoveredArea: event.target.value,
                }))
              }
            />
          </label>
          <label>
            {t('appraisals.uncoveredArea')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.uncoveredArea}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  uncoveredArea: event.target.value,
                }))
              }
            />
          </label>
          <label>
            {t('appraisals.totalArea')}
            <input value={toInputNumberValue(computedAreas.totalArea)} disabled />
          </label>
          <label>
            {t('appraisals.weightedArea')}
            <input value={toInputNumberValue(computedAreas.weightedArea)} disabled />
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={form.hasGarage}
              onChange={(event) =>
                setForm((current) => ({ ...current, hasGarage: event.target.checked }))
              }
            />
            <span>{t('appraisals.hasGarage')}</span>
          </label>
          <label className="full-span">
            {t('appraisals.valuationReason')}
            <textarea
              rows={3}
              value={form.valuationReason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  valuationReason: event.target.value,
                }))
              }
            />
          </label>
          <label className="full-span">
            {t('appraisals.conditionNotes')}
            <textarea
              rows={3}
              value={form.conditionNotes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  conditionNotes: event.target.value,
                }))
              }
            />
          </label>
          <label className="full-span">
            {t('appraisals.availabilityNotes')}
            <textarea
              rows={3}
              value={form.availabilityNotes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  availabilityNotes: event.target.value,
                }))
              }
            />
          </label>
          <label className="full-span">
            {t('appraisals.additionalNotes')}
            <textarea
              rows={3}
              value={form.additionalNotes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  additionalNotes: event.target.value,
                }))
              }
            />
          </label>
          <button type="submit" className="full-span">
            {isEditing ? t('common.update') : t('appraisals.save')}
          </button>
        </form>

        {request?.submittedAt ? (
          <section className="card appraisal-response-card">
            <h3>{t('appraisals.submittedAt')}: {formatDateTime(request.submittedAt)}</h3>
            <div className="stack-gap">
              {request.city ? <p className="muted">{t('common.city')}: {request.city}</p> : null}
              {request.neighborhood ? <p className="muted">{t('common.neighborhood')}: {request.neighborhood}</p> : null}
              {request.propertyType ? <p className="muted">{t('common.type')}: {translateEnum('propertyType', request.propertyType)}</p> : null}
              {request.operationType ? <p className="muted">{t('common.operation')}: {translateEnum('operationType', request.operationType)}</p> : null}
              {request.rooms !== null ? <p className="muted">{t('appraisals.rooms')}: {request.rooms}</p> : null}
              {request.bedrooms !== null ? <p className="muted">{t('appraisals.bedrooms')}: {request.bedrooms}</p> : null}
              {request.bathrooms !== null ? <p className="muted">{t('appraisals.bathrooms')}: {request.bathrooms}</p> : null}
              {request.expenses !== null ? <p className="muted">{t('appraisals.expenses')}: {request.expenses}</p> : null}
              {request.floor !== null ? <p className="muted">{t('appraisals.floor')}: {request.floor}</p> : null}
              {request.amenities ? <p className="muted">{t('appraisals.amenitiesText')}: {request.amenities}</p> : null}
              {request.orientation ? <p className="muted">{t('appraisals.orientation')}: {translateEnum('appraisalOrientation', request.orientation)}</p> : null}
              {request.disposition ? <p className="muted">{t('appraisals.disposition')}: {translateEnum('appraisalDisposition', request.disposition)}</p> : null}
              {request.ageYears !== null ? <p className="muted">{t('appraisals.ageYears')}: {request.ageYears}</p> : null}
              {request.coveredArea !== null ? <p className="muted">{t('appraisals.coveredArea')}: {request.coveredArea}</p> : null}
              {request.semiCoveredArea !== null ? <p className="muted">{t('appraisals.semiCoveredArea')}: {request.semiCoveredArea}</p> : null}
              {request.uncoveredArea !== null ? <p className="muted">{t('appraisals.uncoveredArea')}: {request.uncoveredArea}</p> : null}
              {request.totalArea !== null ? <p className="muted">{t('appraisals.totalArea')}: {request.totalArea}</p> : null}
              {request.weightedArea !== null ? <p className="muted">{t('appraisals.weightedArea')}: {request.weightedArea}</p> : null}
              {request.hasGarage !== null ? <p className="muted">{t('appraisals.hasGarage')}: {request.hasGarage ? 'Si' : 'No'}</p> : null}
              {request.valuationReason ? <p className="muted">{t('appraisals.valuationReason')}: {request.valuationReason}</p> : null}
              {request.conditionNotes ? <p className="muted">{t('appraisals.conditionNotes')}: {request.conditionNotes}</p> : null}
              {request.availabilityNotes ? <p className="muted">{t('appraisals.availabilityNotes')}: {request.availabilityNotes}</p> : null}
              {request.additionalNotes ? <p className="muted">{t('appraisals.additionalNotes')}: {request.additionalNotes}</p> : null}
            </div>
          </section>
        ) : null}
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
    rooms: parseNullableNumber(form.rooms) ?? undefined,
    bedrooms: parseNullableNumber(form.bedrooms) ?? undefined,
    bathrooms: parseNullableNumber(form.bathrooms) ?? undefined,
    expenses: parseNullableNumber(form.expenses) ?? undefined,
    floor: form.floor.trim() || undefined,
    amenities: form.amenities || undefined,
    orientation: form.orientation || undefined,
    disposition: form.disposition || undefined,
    ageYears: parseNullableNumber(form.ageYears) ?? undefined,
    coveredArea: parseNullableNumber(form.coveredArea) ?? undefined,
    semiCoveredArea: parseNullableNumber(form.semiCoveredArea) ?? undefined,
    uncoveredArea: parseNullableNumber(form.uncoveredArea) ?? undefined,
    hasGarage: form.hasGarage,
    conditionNotes: form.conditionNotes || undefined,
    valuationReason: form.valuationReason || undefined,
    availabilityNotes: form.availabilityNotes || undefined,
    additionalNotes: form.additionalNotes || undefined,
  };
}

function buildFormState(request: AppraisalRequest): AppraisalFormState {
  return {
    contactId: String(request.contactId),
    propertyAddress: request.propertyAddress ?? '',
    city: request.city ?? '',
    neighborhood: request.neighborhood ?? '',
    propertyType: request.propertyType ?? '',
    operationType: request.operationType ?? '',
    rooms: toInputNumberValue(request.rooms),
    bedrooms: toInputNumberValue(request.bedrooms),
    bathrooms: toInputNumberValue(request.bathrooms),
    expenses: toInputNumberValue(request.expenses),
    floor: request.floor ?? '',
    amenities: request.amenities ?? '',
    orientation: request.orientation ?? '',
    disposition: request.disposition ?? '',
    ageYears: toInputNumberValue(request.ageYears),
    coveredArea: toInputNumberValue(request.coveredArea),
    semiCoveredArea: toInputNumberValue(request.semiCoveredArea),
    uncoveredArea: toInputNumberValue(request.uncoveredArea),
    hasGarage: request.hasGarage ?? false,
    conditionNotes: request.conditionNotes ?? '',
    valuationReason: request.valuationReason ?? '',
    availabilityNotes: request.availabilityNotes ?? '',
    additionalNotes: request.additionalNotes ?? '',
  };
}

function toInputNumberValue(value: number | null) {
  return value === null ? '' : String(value);
}
