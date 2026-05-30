import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  buildAppraisalMailtoUrl,
  buildPublicAppraisalUrl,
  canShareAppraisalByEmail,
  canShareAppraisalByWhatsApp,
} from '../lib/appraisals';
import { useI18n } from '../lib/i18n';
import type { AppraisalRequest, Contact, Paginated } from '../types';

type AppraisalFormState = {
  contactId: string;
  propertyAddress: string;
};

const initialForm: AppraisalFormState = {
  contactId: '',
  propertyAddress: '',
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
      await apiRequest(`/appraisal-requests/${request.id}/send-whatsapp`, {
        method: 'POST',
      });
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
          <button type="submit" className="full-span">
            {t('appraisals.save')}
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
  };
}
