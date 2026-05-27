import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { AdminUser, AppUserRole, TeamSummary, UserStatus } from '../types';

const initialCreateForm = {
  email: '',
  name: '',
  password: '',
  appRole: 'USER' as AppUserRole,
  backofficeAccess: false,
  status: 'ACTIVE' as UserStatus,
  activeTeamId: '',
};

type UserDraft = {
  name: string;
  email: string;
  password: string;
  appRole: AppUserRole;
  backofficeAccess: boolean;
  status: UserStatus;
  activeTeamId: string;
};

export function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<number, UserDraft>>({});
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [usersResponse, teamsResponse] = await Promise.all([
        apiRequest<AdminUser[]>('/admin/users'),
        apiRequest<TeamSummary[]>('/admin/teams'),
      ]);

      setUsers(usersResponse);
      setTeams(teamsResponse);
      setDrafts(
        Object.fromEntries(
          usersResponse.map((user) => [
            user.id,
            {
              name: user.name,
              email: user.email,
              password: '',
              appRole: user.appRole,
              backofficeAccess: user.backofficeAccess,
              status: user.status,
              activeTeamId: user.activeTeamId ? String(user.activeTeamId) : '',
            },
          ]),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('users.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          backofficeAccess: createForm.backofficeAccess,
          status: createForm.status,
          activeTeamId: createForm.activeTeamId ? Number(createForm.activeTeamId) : undefined,
        }),
      });

      setCreateForm(initialCreateForm);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('users.saveError'));
    }
  }

  async function handleUpdate(userId: number) {
    const draft = drafts[userId];
    if (!draft) {
      return;
    }

    setError('');

    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          appRole: draft.appRole,
          backofficeAccess: draft.backofficeAccess,
          status: draft.status,
          activeTeamId: draft.activeTeamId ? Number(draft.activeTeamId) : undefined,
          password: draft.password || undefined,
        }),
      });

      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('users.saveError'));
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('users.eyebrow')}</p>
          <h2>{t('users.title')}</h2>
          <p className="muted">{t('users.subtitle')}</p>
        </div>
      </section>

      {error ? <div className="card">{error}</div> : null}

      <div className="two-column">
        <section className="card">
          <h3>{t('users.newUser')}</h3>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              {t('common.email')}
              <input
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              />
            </label>
            <label>
              {t('contacts.displayName')}
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              />
            </label>
            <label>
              {t('common.password')}
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
              />
            </label>
            <label>
              {t('users.role')}
              <select
                value={createForm.appRole}
                onChange={(event) =>
                  setCreateForm({ ...createForm, appRole: event.target.value as AppUserRole })
                }
              >
                <option value="USER">{t('users.roleUser')}</option>
                <option value="ADMIN">{t('users.roleAdmin')}</option>
              </select>
            </label>
            <label>
              Estado
              <select
                value={createForm.status}
                onChange={(event) =>
                  setCreateForm({ ...createForm, status: event.target.value as UserStatus })
                }
              >
                <option value="ACTIVE">Activo</option>
                <option value="PENDING">Pendiente</option>
                <option value="DISABLED">Deshabilitado</option>
              </select>
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={createForm.backofficeAccess}
                onChange={(event) =>
                  setCreateForm({
                    ...createForm,
                    backofficeAccess: event.target.checked,
                  })
                }
              />
              Acceso a backoffice
            </label>
            <label className="full-span">
              {t('users.teamAssignment')}
              <select
                value={createForm.activeTeamId}
                onChange={(event) =>
                  setCreateForm({ ...createForm, activeTeamId: event.target.value })
                }
              >
                <option value="">{t('users.privateTeam')}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">{t('users.create')}</button>
          </form>
        </section>

        <section className="card">
          <h3>{t('users.listTitle')}</h3>
          {loading ? <p>{t('common.loading')}</p> : null}
          {users.map((user) => {
            const draft = drafts[user.id];
            if (!draft) {
              return null;
            }

            return (
              <article key={user.id} className="list-item">
                <div className="list-item-actions">
                  <div>
                    <strong>{user.name}</strong>
                    <p className="muted">
                      {user.email} - {user.activeTeamName ?? t('common.noData')}
                    </p>
                    <p className="muted">
                      Ultimo acceso: {formatDateTime(user.lastLoginAt)} - {user.loginCount} logins
                    </p>
                  </div>
                  <button type="button" onClick={() => handleUpdate(user.id)}>
                    {t('common.update')}
                  </button>
                </div>

                <div className="pill-row">
                  <span className="pill">
                    {user.appRole === 'ADMIN' ? t('users.roleAdmin') : t('users.roleUser')}
                  </span>
                  <span className={`pill ${userStatusClass(user.status)}`}>
                    {userStatusLabel(user.status)}
                  </span>
                  {user.backofficeAccess ? <span className="pill pill-past_due">Backoffice</span> : null}
                  {user.googleCalendarConnected ? <span className="pill pill-active">Google</span> : null}
                  {user.memberships.map((membership) => (
                    <span key={`${user.id}-${membership.id}`} className="pill">
                      {membership.name}
                    </span>
                  ))}
                </div>

                <div className="form-grid">
                  <label>
                    {t('contacts.displayName')}
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: { ...draft, name: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    {t('common.email')}
                    <input
                      value={draft.email}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: { ...draft, email: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    {t('users.role')}
                    <select
                      value={draft.appRole}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: {
                            ...draft,
                            appRole: event.target.value as AppUserRole,
                          },
                        })
                      }
                    >
                      <option value="USER">{t('users.roleUser')}</option>
                      <option value="ADMIN">{t('users.roleAdmin')}</option>
                    </select>
                  </label>
                  <label>
                    Estado
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: {
                            ...draft,
                            status: event.target.value as UserStatus,
                          },
                        })
                      }
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="PENDING">Pendiente</option>
                      <option value="DISABLED">Deshabilitado</option>
                    </select>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={draft.backofficeAccess}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: {
                            ...draft,
                            backofficeAccess: event.target.checked,
                          },
                        })
                      }
                    />
                    Acceso a backoffice
                  </label>
                  <label>
                    {t('common.team')}
                    <select
                      value={draft.activeTeamId}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: { ...draft, activeTeamId: event.target.value },
                        })
                      }
                    >
                      <option value="">{t('users.privateTeam')}</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="full-span">
                    {t('users.resetPassword')}
                    <input
                      type="password"
                      value={draft.password}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [user.id]: { ...draft, password: event.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'sin registros';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function userStatusLabel(status: UserStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'PENDING':
      return 'Pendiente';
    case 'DISABLED':
      return 'Deshabilitado';
    default:
      return status;
  }
}

function userStatusClass(status: UserStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'pill-active';
    case 'PENDING':
      return 'pill-pending';
    case 'DISABLED':
      return 'pill-disabled';
    default:
      return '';
  }
}
