import { useEffect, useMemo, useState } from 'react';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import type {
  AccountStatus,
  BackofficeAccount,
  BackofficeOverview,
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
  whatsappTreasuryPhone: string;
};

export function BackofficePage() {
  const [overview, setOverview] = useState<BackofficeOverview | null>(null);
  const [accounts, setAccounts] = useState<BackofficeAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<number, AccountDraft>>({});
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAccountId, setSavingAccountId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [overviewResponse, accountsResponse] = await Promise.all([
        apiRequest<BackofficeOverview>('/admin/backoffice/overview'),
        apiRequest<BackofficeAccount[]>('/admin/backoffice/accounts'),
      ]);

      setOverview(overviewResponse);
      setAccounts(accountsResponse);
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
              whatsappTreasuryPhone: account.whatsappTreasuryPhone ?? '',
            },
          ]),
        ),
      );

      setSelectedAccountId((current) => {
        if (!accountsResponse.length) {
          return null;
        }

        if (current && accountsResponse.some((account) => account.id === current)) {
          return current;
        }

        return accountsResponse[0].id;
      });
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

  function handleEditAccount(accountId: number) {
    setSelectedAccountId(accountId);
    setIsAccountFormOpen(true);
    setNotice('');
    setError('');
  }

  function handleCloseAccountForm() {
    setIsAccountFormOpen(false);
  }

  async function handleSave(accountId: number) {
    const draft = drafts[accountId];
    if (!draft) {
      return;
    }

    setSavingAccountId(accountId);
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
          whatsappTreasuryPhone: draft.whatsappTreasuryPhone || null,
        }),
      });

      setNotice('Cuenta actualizada.');
      setIsAccountFormOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la cuenta');
    } finally {
      setSavingAccountId(null);
    }
  }

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );
  const selectedDraft = selectedAccountId ? drafts[selectedAccountId] : undefined;

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow="Backoffice"
        title="Cuentas y acceso"
        actions={
          isAccountFormOpen ? (
            <button
              type="button"
              className="ghost-button"
              onClick={handleCloseAccountForm}
            >
              Cerrar formulario
            </button>
          ) : null
        }
      />

      <p className="muted">
        Validacion operativa, salud de accesos y estados de cobro por cuenta.
      </p>

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
            <p className="muted">
              Ultimos 7 dias · {overview.successfulLogins.last30Days} en 30 dias
            </p>
          </article>
        </section>
      ) : null}

      <section className="card">
        <div className="list-item-actions">
          <div>
            <h3>Cuentas registradas</h3>
            <p className="muted">Cada team funciona como cuenta administrable.</p>
          </div>
          {loading ? <p className="muted">Cargando...</p> : null}
        </div>

        {!loading && accounts.length === 0 ? (
          <p className="muted">Todavia no hay cuentas.</p>
        ) : null}

        {!loading && accounts.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>Usuarios</th>
                  <th>WhatsApp</th>
                  <th>Ultimo acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className={account.id === selectedAccountId ? 'data-row-selected' : undefined}
                  >
                    <td>
                      <div className="table-cell-stack">
                        <strong>{account.name}</strong>
                        <span className="muted">
                          {account.pendingUsersCount
                            ? `${account.pendingUsersCount} pendientes`
                            : 'Sin pendientes'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${accountStatusClass(account.status)}`}>
                        {accountStatusLabel(account.status)}
                      </span>
                    </td>
                    <td>{account.planName || 'Sin plan'}</td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{account.memberCount}</strong>
                        <span className="muted">{account.activeUsersCount} activos</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${account.whatsappEnabled ? 'pill-active' : ''}`}>
                        {account.whatsappEnabled ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{formatDateTime(account.lastLoginAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleEditAccount(account.id)}
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {isAccountFormOpen && selectedAccount && selectedDraft ? (
        <section className="card">
          <div className="list-item-actions">
            <div>
              <h3>Editar cuenta</h3>
              <p className="muted">
                {selectedAccount.name} · {selectedAccount.memberCount} usuarios · ultimo acceso{' '}
                {formatDateTime(selectedAccount.lastLoginAt)}
              </p>
            </div>
            <div className="candidate-actions">
              <button
                type="button"
                disabled={savingAccountId === selectedAccount.id}
                onClick={() => void handleSave(selectedAccount.id)}
              >
                {savingAccountId === selectedAccount.id
                  ? 'Guardando...'
                  : 'Guardar cuenta'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleCloseAccountForm}
              >
                Cerrar formulario
              </button>
            </div>
          </div>

          <div className="pill-row">
            <span className={`pill ${accountStatusClass(selectedAccount.status)}`}>
              {accountStatusLabel(selectedAccount.status)}
            </span>
            <span className="pill">{selectedAccount.planName || 'Sin plan'}</span>
            <span className="pill">{selectedAccount.activeUsersCount} activos</span>
            <span className={`pill ${selectedAccount.whatsappEnabled ? 'pill-active' : ''}`}>
              {selectedAccount.whatsappEnabled ? 'WhatsApp activo' : 'WhatsApp inactivo'}
            </span>
            {selectedAccount.pendingUsersCount ? (
              <span className="pill pill-pending">
                {selectedAccount.pendingUsersCount} pendientes
              </span>
            ) : null}
            {selectedAccount.disabledUsersCount ? (
              <span className="pill pill-disabled">
                {selectedAccount.disabledUsersCount} deshabilitados
              </span>
            ) : null}
          </div>

          <div className="form-grid">
            <label>
              Nombre cuenta
              <input
                value={selectedDraft.name}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, { name: event.target.value })
                }
              />
            </label>
            <label>
              Estado
              <select
                value={selectedDraft.status}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
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
                value={selectedDraft.planName}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, { planName: event.target.value })
                }
              />
            </label>
            <label>
              Max usuarios
              <input
                type="number"
                min="1"
                value={selectedDraft.maxUsers}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, { maxUsers: event.target.value })
                }
              />
            </label>
            <label>
              Pago vigente hasta
              <input
                type="date"
                value={selectedDraft.paidUntil}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, { paidUntil: event.target.value })
                }
              />
            </label>
            <label>
              Trial hasta
              <input
                type="date"
                value={selectedDraft.trialEndsAt}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, { trialEndsAt: event.target.value })
                }
              />
            </label>
            <label className="checkbox-item full-span">
              <input
                type="checkbox"
                checked={selectedDraft.whatsappEnabled}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappEnabled: event.target.checked,
                  })
                }
              />
              <span>Habilitar WhatsApp Business para este team</span>
            </label>
            <label>
              Numero visible
              <input
                value={selectedDraft.whatsappBusinessNumber}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappBusinessNumber: event.target.value,
                  })
                }
                placeholder="+54911..."
              />
            </label>
            <label>
              Display name
              <input
                value={selectedDraft.whatsappDisplayName}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappDisplayName: event.target.value,
                  })
                }
                placeholder="Propia CRM"
              />
            </label>
            <label>
              Phone Number ID
              <input
                value={selectedDraft.whatsappPhoneNumberId}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappPhoneNumberId: event.target.value,
                  })
                }
              />
            </label>
            <label>
              WhatsApp Business Account ID
              <input
                value={selectedDraft.whatsappBusinessAccountId}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappBusinessAccountId: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Codigo idioma template
              <input
                value={selectedDraft.whatsappTemplateLanguageCode}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappTemplateLanguageCode: event.target.value,
                  })
                }
                placeholder="es_AR"
              />
            </label>
            <label>
              Quality rating
              <input
                value={selectedDraft.whatsappQualityRating}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappQualityRating: event.target.value,
                  })
                }
                placeholder="GREEN"
              />
            </label>
            <label>
              Template busqueda propiedad
              <input
                value={selectedDraft.whatsappPropertySearchTemplateName}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappPropertySearchTemplateName: event.target.value,
                  })
                }
                placeholder="property_share"
              />
            </label>
            <label>
              Template busqueda propiedad con imagen
              <input
                value={selectedDraft.whatsappPropertySearchImageTemplateName}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappPropertySearchImageTemplateName: event.target.value,
                  })
                }
                placeholder="property_share_image"
              />
            </label>
            <label>
              WhatsApp tesoreria
              <input
                value={selectedDraft.whatsappTreasuryPhone}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappTreasuryPhone: event.target.value,
                  })
                }
                placeholder="+54911..."
              />
            </label>
            <label>
              Template prelisting
              <input
                value={selectedDraft.whatsappAppraisalTemplateName}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
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
                value={selectedDraft.whatsappAccessToken}
                onChange={(event) =>
                  updateAccountDraft(selectedAccount.id, {
                    whatsappAccessToken: event.target.value,
                  })
                }
                placeholder="EAAG..."
                autoComplete="new-password"
              />
            </label>
            {selectedDraft.status === 'SUSPENDED' ? (
              <label className="full-span">
                Motivo de suspension
                <input
                  value={selectedDraft.suspensionReason}
                  onChange={(event) =>
                    updateAccountDraft(selectedAccount.id, {
                      suspensionReason: event.target.value,
                    })
                  }
                />
              </label>
            ) : null}
          </div>

          <p className="muted">
            Ultima conexion WhatsApp: {formatDateTime(selectedAccount.whatsappConnectedAt)}
          </p>
        </section>
      ) : null}
    </div>
  );
}

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
