import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import type {
  AccountStatus,
  BackofficeAccount,
  BackofficeOverview,
  PortalProviderKey,
  PortalSourceConfig,
} from '../types';

type AccountDraft = {
  name: string;
  status: AccountStatus;
  planName: string;
  maxUsers: string;
  paidUntil: string;
  trialEndsAt: string;
  suspensionReason: string;
  whatsappEnabled: boolean;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappBusinessNumber: string;
  whatsappDisplayName: string;
  whatsappAccessToken: string;
  whatsappTemplateLanguageCode: string;
  whatsappPropertySearchTemplateName: string;
  whatsappPropertySearchImageTemplateName: string;
  whatsappAppraisalTemplateName: string;
  whatsappQualityRating: string;
};

type PortalConfigDraft = {
  providerKey: PortalProviderKey;
  enabled: boolean;
  priority: string;
  baseUrl: string;
  maxResultsPerRun: string;
};

const portalProviderOptions: PortalProviderKey[] = [
  'ARGENPROP',
  'ZONAPROP',
  'MERCADOLIBRE',
  'MOCK',
];

export function BackofficePage() {
  const [overview, setOverview] = useState<BackofficeOverview | null>(null);
  const [accounts, setAccounts] = useState<BackofficeAccount[]>([]);
  const [portalConfigs, setPortalConfigs] = useState<PortalSourceConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<number, AccountDraft>>({});
  const [portalDrafts, setPortalDrafts] = useState<Record<number, PortalConfigDraft>>({});
  const [newPortalConfigs, setNewPortalConfigs] = useState<Record<number, PortalConfigDraft>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [overviewResponse, accountsResponse, portalConfigsResponse] = await Promise.all([
        apiRequest<BackofficeOverview>('/admin/backoffice/overview'),
        apiRequest<BackofficeAccount[]>('/admin/backoffice/accounts'),
        apiRequest<PortalSourceConfig[]>('/admin/backoffice/portal-source-configs'),
      ]);

      setOverview(overviewResponse);
      setAccounts(accountsResponse);
      setPortalConfigs(portalConfigsResponse);
      setDrafts(
        Object.fromEntries(
          accountsResponse.map((account) => [
            account.id,
            {
              name: account.name,
              status: account.status,
              planName: account.planName ?? '',
              maxUsers: account.maxUsers ? String(account.maxUsers) : '',
              paidUntil: toDateInput(account.paidUntil),
              trialEndsAt: toDateInput(account.trialEndsAt),
              suspensionReason: account.suspensionReason ?? '',
              whatsappEnabled: account.whatsappEnabled,
              whatsappPhoneNumberId: account.whatsappPhoneNumberId ?? '',
              whatsappBusinessAccountId: account.whatsappBusinessAccountId ?? '',
              whatsappBusinessNumber: account.whatsappBusinessNumber ?? '',
              whatsappDisplayName: account.whatsappDisplayName ?? '',
              whatsappAccessToken: account.whatsappAccessToken ?? '',
              whatsappTemplateLanguageCode:
                account.whatsappTemplateLanguageCode ?? 'es_AR',
              whatsappPropertySearchTemplateName:
                account.whatsappPropertySearchTemplateName ?? '',
              whatsappPropertySearchImageTemplateName:
                account.whatsappPropertySearchImageTemplateName ?? '',
              whatsappAppraisalTemplateName:
                account.whatsappAppraisalTemplateName ?? '',
              whatsappQualityRating: account.whatsappQualityRating ?? '',
            },
          ]),
        ),
      );
      setPortalDrafts(
        Object.fromEntries(
          portalConfigsResponse.map((config) => [
            config.id,
            {
              providerKey: config.providerKey,
              enabled: config.enabled,
              priority: String(config.priority),
              baseUrl: config.baseUrl ?? defaultPortalBaseUrlByProvider[config.providerKey],
              maxResultsPerRun: config.maxResultsPerRun
                ? String(config.maxResultsPerRun)
                : '20',
            },
          ]),
        ),
      );
      setNewPortalConfigs(
        Object.fromEntries(
          accountsResponse.map((account) => [account.id, createInitialPortalDraft('ARGENPROP')]),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar backoffice');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateAccountDraft(accountId: number, patch: Partial<AccountDraft>) {
    setDrafts((current) => ({
      ...current,
      [accountId]: {
        ...current[accountId],
        ...patch,
      },
    }));
  }

  function updatePortalDraft(configId: number, patch: Partial<PortalConfigDraft>) {
    setPortalDrafts((current) => ({
      ...current,
      [configId]: {
        ...current[configId],
        ...patch,
      },
    }));
  }

  function updateNewPortalConfig(accountId: number, patch: Partial<PortalConfigDraft>) {
    setNewPortalConfigs((current) => ({
      ...current,
      [accountId]: {
        ...current[accountId],
        ...patch,
      },
    }));
  }

  async function handleSave(accountId: number) {
    const draft = drafts[accountId];
    if (!draft) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/admin/backoffice/accounts/${accountId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name,
          status: draft.status,
          planName: draft.planName || null,
          maxUsers: draft.maxUsers ? Number(draft.maxUsers) : null,
          paidUntil: draft.paidUntil || null,
          trialEndsAt: draft.trialEndsAt || null,
          suspensionReason:
            draft.status === 'SUSPENDED' ? draft.suspensionReason || null : null,
          whatsappEnabled: draft.whatsappEnabled,
          whatsappPhoneNumberId: draft.whatsappPhoneNumberId || null,
          whatsappBusinessAccountId: draft.whatsappBusinessAccountId || null,
          whatsappBusinessNumber: draft.whatsappBusinessNumber || null,
          whatsappDisplayName: draft.whatsappDisplayName || null,
          whatsappAccessToken: draft.whatsappAccessToken || null,
          whatsappTemplateLanguageCode: draft.whatsappTemplateLanguageCode || null,
          whatsappPropertySearchTemplateName:
            draft.whatsappPropertySearchTemplateName || null,
          whatsappPropertySearchImageTemplateName:
            draft.whatsappPropertySearchImageTemplateName || null,
          whatsappAppraisalTemplateName: draft.whatsappAppraisalTemplateName || null,
          whatsappQualityRating: draft.whatsappQualityRating || null,
        }),
      });

      setNotice('Cuenta actualizada.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la cuenta');
    }
  }

  async function handleCreatePortalConfig(accountId: number) {
    const draft = newPortalConfigs[accountId];
    if (!draft) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/admin/backoffice/accounts/${accountId}/portal-source-configs`, {
        method: 'POST',
        body: JSON.stringify({
          providerKey: draft.providerKey,
          enabled: draft.enabled,
          priority: Number(draft.priority),
          baseUrl: draft.baseUrl || undefined,
          maxResultsPerRun: Number(draft.maxResultsPerRun),
        }),
      });

      setNotice('Fuente externa agregada.');
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo agregar la fuente externa',
      );
    }
  }

  async function handleSavePortalConfig(configId: number) {
    const draft = portalDrafts[configId];
    if (!draft) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/admin/backoffice/portal-source-configs/${configId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          providerKey: draft.providerKey,
          enabled: draft.enabled,
          priority: Number(draft.priority),
          baseUrl: draft.baseUrl || undefined,
          maxResultsPerRun: Number(draft.maxResultsPerRun),
        }),
      });

      setNotice('Fuente externa actualizada.');
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la fuente externa',
      );
    }
  }

  async function handleDeletePortalConfig(configId: number) {
    setError('');
    setNotice('');

    try {
      await apiRequest(`/admin/backoffice/portal-source-configs/${configId}/delete`, {
        method: 'POST',
      });

      setNotice('Fuente externa eliminada.');
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la fuente externa',
      );
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Backoffice</p>
          <h2>Cuentas y acceso</h2>
          <p className="muted">
            Validacion operativa, salud de accesos y estados de cobro por cuenta.
          </p>
        </div>
      </section>

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}

      {overview ? (
        <section className="dashboard-stats-grid">
          <article className="stat-card">
            <span>Cuentas totales</span>
            <strong>{overview.accounts.total}</strong>
            <p className="muted">
              {overview.accounts.active} activas, {overview.accounts.trial} trial
            </p>
          </article>
          <article className="stat-card">
            <span>Alertas de cuenta</span>
            <strong>{overview.accounts.pastDue + overview.accounts.suspended}</strong>
            <p className="muted">
              {overview.accounts.pastDue} past due, {overview.accounts.suspended} suspendidas
            </p>
          </article>
          <article className="stat-card">
            <span>Usuarios pendientes</span>
            <strong>{overview.users.pending}</strong>
            <p className="muted">
              {overview.users.active} activos, {overview.users.disabled} deshabilitados
            </p>
          </article>
          <article className="stat-card">
            <span>Logins exitosos</span>
            <strong>{overview.successfulLogins.last7Days}</strong>
            <p className="muted">Ultimos 7 dias · {overview.successfulLogins.last30Days} en 30 dias</p>
          </article>
        </section>
      ) : null}

      <section className="card">
        <div className="list-item-actions">
          <div>
            <h3>Cuentas</h3>
            <p className="muted">Cada team funciona como cuenta administrable.</p>
          </div>
          {loading ? <p className="muted">Cargando...</p> : null}
        </div>

        {accounts.map((account) => {
          const draft = drafts[account.id];
          const configsByAccount = portalConfigs.filter((config) => config.teamId === account.id);
          const newPortalDraft =
            newPortalConfigs[account.id] ?? createInitialPortalDraft('ARGENPROP');

          if (!draft) {
            return null;
          }

          return (
            <article key={account.id} className="list-item">
              <div className="list-item-actions">
                <div>
                  <strong>{account.name}</strong>
                  <p className="muted">
                    {account.memberCount} usuarios · ultimo acceso {formatDateTime(account.lastLoginAt)}
                  </p>
                </div>
                <button type="button" onClick={() => void handleSave(account.id)}>
                  Guardar cuenta
                </button>
              </div>

              <div className="pill-row">
                <span className={`pill ${accountStatusClass(account.status)}`}>
                  {accountStatusLabel(account.status)}
                </span>
                <span className="pill">{account.planName || 'Sin plan'}</span>
                <span className="pill">{account.activeUsersCount} activos</span>
                <span className={`pill ${account.whatsappEnabled ? 'pill-active' : ''}`}>
                  {account.whatsappEnabled ? 'WhatsApp activo' : 'WhatsApp inactivo'}
                </span>
                <span className="pill">{configsByAccount.length} fuentes externas</span>
                {account.pendingUsersCount ? (
                  <span className="pill pill-pending">{account.pendingUsersCount} pendientes</span>
                ) : null}
                {account.disabledUsersCount ? (
                  <span className="pill pill-disabled">
                    {account.disabledUsersCount} deshabilitados
                  </span>
                ) : null}
              </div>

              <div className="form-grid">
                <label>
                  Nombre cuenta
                  <input
                    value={draft.name}
                    onChange={(event) => updateAccountDraft(account.id, { name: event.target.value })}
                  />
                </label>
                <label>
                  Estado
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        status: event.target.value as AccountStatus,
                      })
                    }
                  >
                    <option value="ACTIVE">Activa</option>
                    <option value="TRIAL">Trial</option>
                    <option value="PAST_DUE">Past due</option>
                    <option value="SUSPENDED">Suspendida</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                </label>
                <label>
                  Plan
                  <input
                    value={draft.planName}
                    onChange={(event) =>
                      updateAccountDraft(account.id, { planName: event.target.value })
                    }
                  />
                </label>
                <label>
                  Max usuarios
                  <input
                    type="number"
                    min="1"
                    value={draft.maxUsers}
                    onChange={(event) =>
                      updateAccountDraft(account.id, { maxUsers: event.target.value })
                    }
                  />
                </label>
                <label>
                  Pago vigente hasta
                  <input
                    type="date"
                    value={draft.paidUntil}
                    onChange={(event) =>
                      updateAccountDraft(account.id, { paidUntil: event.target.value })
                    }
                  />
                </label>
                <label>
                  Trial hasta
                  <input
                    type="date"
                    value={draft.trialEndsAt}
                    onChange={(event) =>
                      updateAccountDraft(account.id, { trialEndsAt: event.target.value })
                    }
                  />
                </label>
                <label className="checkbox-item full-span">
                  <input
                    type="checkbox"
                    checked={draft.whatsappEnabled}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappEnabled: event.target.checked,
                      })
                    }
                  />
                  <span>Habilitar WhatsApp Business para este team</span>
                </label>
                <label>
                  Numero visible
                  <input
                    value={draft.whatsappBusinessNumber}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappBusinessNumber: event.target.value,
                      })
                    }
                    placeholder="+54911..."
                  />
                </label>
                <label>
                  Display name
                  <input
                    value={draft.whatsappDisplayName}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappDisplayName: event.target.value,
                      })
                    }
                    placeholder="InFlow Team"
                  />
                </label>
                <label>
                  Phone Number ID
                  <input
                    value={draft.whatsappPhoneNumberId}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappPhoneNumberId: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  WhatsApp Business Account ID
                  <input
                    value={draft.whatsappBusinessAccountId}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappBusinessAccountId: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Codigo idioma template
                  <input
                    value={draft.whatsappTemplateLanguageCode}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappTemplateLanguageCode: event.target.value,
                      })
                    }
                    placeholder="es_AR"
                  />
                </label>
                <label>
                  Quality rating
                  <input
                    value={draft.whatsappQualityRating}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappQualityRating: event.target.value,
                      })
                    }
                    placeholder="GREEN"
                  />
                </label>
                <label>
                  Template busqueda propiedad
                  <input
                    value={draft.whatsappPropertySearchTemplateName}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappPropertySearchTemplateName: event.target.value,
                      })
                    }
                    placeholder="property_share"
                  />
                </label>
                <label>
                  Template busqueda propiedad con imagen
                  <input
                    value={draft.whatsappPropertySearchImageTemplateName}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappPropertySearchImageTemplateName: event.target.value,
                      })
                    }
                    placeholder="property_share_image"
                  />
                </label>
                <label>
                  Template solicitud tasacion
                  <input
                    value={draft.whatsappAppraisalTemplateName}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappAppraisalTemplateName: event.target.value,
                      })
                    }
                    placeholder="appraisal_form"
                  />
                </label>
                <label className="full-span">
                  Access token
                  <input
                    type="password"
                    value={draft.whatsappAccessToken}
                    onChange={(event) =>
                      updateAccountDraft(account.id, {
                        whatsappAccessToken: event.target.value,
                      })
                    }
                    placeholder="EAAG..."
                    autoComplete="new-password"
                  />
                </label>
                {draft.status === 'SUSPENDED' ? (
                  <label className="full-span">
                    Motivo de suspension
                    <input
                      value={draft.suspensionReason}
                      onChange={(event) =>
                        updateAccountDraft(account.id, {
                          suspensionReason: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}
              </div>

              <p className="muted">
                Ultima conexion WhatsApp: {formatDateTime(account.whatsappConnectedAt)}
              </p>

              <div className="stack-gap">
                <div className="list-item-actions">
                  <div>
                    <strong>Fuentes externas</strong>
                    <p className="muted">
                      Configuracion general del backend para sugerencias y preseleccion automatica.
                    </p>
                  </div>
                </div>

                {configsByAccount.length === 0 ? (
                  <p className="muted">Sin fuentes configuradas para esta cuenta.</p>
                ) : null}

                {configsByAccount.map((config) => {
                  const portalDraft = portalDrafts[config.id];
                  if (!portalDraft) {
                    return null;
                  }

                  return (
                    <div key={config.id} className="list-item">
                      <div className="list-item-actions">
                        <div className="pill-row">
                          <span className={`pill ${config.enabled ? 'pill-active' : ''}`}>
                            {providerLabel(config.providerKey)}
                          </span>
                          <span className="pill">Prioridad {config.priority}</span>
                          <span className="pill">
                            {config.maxResultsPerRun ?? 20} avisos por corrida
                          </span>
                        </div>
                        <div className="candidate-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void handleSavePortalConfig(config.id)}
                          >
                            Guardar fuente
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void handleDeletePortalConfig(config.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div className="form-grid">
                        <label>
                          Proveedor
                          <select
                            value={portalDraft.providerKey}
                            onChange={(event) => {
                              const providerKey = event.target.value as PortalProviderKey;
                              updatePortalDraft(config.id, {
                                providerKey,
                                baseUrl: defaultPortalBaseUrlByProvider[providerKey],
                              });
                            }}
                          >
                            {portalProviderOptions.map((providerKey) => (
                              <option key={providerKey} value={providerKey}>
                                {providerLabel(providerKey)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Prioridad
                          <input
                            type="number"
                            min="1"
                            value={portalDraft.priority}
                            onChange={(event) =>
                              updatePortalDraft(config.id, { priority: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          URL base
                          <input
                            value={portalDraft.baseUrl}
                            onChange={(event) =>
                              updatePortalDraft(config.id, { baseUrl: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Max resultados por corrida
                          <input
                            type="number"
                            min="1"
                            value={portalDraft.maxResultsPerRun}
                            onChange={(event) =>
                              updatePortalDraft(config.id, {
                                maxResultsPerRun: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="checkbox-item full-span">
                          <input
                            type="checkbox"
                            checked={portalDraft.enabled}
                            onChange={(event) =>
                              updatePortalDraft(config.id, { enabled: event.target.checked })
                            }
                          />
                          <span>Fuente habilitada</span>
                        </label>
                      </div>
                    </div>
                  );
                })}

                <div className="list-item">
                  <div className="list-item-actions">
                    <div>
                      <strong>Nueva fuente</strong>
                      <p className="muted">Alta general por cuenta/team.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCreatePortalConfig(account.id)}
                    >
                      Agregar fuente
                    </button>
                  </div>

                  <div className="form-grid">
                    <label>
                      Proveedor
                      <select
                        value={newPortalDraft.providerKey}
                        onChange={(event) => {
                          const providerKey = event.target.value as PortalProviderKey;
                          updateNewPortalConfig(account.id, {
                            providerKey,
                            baseUrl: defaultPortalBaseUrlByProvider[providerKey],
                          });
                        }}
                      >
                        {portalProviderOptions.map((providerKey) => (
                          <option key={providerKey} value={providerKey}>
                            {providerLabel(providerKey)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Prioridad
                      <input
                        type="number"
                        min="1"
                        value={newPortalDraft.priority}
                        onChange={(event) =>
                          updateNewPortalConfig(account.id, { priority: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      URL base
                      <input
                        value={newPortalDraft.baseUrl}
                        onChange={(event) =>
                          updateNewPortalConfig(account.id, { baseUrl: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Max resultados por corrida
                      <input
                        type="number"
                        min="1"
                        value={newPortalDraft.maxResultsPerRun}
                        onChange={(event) =>
                          updateNewPortalConfig(account.id, {
                            maxResultsPerRun: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="checkbox-item full-span">
                      <input
                        type="checkbox"
                        checked={newPortalDraft.enabled}
                        onChange={(event) =>
                          updateNewPortalConfig(account.id, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                      <span>Fuente habilitada</span>
                    </label>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function createInitialPortalDraft(providerKey: PortalProviderKey): PortalConfigDraft {
  return {
    providerKey,
    enabled: true,
    priority: '100',
    baseUrl: defaultPortalBaseUrlByProvider[providerKey],
    maxResultsPerRun: '20',
  };
}

function providerLabel(provider: PortalProviderKey) {
  switch (provider) {
    case 'ARGENPROP':
      return 'Argenprop';
    case 'ZONAPROP':
      return 'Zonaprop';
    case 'MERCADOLIBRE':
      return 'Mercado Libre';
    case 'MOCK':
      return 'Mock';
    default:
      return provider;
  }
}

const defaultPortalBaseUrlByProvider: Record<PortalProviderKey, string> = {
  ARGENPROP: 'https://www.argenprop.com',
  ZONAPROP: 'https://zonaprop.com.ar',
  MERCADOLIBRE: 'https://inmuebles.mercadolibre.com.ar',
  MOCK: 'https://mock.propia.local',
};

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
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

function accountStatusLabel(status: AccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Activa';
    case 'TRIAL':
      return 'Trial';
    case 'PAST_DUE':
      return 'Past due';
    case 'SUSPENDED':
      return 'Suspendida';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}

function accountStatusClass(status: AccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'pill-active';
    case 'TRIAL':
      return 'pill-trial';
    case 'PAST_DUE':
      return 'pill-past_due';
    case 'SUSPENDED':
      return 'pill-suspended';
    case 'CANCELLED':
      return 'pill-cancelled';
    default:
      return '';
  }
}
