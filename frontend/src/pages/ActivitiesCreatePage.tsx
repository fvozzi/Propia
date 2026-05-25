import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import {
  buildPropertySearchMessage,
  buildWhatsAppShareUrl,
  getContactWhatsappPhone,
  navigateWhatsAppShareWindow,
  openWhatsAppShareWindow,
} from '../lib/whatsapp';
import type { Activity, ActivityType, Contact, Paginated, Property } from '../types';

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
};

export function ActivitiesCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [linkProperty, setLinkProperty] = useState(false);
  const [savingAndSharing, setSavingAndSharing] = useState(false);
  const [form, setForm] = useState<ActivityFormState>(initialForm);

  const activityId = id ? Number(id) : null;
  const isEditing = Boolean(activityId);
  const isPropertySearch = form.activityType === 'PROPERTY_SEARCH';
  const isAppraisalRequest = form.activityType === 'APPRAISAL_REQUEST';
  const selectedContact = contacts.find((contact) => String(contact.id) === form.contactId) ?? null;
  const canShareNow = Boolean(isPropertySearch && selectedContact && getContactWhatsappPhone(selectedContact) && form.externalUrl.trim());

  useEffect(() => {
    async function loadDependencies() {
      const [contactsData, propertiesData, activityData] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
        isEditing && activityId ? apiRequest<Activity>(`/activities/${activityId}`) : Promise.resolve(null),
      ]);

      setContacts(contactsData.items);
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
        });
      }

      setLoading(false);
    }

    void loadDependencies();
  }, [activityId, isEditing]);

  async function saveActivity(shareNow: boolean, shareWindow: Window | null) {
    const saved = await apiRequest<Activity>(isEditing && activityId ? `/activities/${activityId}` : '/activities', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify(buildActivityPayload(form, linkProperty, activity)),
    });

    setActivity(saved);

    if (shareNow && selectedContact) {
      try {
        const shared = await apiRequest<Activity>(`/activities/${saved.id}/share`, {
          method: 'PATCH',
          body: JSON.stringify({
            whatsappComment: form.whatsappComment || undefined,
          }),
        });
        const whatsappUrl = buildWhatsAppShareUrl(selectedContact, buildPropertySearchMessage(shared));
        navigateWhatsAppShareWindow(shareWindow, whatsappUrl);
        setActivity(shared);
        return shared;
      } catch (error) {
        shareWindow?.close();
        throw error;
      }
    }

    return saved;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await saveActivity(false, null);
    if (saved.activityType === 'APPRAISAL_REQUEST' && saved.appraisalRequestId) {
      navigate(`/appraisals/${saved.appraisalRequestId}/edit`);
      return;
    }
    navigate('/activities');
  }

  async function handleSaveAndShare() {
    if (!canShareNow) return;

    const shareWindow = openWhatsAppShareWindow();
    const previousMarkShared = form.markShared;
    setForm((current) => ({ ...current, markShared: true }));
    setSavingAndSharing(true);

    try {
      await saveActivity(true, shareWindow);
      navigate('/activities');
    } catch (error) {
      setForm((current) => ({ ...current, markShared: previousMarkShared }));
      throw error;
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

      <section className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('common.type')}
            <select
              value={form.activityType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  activityType: event.target.value as ActivityType,
                  propertySearchFeedback:
                    event.target.value === 'PROPERTY_SEARCH' ? current.propertySearchFeedback : '',
                  markShared: event.target.value === 'PROPERTY_SEARCH' ? current.markShared : false,
                  externalUrl: event.target.value === 'PROPERTY_SEARCH' ? current.externalUrl : '',
                  whatsappComment: event.target.value === 'PROPERTY_SEARCH' ? current.whatsappComment : '',
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
            <select
              value={form.contactId}
              onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
              required={isPropertySearch || isAppraisalRequest}
            >
              <option value="">{t('activities.withoutContact')}</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.displayName}
                </option>
              ))}
            </select>
          </label>
          {isAppraisalRequest ? (
            <label>
              {t('appraisals.propertyAddress')}
              <input
                value={form.appraisalPropertyAddress}
                onChange={(event) => setForm((current) => ({ ...current, appraisalPropertyAddress: event.target.value }))}
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
                  onChange={(event) => setForm((current) => ({ ...current, activityDate: event.target.value }))}
                  required
                />
              </label>
              <label>
                {t('activities.nextFollowUp')}
                <input
                  type="datetime-local"
                  value={form.nextFollowUpDate}
                  onChange={(event) => setForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))}
                />
              </label>
            </>
          )}
          {!isAppraisalRequest ? (
            <div className="full-span stack-gap">
              <label className="checkbox-item">
                <input type="checkbox" checked={linkProperty} onChange={(event) => setLinkProperty(event.target.checked)} />
                <span>{t('activities.linkProperty')}</span>
              </label>
              {linkProperty ? (
                <label>
                  {t('activities.linkedProperty')}
                  <select
                    value={form.propertyId}
                    onChange={(event) => setForm((current) => ({ ...current, propertyId: event.target.value }))}
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
          {!isAppraisalRequest ? (
            <label className="full-span">
              {isPropertySearch ? t('activities.listingTitle') : t('common.title')}
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
          ) : null}
          {isAppraisalRequest ? <p className="muted full-span">{t('activities.appraisalRequestHint')}</p> : null}
          {isPropertySearch ? (
            <>
              <label className="full-span">
                {t('activities.listingUrl')}
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))}
                  required
                />
              </label>
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
                  onChange={(event) => setForm((current) => ({ ...current, whatsappComment: event.target.value }))}
                />
              </label>
              <label className="checkbox-item full-span">
                <input
                  type="checkbox"
                  checked={form.markShared}
                  onChange={(event) => setForm((current) => ({ ...current, markShared: event.target.checked }))}
                />
                <span>{t('activities.markShared')}</span>
              </label>
              <label className="full-span">
                {t('activities.internalNotes')}
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
            </>
          ) : (
            <label className="full-span">
              {t('common.description')}
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </label>
          )}
          <div className="full-span calendar-related-actions">
            <button type="submit">{isEditing ? t('common.update') : t('activities.save')}</button>
            {isAppraisalRequest && activity?.appraisalRequestId ? (
              <Link to={`/appraisals/${activity.appraisalRequestId}/edit`} className="ghost-button button-link">
                {t('activities.openAppraisalRequest')}
              </Link>
            ) : null}
            {isPropertySearch ? (
              <button type="button" className="ghost-button" disabled={!canShareNow || savingAndSharing} onClick={handleSaveAndShare}>
                {savingAndSharing ? t('common.loading') : t('activities.saveAndShare')}
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
  const activityDate =
    isAppraisalRequest
      ? activity?.activityDate ?? new Date().toISOString()
      : form.activityDate;

  return {
    contactId: form.contactId ? Number(form.contactId) : null,
    propertyId: !isAppraisalRequest && linkProperty && form.propertyId ? Number(form.propertyId) : null,
    activityType: form.activityType,
    title: isAppraisalRequest ? 'Solicitud de tasacion' : form.title,
    description: isAppraisalRequest ? null : form.description || null,
    appraisalPropertyAddress: isAppraisalRequest ? form.appraisalPropertyAddress || null : null,
    externalUrl: isPropertySearch ? form.externalUrl || null : null,
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
    activityDate,
    nextFollowUpDate: isAppraisalRequest ? null : form.nextFollowUpDate || null,
  };
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
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

  return `${property.title} · ${details.filter(Boolean).join(' · ')}`;
}
