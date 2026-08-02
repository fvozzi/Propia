import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { SearchableCombobox } from '../components/SearchableCombobox';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  buildPropertySearchMessage,
  buildReservationTreasuryWhatsappMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from '../lib/whatsapp';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import type {
  Activity,
  ActivityType,
  Contact,
  CurrencyType,
  OperationType,
  Paginated,
  Property,
  PropertyType,
  ReservationActivityData,
} from '../types';

type PropertySearchFeedback = '' | 'LIKED' | 'DISLIKED';

type ActivityFormState = {
  activityType: ActivityType;
  contactId: string;
  propertyId: string;
  activityDate: string;
  nextFollowUpDate: string;
  title: string;
  description: string;
  appraisalPropertyAddress: string;
  externalUrl: string;
  whatsappComment: string;
  markShared: boolean;
  propertySearchFeedback: PropertySearchFeedback;
  reservationAgentName: string;
  reservationOperationType: '' | OperationType;
  reservationOperationAmount: string;
  reservationOperationCurrency: CurrencyType;
  reservationPropertyAddress: string;
  reservationPropertyNeighborhood: string;
  reservationPropertyType: '' | PropertyType;
  reservationSidesCount: string;
  reservationCommissionPercent: string;
  reservationAmount: string;
  reservationCurrency: CurrencyType;
  reservationSharedWithRealEstate: boolean;
  reservationConformed: boolean;
  reservationCredit: boolean;
  reservationRelocation: boolean;
  reservationEstimatedClosingMonth: string;
  reservationObservations: string;
};

const initialForm: ActivityFormState = {
  activityType: 'CALL',
  contactId: '',
  propertyId: '',
  activityDate: '',
  nextFollowUpDate: '',
  title: '',
  description: '',
  appraisalPropertyAddress: '',
  externalUrl: '',
  whatsappComment: '',
  markShared: false,
  propertySearchFeedback: '',
  reservationAgentName: '',
  reservationOperationType: '',
  reservationOperationAmount: '',
  reservationOperationCurrency: 'USD',
  reservationPropertyAddress: '',
  reservationPropertyNeighborhood: '',
  reservationPropertyType: '',
  reservationSidesCount: '',
  reservationCommissionPercent: '',
  reservationAmount: '',
  reservationCurrency: 'USD',
  reservationSharedWithRealEstate: false,
  reservationConformed: false,
  reservationCredit: false,
  reservationRelocation: false,
  reservationEstimatedClosingMonth: '',
  reservationObservations: '',
};

export function ActivitiesCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactMatches, setContactMatches] = useState<Contact[] | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [linkProperty, setLinkProperty] = useState(false);
  const [savingAndSharing, setSavingAndSharing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ActivityFormState>(initialForm);
  const formRef = useRef<HTMLFormElement | null>(null);

  const activityId = id ? Number(id) : null;
  const isEditing = Boolean(activityId);
  const isPropertySearch = form.activityType === 'PROPERTY_SEARCH';
  const isAppraisalRequest = form.activityType === 'APPRAISAL_REQUEST';
  const isReservation = form.activityType === 'RESERVATION';
  const contactSearchTerm = contactSearch.trim();
  const activityContact =
    activity?.contact && String(activity.contact.id) === form.contactId ? activity.contact : null;
  const selectedContact =
    contactMatches?.find((contact) => String(contact.id) === form.contactId) ??
    contacts.find((contact) => String(contact.id) === form.contactId) ??
    activityContact ??
    null;
  const visibleContacts = mergeContacts(
    contactSearchTerm ? contactMatches ?? [] : contacts,
    selectedContact ? [selectedContact] : [],
  );
  const selectedProperty = properties.find((property) => String(property.id) === form.propertyId) ?? null;
  const showSavedPreview =
    isPropertySearch &&
    activity &&
    form.externalUrl.trim() === (activity.externalUrl ?? '').trim() &&
    Boolean(
      activity.externalPreviewImageUrl ||
        activity.externalPreviewTitle ||
        activity.externalPreviewDescription ||
        activity.externalPreviewDomain,
    );
  const canShareNow = Boolean(
    isPropertySearch &&
      selectedContact &&
      getContactWhatsappPhone(selectedContact) &&
      form.externalUrl.trim(),
  );

  useEffect(() => {
    async function loadDependencies() {
      const [contactsData, propertiesData, activityData] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100&sortBy=DISPLAY_NAME&sortDirection=ASC'),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
        isEditing && activityId
          ? apiRequest<Activity>(`/activities/${activityId}`)
          : Promise.resolve(null),
      ]);

      setContacts(
        mergeContacts(contactsData.items, activityData?.contact ? [activityData.contact] : []),
      );
      setProperties(propertiesData.items);

      if (activityData) {
        setActivity(activityData);
        setLinkProperty(Boolean(activityData.propertyId));
        setForm({
          activityType: activityData.activityType,
          contactId: activityData.contactId ? String(activityData.contactId) : '',
          propertyId: activityData.propertyId ? String(activityData.propertyId) : '',
          activityDate: toDateTimeLocalValue(activityData.activityDate),
          nextFollowUpDate: toDateTimeLocalValue(activityData.nextFollowUpDate),
          title: activityData.title,
          description: activityData.description ?? '',
          appraisalPropertyAddress: activityData.appraisalRequest?.propertyAddress ?? '',
          externalUrl: activityData.externalUrl ?? '',
          whatsappComment: activityData.whatsappComment ?? '',
          markShared: Boolean(activityData.whatsappSharedAt),
          propertySearchFeedback:
            activityData.propertySearchLiked === true
              ? 'LIKED'
              : activityData.propertySearchLiked === false
                ? 'DISLIKED'
                : '',
          reservationAgentName:
            activityData.reservationData?.agentName ?? user?.name ?? '',
          reservationOperationType:
            activityData.reservationData?.operationType ?? '',
          reservationOperationAmount: toInputNumberValue(
            activityData.reservationData?.operationAmount,
          ),
          reservationOperationCurrency:
            activityData.reservationData?.operationCurrency ?? 'USD',
          reservationPropertyAddress:
            activityData.reservationData?.propertyAddress ??
            activityData.property?.address ??
            '',
          reservationPropertyNeighborhood:
            activityData.reservationData?.propertyNeighborhood ??
            activityData.property?.neighborhood ??
            '',
          reservationPropertyType:
            activityData.reservationData?.propertyType ??
            activityData.property?.propertyType ??
            '',
          reservationSidesCount: toInputNumberValue(
            activityData.reservationData?.sidesCount,
          ),
          reservationCommissionPercent: toInputNumberValue(
            activityData.reservationData?.commissionPercent,
          ),
          reservationAmount: toInputNumberValue(
            activityData.reservationData?.reservationAmount,
          ),
          reservationCurrency:
            activityData.reservationData?.reservationCurrency ?? 'USD',
          reservationSharedWithRealEstate:
            activityData.reservationData?.sharedWithRealEstate ?? false,
          reservationConformed:
            activityData.reservationData?.conformed ?? false,
          reservationCredit: activityData.reservationData?.credit ?? false,
          reservationRelocation:
            activityData.reservationData?.relocation ?? false,
          reservationEstimatedClosingMonth:
            activityData.reservationData?.estimatedClosingMonth ?? '',
          reservationObservations:
            activityData.reservationData?.observations ?? '',
        });
      }

      setLoading(false);
    }

    void loadDependencies();
  }, [activityId, isEditing, user?.name]);

  useEffect(() => {
    if (!contactSearchTerm) {
      setContactMatches(null);
      setContactsLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setContactsLoading(true);
      void apiRequest<Paginated<Contact>>(
        `/contacts?page=1&limit=100&sortBy=DISPLAY_NAME&sortDirection=ASC&search=${encodeURIComponent(contactSearchTerm)}`,
      )
        .then((contactsData) => {
          if (cancelled) {
            return;
          }

          setContactMatches(contactsData.items);
          setContacts((current) => mergeContacts(current, contactsData.items));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setContactMatches([]);
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setContactsLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [contactSearchTerm]);

  useEffect(() => {
    if (!isReservation || !selectedProperty) {
      return;
    }

    setForm((current) => ({
      ...current,
      reservationPropertyAddress:
        current.reservationPropertyAddress || selectedProperty.address || '',
      reservationPropertyNeighborhood:
        current.reservationPropertyNeighborhood || selectedProperty.neighborhood || '',
      reservationPropertyType:
        current.reservationPropertyType || selectedProperty.propertyType || '',
      reservationOperationType:
        current.reservationOperationType || selectedProperty.operationType || '',
    }));
  }, [isReservation, selectedProperty]);

  async function saveActivity(shareNow: boolean) {
    const saved = await apiRequest<Activity>(
      isEditing && activityId ? `/activities/${activityId}` : '/activities',
      {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(buildActivityPayload(form, linkProperty, activity)),
      },
    );

    const nextActivity = saved;
    setActivity(nextActivity);

    if (shareNow && isReservation) {
      const treasuryPhone = user?.activeTeamWhatsappTreasuryPhone?.trim() || '';
      if (!treasuryPhone) {
        throw new Error('Falta configurar el numero de WhatsApp de tesoreria para este equipo');
      }

      const message = buildReservationTreasuryWhatsappMessage(
        nextActivity,
        user?.name ?? null,
      );
      openWhatsAppShareUrl(
        buildWhatsAppShareUrl(
          { whatsapp: treasuryPhone, phone: null },
          message,
        ),
      );
      const shared = await apiRequest<Activity>(`/activities/${nextActivity.id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      window.alert(t('common.whatsappSent'));
      setActivity(shared);
      return shared;
    }

    if (shareNow && isPropertySearch && selectedContact) {
      const message = buildPropertySearchMessage(nextActivity);
      openWhatsAppShareUrl(buildWhatsAppShareUrl(selectedContact, message));
      const shared = await apiRequest<Activity>(`/activities/${nextActivity.id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({
          whatsappComment: nextActivity.whatsappComment ?? undefined,
        }),
      });
      window.alert(t('common.whatsappSent'));
      setActivity(shared);
      return shared;
    }

    return nextActivity;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const saved = await saveActivity(false);
      if (saved.activityType === 'APPRAISAL_REQUEST' && saved.appraisalRequestId) {
        navigate(`/appraisals/${saved.appraisalRequestId}/edit`);
        return;
      }

      navigate('/activities');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la actividad');
    }
  }

  async function handleSaveAndShare() {
    if (!canShareNow && !isReservation) return;
    if (!formRef.current?.reportValidity()) return;

    setSavingAndSharing(true);
    setError('');

    try {
      await saveActivity(true);
      navigate('/activities');
    } catch (shareError) {
      setError(
        shareError instanceof Error
          ? shareError.message
          : 'No se pudo guardar y enviar el mensaje por WhatsApp',
      );
    } finally {
      setSavingAndSharing(false);
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <ResourcePageHeader
          eyebrow={t('activities.eyebrow')}
          title={isEditing ? t('activities.editActivity') : t('activities.newActivity')}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('activities.eyebrow')}
        title={isEditing ? t('activities.editActivity') : t('activities.newActivity')}
        actions={
          <Link to="/activities" className="ghost-button button-link">
            {t('activities.backToList')}
          </Link>
        }
      />

      {error ? <div className="card">{error}</div> : null}

      <section className="card">
        <form ref={formRef} className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('common.type')}
            <select
              value={form.activityType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  activityType: event.target.value as ActivityType,
                  propertySearchFeedback:
                    event.target.value === 'PROPERTY_SEARCH'
                      ? current.propertySearchFeedback
                      : '',
                  markShared:
                    event.target.value === 'PROPERTY_SEARCH' ? current.markShared : false,
                  externalUrl:
                    event.target.value === 'PROPERTY_SEARCH' ||
                    event.target.value === 'RESERVATION'
                      ? current.externalUrl
                      : '',
                  whatsappComment:
                    event.target.value === 'PROPERTY_SEARCH' ? current.whatsappComment : '',
                  reservationAgentName:
                    event.target.value === 'RESERVATION'
                      ? current.reservationAgentName || user?.name || ''
                      : current.reservationAgentName,
                }))
              }
              disabled={isEditing && activity?.activityType === 'APPRAISAL_REQUEST'}
            >
              {activityTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('activityType', option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('common.contact')}
            <SearchableCombobox
              value={form.contactId}
              options={visibleContacts.map((contact) => ({
                value: String(contact.id),
                label: contact.displayName,
              }))}
              searchValue={contactSearch}
              onSearchValueChange={setContactSearch}
              onChange={(value) =>
                setForm((current) => ({ ...current, contactId: value }))
              }
              placeholder={t('common.search')}
              emptyLabel={t('activities.withoutContact')}
              loadingLabel={t('common.loading')}
              noResultsLabel={t('common.noData')}
              required={isPropertySearch || isAppraisalRequest}
              loading={contactsLoading}
            />
          </label>
          {isAppraisalRequest ? (
            <label>
              {t('appraisals.propertyAddress')}
              <input
                value={form.appraisalPropertyAddress}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    appraisalPropertyAddress: event.target.value,
                  }))
                }
                required
              />
            </label>
          ) : (
            <>
              <label>
                {t('activities.activityDate')}
                <input
                  type="datetime-local"
                  value={form.activityDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, activityDate: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.nextFollowUp')}
                <input
                  type="datetime-local"
                  value={form.nextFollowUpDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      nextFollowUpDate: event.target.value,
                    }))
                  }
                />
              </label>
            </>
          )}
          {!isAppraisalRequest ? (
            <div className="full-span stack-gap">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={linkProperty}
                  onChange={(event) => setLinkProperty(event.target.checked)}
                />
                <span>{t('activities.linkProperty')}</span>
              </label>
              {linkProperty ? (
                <label>
                  {t('activities.linkedProperty')}
                  <select
                    value={form.propertyId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, propertyId: event.target.value }))
                    }
                  >
                    <option value="">{t('activities.withoutProperty')}</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {formatPropertyOptionLabel(property, translateEnum, t)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {isAppraisalRequest ? (
            <p className="muted full-span">{t('activities.appraisalRequestHint')}</p>
          ) : null}
          {isPropertySearch ? (
            <>
              <label className="full-span">
                {t('activities.listingUrl')}
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, externalUrl: event.target.value }))
                  }
                  required
                />
              </label>
              {showSavedPreview ? (
                <div className="full-span">
                  <ActivityPreviewCard activity={activity} title={t('activities.listingPreview')} />
                </div>
              ) : null}
              <label className="full-span">
                {t('activities.buyerFeedback')}
                <select
                  value={form.propertySearchFeedback}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      propertySearchFeedback: event.target.value as PropertySearchFeedback,
                    }))
                  }
                >
                  <option value="">{t('activities.noFeedback')}</option>
                  <option value="LIKED">{t('activities.likedProperty')}</option>
                  <option value="DISLIKED">{t('activities.dislikedProperty')}</option>
                </select>
              </label>
              <label className="full-span">
                {t('activities.whatsappComment')}
                <textarea
                  rows={3}
                  value={form.whatsappComment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      whatsappComment: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="checkbox-item full-span">
                <input
                  type="checkbox"
                  checked={form.markShared}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, markShared: event.target.checked }))
                  }
                />
                <span>{t('activities.markShared')}</span>
              </label>
              <label className="full-span">
                {t('activities.internalNotes')}
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
            </>
          ) : isReservation ? (
            <>
              <div className="full-span stack-gap">
                <strong>{t('activities.reservationDataTitle')}</strong>
              </div>
              <label>
                {t('activities.reservationAgentName')}
                <input
                  value={form.reservationAgentName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationAgentName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.reservationOperationType')}
                <select
                  value={form.reservationOperationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationOperationType: event.target.value as '' | OperationType,
                    }))
                  }
                  required
                >
                  <option value="">{t('common.unassigned')}</option>
                  <option value="SALE">{translateEnum('operationType', 'SALE')}</option>
                  <option value="BUY">{translateEnum('operationType', 'BUY')}</option>
                  <option value="RENT">{translateEnum('operationType', 'RENT')}</option>
                </select>
              </label>
              <label>
                {t('activities.reservationOperationAmount')}
                <input
                  type="number"
                  step="0.01"
                  value={form.reservationOperationAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationOperationAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationOperationCurrency')}
                <select
                  value={form.reservationOperationCurrency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationOperationCurrency: event.target.value as CurrencyType,
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label>
                {t('activities.reservationPropertyAddress')}
                <input
                  value={form.reservationPropertyAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationPropertyAddress: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationPropertyNeighborhood')}
                <input
                  value={form.reservationPropertyNeighborhood}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationPropertyNeighborhood: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationPropertyType')}
                <select
                  value={form.reservationPropertyType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationPropertyType: event.target.value as '' | PropertyType,
                    }))
                  }
                >
                  <option value="">{t('common.unassigned')}</option>
                  {propertyTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateEnum('propertyType', option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('activities.reservationSidesCount')}
                <input
                  type="number"
                  min="0"
                  value={form.reservationSidesCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationSidesCount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationCommissionPercent')}
                <input
                  type="number"
                  step="0.01"
                  value={form.reservationCommissionPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationCommissionPercent: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationAmount')}
                <input
                  type="number"
                  step="0.01"
                  value={form.reservationAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationCurrency')}
                <select
                  value={form.reservationCurrency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationCurrency: event.target.value as CurrencyType,
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationSharedWithRealEstate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationSharedWithRealEstate: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationSharedWithRealEstate')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationConformed}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationConformed: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationConformed')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationCredit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationCredit: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationCredit')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationRelocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationRelocation: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationRelocation')}</span>
              </label>
              <label>
                {t('activities.reservationEstimatedClosingMonth')}
                <input
                  value={form.reservationEstimatedClosingMonth}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationEstimatedClosingMonth: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                {t('activities.reservationObservations')}
                <textarea
                  rows={4}
                  value={form.reservationObservations}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationObservations: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                {t('activities.reservationDocument')}
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      externalUrl: event.target.value,
                    }))
                  }
                  placeholder="https://drive.google.com/..."
                  required
                />
                <p className="muted">{t('activities.reservationDocumentHint')}</p>
                {activity?.externalUrl ? (
                  <p className="muted">
                    {t('activities.reservationDocumentCurrent')}:{' '}
                    <a
                      href={activity.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="agenda-link"
                    >
                      {activity.externalUrl}
                    </a>
                  </p>
                ) : null}
              </label>
              <label className="full-span">
                {t('common.description')}
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={3}
                />
              </label>
            </>
          ) : (
            <label className="full-span">
              {t('common.description')}
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
              />
            </label>
          )}
          <div className="full-span calendar-related-actions">
            <button type="submit">{isEditing ? t('common.update') : t('activities.save')}</button>
            {form.activityType === 'CALL' && selectedContact ? (
              <Link
                to={buildRequirementCreateLink(selectedContact.id)}
                target="_blank"
                rel="noreferrer"
                className="ghost-button button-link"
              >
                {t('requirements.newRequirement')}
              </Link>
            ) : null}
            {isAppraisalRequest && activity?.appraisalRequestId ? (
              <Link
                to={`/appraisals/${activity.appraisalRequestId}/edit`}
                className="ghost-button button-link"
              >
                {t('activities.openAppraisalRequest')}
              </Link>
            ) : null}
            {isPropertySearch ? (
              <button
                type="button"
                className="ghost-button"
                disabled={!canShareNow || savingAndSharing}
                onClick={handleSaveAndShare}
              >
                {savingAndSharing ? t('common.loading') : t('activities.saveAndShare')}
              </button>
            ) : null}
            {isReservation ? (
              <button
                type="button"
                className="ghost-button"
                disabled={savingAndSharing}
                onClick={handleSaveAndShare}
              >
                {savingAndSharing
                  ? t('common.loading')
                  : t('activities.reservationSaveAndSend')}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function buildActivityPayload(
  form: ActivityFormState,
  linkProperty: boolean,
  activity: Activity | null,
) {
  const isPropertySearch = form.activityType === 'PROPERTY_SEARCH';
  const isAppraisalRequest = form.activityType === 'APPRAISAL_REQUEST';
  const isReservation = form.activityType === 'RESERVATION';
  const activityDate = isAppraisalRequest
    ? activity?.activityDate ?? new Date().toISOString()
    : form.activityDate;

  return {
    contactId: form.contactId ? Number(form.contactId) : null,
    propertyId:
      !isAppraisalRequest && linkProperty && form.propertyId ? Number(form.propertyId) : null,
    activityType: form.activityType,
    title: isAppraisalRequest ? 'Prelisting' : form.title.trim() || undefined,
    description: isAppraisalRequest ? null : form.description || null,
    appraisalPropertyAddress: isAppraisalRequest ? form.appraisalPropertyAddress || null : null,
    externalUrl:
      isPropertySearch || isReservation ? form.externalUrl || null : null,
    whatsappComment: isPropertySearch ? form.whatsappComment || null : null,
    whatsappSharedAt:
      !isPropertySearch
        ? null
        : form.markShared
          ? activity?.whatsappSharedAt ?? new Date().toISOString()
          : null,
    propertySearchLiked:
      !isPropertySearch
        ? null
        : form.propertySearchFeedback === 'LIKED'
          ? true
          : form.propertySearchFeedback === 'DISLIKED'
            ? false
            : null,
    reservationData: isReservation ? buildReservationDataPayload(form) : null,
    activityDate,
    nextFollowUpDate: isAppraisalRequest ? null : form.nextFollowUpDate || null,
  };
}

function buildReservationDataPayload(
  form: ActivityFormState,
): ReservationActivityData {
  return {
    agentName: form.reservationAgentName.trim() || null,
    operationType: form.reservationOperationType || null,
    operationAmount: parseOptionalNumber(form.reservationOperationAmount),
    operationCurrency: form.reservationOperationCurrency,
    propertyAddress: form.reservationPropertyAddress.trim() || null,
    propertyNeighborhood: form.reservationPropertyNeighborhood.trim() || null,
    propertyType: form.reservationPropertyType || null,
    sidesCount: parseOptionalNumber(form.reservationSidesCount),
    commissionPercent: parseOptionalNumber(form.reservationCommissionPercent),
    reservationAmount: parseOptionalNumber(form.reservationAmount),
    reservationCurrency: form.reservationCurrency,
    sharedWithRealEstate: form.reservationSharedWithRealEstate,
    conformed: form.reservationConformed,
    credit: form.reservationCredit,
    relocation: form.reservationRelocation,
    estimatedClosingMonth: form.reservationEstimatedClosingMonth.trim() || null,
    observations: form.reservationObservations.trim() || null,
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toInputNumberValue(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

const propertyTypeOptions: PropertyType[] = [
  'HOUSE',
  'APARTMENT',
  'PH',
  'LAND',
  'OFFICE',
  'COMMERCIAL',
  'OTHER',
];

function toDateTimeLocalValue(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
}

function mergeContacts(...groups: Array<Contact[] | null | undefined>) {
  const uniqueContacts = new Map<number, Contact>();

  groups.forEach((group) => {
    group?.forEach((contact) => {
      uniqueContacts.set(contact.id, contact);
    });
  });

  return Array.from(uniqueContacts.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'es', { sensitivity: 'base' }),
  );
}

function formatPropertyOptionLabel(
  property: Property,
  translateEnum: (group: 'propertyStatus', value: string) => string,
  t: (path: string) => string,
) {
  const details = [property.neighborhood];

  if (property.price) {
    details.push(`${property.currency} ${property.price}`);
  } else {
    details.push(t('properties.noPrice'));
  }

  details.push(translateEnum('propertyStatus', property.status));

  return `${property.title} - ${details.filter(Boolean).join(' - ')}`;
}

function buildRequirementCreateLink(contactId: number) {
  const params = new URLSearchParams({
    contactId: String(contactId),
  });

  return `/requirements/new?${params.toString()}`;
}

function ActivityPreviewCard({
  activity,
  title,
}: {
  activity: Activity;
  title: string;
}) {
  const previewTitle = activity.externalPreviewTitle ?? activity.title;
  const previewDescription = activity.externalPreviewDescription;
  const previewDomain = activity.externalPreviewDomain;
  const previewImageUrl = activity.externalPreviewImageUrl;

  if (!previewTitle && !previewDescription && !previewImageUrl && !previewDomain) {
    return null;
  }

  return (
    <div className="activity-preview-card">
      {previewImageUrl ? (
        <img src={previewImageUrl} alt={previewTitle ?? title} className="activity-preview-image" />
      ) : null}
      <div className="activity-preview-copy">
        <p className="eyebrow activity-preview-eyebrow">{title}</p>
        {previewTitle ? <strong>{previewTitle}</strong> : null}
        {previewDescription ? <p className="muted">{previewDescription}</p> : null}
        {previewDomain ? <p className="muted">{previewDomain}</p> : null}
      </div>
    </div>
  );
}
