import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { roleOptions, useI18n } from '../lib/i18n';
import type { Role } from '../types';

const initialForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  whatsapp: '',
  email: '',
  source: '',
  notes: '',
  roles: ['BUYER'] as Role[],
};

function toggleRole(currentRoles: Role[], role: Role) {
  return currentRoles.includes(role)
    ? currentRoles.filter((currentRole) => currentRole !== role)
    : [...currentRoles, role];
}

export function ContactCreatePage() {
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [form, setForm] = useState(initialForm);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    await apiRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    navigate('/contacts');
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('contacts.eyebrow')}</p>
          <h2>{t('contacts.newContact')}</h2>
        </div>
        <Link to="/contacts" className="ghost-button button-link">
          {t('contacts.backToList')}
        </Link>
      </section>

      <section className="card">
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            {t('contacts.firstName')}
            <input
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              required
            />
          </label>
          <label>
            {t('contacts.lastName')}
            <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          </label>
          <label>
            {t('contacts.displayName')}
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
          </label>
          <label>
            {t('common.phone')}
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>
            {t('contacts.whatsapp')}
            <input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
          </label>
          <label>
            {t('common.email')}
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            {t('common.source')}
            <input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
          </label>
          <div className="full-span">
            <span className="field-label">{t('contacts.roles')}</span>
            <div className="checkbox-grid">
              {roleOptions.map((role) => (
                <label key={role} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(role)}
                    onChange={() => setForm({ ...form, roles: toggleRole(form.roles, role) as Role[] })}
                  />
                  <span>{translateEnum('role', role)}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="full-span">
            {t('common.notes')}
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={4} />
          </label>
          <button type="submit" className="full-span">
            {t('contacts.save')}
          </button>
        </form>
      </section>
    </div>
  );
}
