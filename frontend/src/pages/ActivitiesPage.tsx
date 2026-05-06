import { FormEvent, useEffect, useState } from 'react';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import type { Activity, Contact, Paginated, Property } from '../types';

export function ActivitiesPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [activities, setActivities] = useState<Paginated<Activity> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filters, setFilters] = useState({
    contactId: '',
    propertyId: '',
    nextFollowUpDate: '',
  });

  async function load() {
    const params = new URLSearchParams({ page: '1', limit: '20' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const [activitiesData, contactsData, propertiesData] = await Promise.all([
      apiRequest<Paginated<Activity>>(`/activities?${params.toString()}`),
      apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
      apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
    ]);
    setActivities(activitiesData);
    setContacts(contactsData.items);
    setProperties(propertiesData.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiRequest('/activities', {
      method: 'POST',
      body: JSON.stringify({
        contactId: formData.get('contactId') ? Number(formData.get('contactId')) : undefined,
        propertyId: formData.get('propertyId') ? Number(formData.get('propertyId')) : undefined,
        activityType: formData.get('activityType'),
        title: formData.get('title'),
        description: formData.get('description'),
        activityDate: formData.get('activityDate'),
        nextFollowUpDate: formData.get('nextFollowUpDate') || undefined,
      }),
    });
    event.currentTarget.reset();
    await load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteActivity'))) return;
    await apiRequest(`/activities/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('activities.eyebrow')}</p>
          <h2>{t('activities.title')}</h2>
        </div>
        <div className="toolbar toolbar-wrap">
          <input
            type="date"
            value={filters.nextFollowUpDate}
            onChange={(event) => setFilters({ ...filters, nextFollowUpDate: event.target.value })}
          />
          <button onClick={load}>{t('common.apply')}</button>
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('activities.newActivity')}</h3>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              {t('common.type')}
              <select name="activityType" defaultValue="CALL">
                {activityTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('activityType', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.contact')}
              <select name="contactId" defaultValue="">
                <option value="">{t('activities.withoutContact')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.property')}
              <select name="propertyId" defaultValue="">
                <option value="">{t('activities.withoutProperty')}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('activities.activityDate')}
              <input type="datetime-local" name="activityDate" required />
            </label>
            <label>
              {t('activities.nextFollowUp')}
              <input type="datetime-local" name="nextFollowUpDate" />
            </label>
            <label className="full-span">
              {t('common.title')}
              <input name="title" required />
            </label>
            <label className="full-span">
              {t('common.description')}
              <textarea name="description" rows={3} />
            </label>
            <button type="submit">{t('activities.save')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('activities.listTitle')}</h3>
          {(activities?.items ?? []).map((activity) => (
            <article key={activity.id} className="list-item list-item-actions">
              <div>
                <strong>{activity.title}</strong>
                <p className="muted">
                  {activity.contact?.displayName ?? t('activities.withoutContact')} · {formatDateTime(activity.activityDate)}
                </p>
                <StatusPill value={activity.activityType} />
              </div>
              <button className="ghost-button" onClick={() => handleDelete(activity.id)}>
                {t('common.delete')}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
