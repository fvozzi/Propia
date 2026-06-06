import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StatusPill } from '../components/StatusPill';
import { Timeline, type TimelineItem } from '../components/Timeline';
import { apiRequest } from '../lib/api';
import { calculateAppraisalAreas, parseNullableNumber } from '../lib/appraisals';
import { appraisalDispositionOptions, appraisalOrientationOptions, propertyStatusOptions, useI18n } from '../lib/i18n';
import type { Contact, Property, PropertyStatus } from '../types';

export function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatDateTime, t, translateEnum } = useI18n();
  const [property, setProperty] = useState<Property | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  async function load() {
    const [propertyData, contactsData] = await Promise.all([
      apiRequest<Property>(`/properties/${id}`),
      apiRequest<{ items: Contact[] }>('/contacts?page=1&limit=100'),
    ]);
    setProperty(propertyData);
    setContacts(contactsData.items);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const coveredArea = parseNullableNumber(String(formData.get('coveredArea') ?? ''));
    const semiCoveredArea = parseNullableNumber(String(formData.get('semiCoveredArea') ?? ''));
    const uncoveredArea = parseNullableNumber(String(formData.get('uncoveredArea') ?? ''));
    const computedAreas = calculateAppraisalAreas({ coveredArea, semiCoveredArea, uncoveredArea });
    await apiRequest(`/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: formData.get('title'),
        description: formData.get('description'),
        address: formData.get('address'),
        city: formData.get('city'),
        neighborhood: formData.get('neighborhood'),
        status: formData.get('status') as PropertyStatus,
        price: formData.get('price') ? Number(formData.get('price')) : null,
        expenses: formData.get('expenses') ? Number(formData.get('expenses')) : null,
        rooms: formData.get('rooms') ? Number(formData.get('rooms')) : null,
        bedrooms: formData.get('bedrooms') ? Number(formData.get('bedrooms')) : null,
        bathrooms: formData.get('bathrooms') ? Number(formData.get('bathrooms')) : null,
        coveredArea,
        semiCoveredArea,
        uncoveredArea,
        totalArea: computedAreas.totalArea,
        weightedArea: computedAreas.weightedArea,
        floor: formData.get('floor') ? Number(formData.get('floor')) : null,
        amenities: formData.get('amenities'),
        orientation: formData.get('orientation') || null,
        disposition: formData.get('disposition') || null,
        ageYears: formData.get('ageYears') ? Number(formData.get('ageYears')) : null,
        hasGarage: formData.get('hasGarage') === 'on',
        ownerContactId: formData.get('ownerContactId')
          ? Number(formData.get('ownerContactId'))
          : property?.ownerContactId ?? null,
        privateNotes: formData.get('privateNotes'),
        photos: property?.photos ?? [],
      }),
    });
    navigate('/properties');
  }

  const computedAreas = calculateAppraisalAreas({
    coveredArea: property?.coveredArea ?? null,
    semiCoveredArea: property?.semiCoveredArea ?? null,
    uncoveredArea: property?.uncoveredArea ?? null,
  });

  if (!property) {
    return <p>{t('common.loading')}</p>;
  }

  const shareText = encodeURIComponent(
    `${property.title}\n${property.address}, ${property.neighborhood ?? property.city}\n${property.price ? `${property.currency} ${property.price}` : t('properties.noPrice')}\n${property.description ?? ''}`,
  );

  const timelineItems: TimelineItem[] = [
    ...(property.activities ?? []).map((activity) => ({
      id: `activity-${activity.id}`,
      date: activity.activityDate,
      title: activity.title,
      subtitle: activity.contact ? `${t('properties.contactPrefix')}: ${activity.contact.displayName}` : undefined,
      description:
        activity.description ??
        (activity.nextFollowUpDate ? `${t('properties.followUpPrefix')}: ${formatDateTime(activity.nextFollowUpDate)}` : null),
      type: activity.activityType,
    })),
    ...(property.visits ?? []).map((visit) => ({
      id: `visit-${visit.id}`,
      date: visit.scheduledAt,
      title: `${t('properties.visitWith')} ${visit.contact?.displayName ?? t('common.noContact')}`,
      subtitle: `${t('timeline.statePrefix')}: ${translateEnum('visitStatus', visit.status)}`,
      description: visit.notes,
      type: 'VISIT',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('properties.detailsEyebrow')}</p>
          <h2>{property.title}</h2>
        </div>
        <a className="button-link" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">
          {t('properties.shareWhatsApp')}
        </a>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('properties.detailsCard')}</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              {t('common.title')}
              <input name="title" defaultValue={property.title} />
            </label>
            <label>
              {t('common.status')}
              <select name="status" defaultValue={property.status}>
                {propertyStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('propertyStatus', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('properties.address')}
              <input name="address" defaultValue={property.address} />
            </label>
            <label>
              {t('common.city')}
              <input name="city" defaultValue={property.city} />
            </label>
            <label>
              {t('common.neighborhood')}
              <input name="neighborhood" defaultValue={property.neighborhood ?? ''} />
            </label>
            <label>
              {t('common.price')}
              <input name="price" defaultValue={property.price ?? ''} />
            </label>
            <label>
              {t('appraisals.expenses')}
              <input name="expenses" defaultValue={property.expenses ?? ''} />
            </label>
            <label>
              {t('appraisals.rooms')}
              <input name="rooms" defaultValue={property.rooms ?? ''} />
            </label>
            <label>
              {t('appraisals.bedrooms')}
              <input name="bedrooms" defaultValue={property.bedrooms ?? ''} />
            </label>
            <label>
              {t('appraisals.bathrooms')}
              <input name="bathrooms" defaultValue={property.bathrooms ?? ''} />
            </label>
            <label>
              {t('appraisals.coveredArea')}
              <input name="coveredArea" defaultValue={property.coveredArea ?? ''} />
            </label>
            <label>
              {t('appraisals.semiCoveredArea')}
              <input name="semiCoveredArea" defaultValue={property.semiCoveredArea ?? ''} />
            </label>
            <label>
              {t('appraisals.uncoveredArea')}
              <input name="uncoveredArea" defaultValue={property.uncoveredArea ?? ''} />
            </label>
            <label>
              {t('appraisals.totalArea')}
              <input defaultValue={computedAreas.totalArea ?? property.totalArea ?? ''} disabled />
            </label>
            <label>
              {t('appraisals.weightedArea')}
              <input defaultValue={computedAreas.weightedArea ?? property.weightedArea ?? ''} disabled />
            </label>
            <label>
              {t('appraisals.floor')}
              <input name="floor" defaultValue={property.floor ?? ''} />
            </label>
            <label>
              {t('appraisals.ageYears')}
              <input name="ageYears" defaultValue={property.ageYears ?? ''} />
            </label>
            <label>
              {t('appraisals.orientation')}
              <select name="orientation" defaultValue={property.orientation ?? ''}>
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
              <select name="disposition" defaultValue={property.disposition ?? ''}>
                <option value="">{t('common.unassigned')}</option>
                {appraisalDispositionOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('appraisalDisposition', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.owner')}
              <select name="ownerContactId" defaultValue={property.ownerContactId ?? ''} disabled={Boolean(property.appraisalRequestId)}>
                <option value="">{t('common.unassigned')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              {t('appraisals.amenitiesText')}
              <input name="amenities" defaultValue={property.amenities ?? ''} />
            </label>
            <label className="checkbox-field full-span">
              <input name="hasGarage" type="checkbox" defaultChecked={property.hasGarage ?? false} />
              <span>{t('appraisals.hasGarage')}</span>
            </label>
            <label className="full-span">
              {t('common.description')}
              <textarea name="description" rows={3} defaultValue={property.description ?? ''} />
            </label>
            <label className="full-span">
              {t('properties.privateNotes')}
              <textarea name="privateNotes" rows={3} defaultValue={property.privateNotes ?? ''} />
            </label>
            <button type="submit">{t('common.update')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('properties.photosAndOwner')}</h3>
          <StatusPill value={property.status} />
          <p className="muted">
            {t('common.owner')}: {property.ownerContact?.displayName ?? t('common.unassigned')}
          </p>
          <p className="muted">
            {t('properties.linkedAppraisalSummary')}:{' '}
            {property.appraisalRequest ? (
              <Link to={`/appraisals/${property.appraisalRequest.id}/edit`} className="agenda-link">
                {property.appraisalRequest.propertyAddress ?? `#${property.appraisalRequest.id}`}
              </Link>
            ) : (
              t('properties.withoutAppraisal')
            )}
          </p>
          <div className="photo-grid">
            {property.photos.map((photo) => (
              <img
                key={`${photo.url}-${photo.orderIndex}`}
                src={photo.thumbnailUrl ?? photo.url}
                alt={photo.caption ?? property.title}
              />
            ))}
          </div>
        </section>
      </div>

      <Timeline
        title={t('properties.timelineTitle')}
        emptyMessage={t('properties.timelineEmpty')}
        items={timelineItems}
      />
    </div>
  );
}
