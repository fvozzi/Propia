import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StatusPill } from '../components/StatusPill';
import { Timeline, type TimelineItem } from '../components/Timeline';
import { apiRequest } from '../lib/api';
import { roleOptions, useI18n } from '../lib/i18n';
import type { Contact, Role } from '../types';

export function ContactDetailPage() {
  const { id } = useParams();
  const { formatDateTime, t, translateEnum } = useI18n();
  const [contact, setContact] = useState<Contact | null>(null);
  const [roles, setRoles] = useState<Role[]>(['BUYER']);

  async function load() {
    const data = await apiRequest<Contact>(`/contacts/${id}`);
    setContact(data);
    setRoles(data.roles.map((role) => role.role));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiRequest(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        displayName: formData.get('displayName'),
        phone: formData.get('phone'),
        whatsapp: formData.get('whatsapp'),
        email: formData.get('email'),
        source: formData.get('source'),
        notes: formData.get('notes'),
        roles,
      }),
    });
    await load();
  }

  function toggleRole(role: Role) {
    setRoles((currentRoles) =>
      currentRoles.includes(role)
        ? currentRoles.filter((currentRole) => currentRole !== role)
        : [...currentRoles, role],
    );
  }

  if (!contact) {
    return <p>{t('common.loading')}</p>;
  }

  const timelineItems: TimelineItem[] = [
    ...(contact.activities ?? []).map((activity) => ({
      id: `activity-${activity.id}`,
      date: activity.activityDate,
      title: activity.title,
      subtitle: activity.property ? `${t('common.property')}: ${activity.property.title}` : undefined,
      description:
        activity.description ??
        (activity.nextFollowUpDate ? `${t('contacts.followUpPrefix')}: ${formatDateTime(activity.nextFollowUpDate)}` : null),
      type: activity.activityType,
    })),
    ...(contact.visits ?? []).map((visit) => ({
      id: `visit-${visit.id}`,
      date: visit.scheduledAt,
      title: `${t('timeline.visitTo')} ${visit.property?.title ?? `#${visit.propertyId}`}`,
      subtitle: `${t('timeline.statePrefix')}: ${translateEnum('visitStatus', visit.status)}`,
      description: visit.notes,
      type: 'VISIT',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('contacts.detailsEyebrow')}</p>
          <h2>{contact.displayName}</h2>
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('contacts.detailsCard')}</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              {t('contacts.firstName')}
              <input name="firstName" defaultValue={contact.firstName} />
            </label>
            <label>
              {t('contacts.lastName')}
              <input name="lastName" defaultValue={contact.lastName} />
            </label>
            <label>
              {t('contacts.displayName')}
              <input name="displayName" defaultValue={contact.displayName} />
            </label>
            <label>
              {t('common.phone')}
              <input name="phone" defaultValue={contact.phone ?? ''} />
            </label>
            <label>
              {t('contacts.whatsapp')}
              <input name="whatsapp" defaultValue={contact.whatsapp ?? ''} />
            </label>
            <label>
              {t('common.email')}
              <input name="email" defaultValue={contact.email ?? ''} />
            </label>
            <label>
              {t('common.source')}
              <input name="source" defaultValue={contact.source ?? ''} />
            </label>
            <div className="full-span">
              <span className="field-label">{t('contacts.roles')}</span>
              <div className="checkbox-grid">
                {roleOptions.map((role) => (
                  <label key={role} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    <span>{translateEnum('role', role)}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="full-span">
              {t('common.notes')}
              <textarea name="notes" defaultValue={contact.notes ?? ''} rows={4} />
            </label>
            <button type="submit">{t('common.update')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('contacts.rolesAndRequirements')}</h3>
          <div className="pill-row">
            {contact.roles.map((role) => (
              <StatusPill key={role.id} value={role.role} />
            ))}
          </div>
          <div className="stack-gap">
            {(contact.searchRequirements ?? []).map((requirement) => (
              <div key={requirement.id} className="list-item">
                <strong>
                  {translateEnum('operationType', requirement.operationType)} · {translateEnum('propertyType', requirement.propertyType)}
                </strong>
                <span>{requirement.neighborhoods.join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Timeline
        title={t('contacts.timelineTitle')}
        emptyMessage={t('contacts.timelineEmpty')}
        items={timelineItems}
      />
    </div>
  );
}
