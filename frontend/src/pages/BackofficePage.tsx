import { useEffect, useMemo, useState } from 'react';
import { SearchableCombobox } from '../components/SearchableCombobox';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { downloadApiFile, apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import type {
  AccountStatus,
  AdminUser,
  BackofficeAccount,
  BackofficeOverview,
  BackupSettingsResponse,
  DatabaseBackup,
  LoginResponse,
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

type BackupDraft = {
  backupsEnabled: boolean;
  retentionCount: string;
  scheduleHourUtc: string;
  scheduleMinuteUtc: string;
};

export function BackofficePage() {
  const { startImpersonation } = useAuth();
  const [overview, setOverview] = useState<BackofficeOverview | null>(null);
  const [accounts, setAccounts] = useState<BackofficeAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<number, AccountDraft>>({});
  const [backupSettings, setBackupSettings] = useState<BackupSettingsResponse | null>(null);
  const [backupDraft, setBackupDraft] = useState<BackupDraft>({
    backupsEnabled: true,
    retentionCount: '30',
    scheduleHourUtc: '3',
    scheduleMinuteUtc: '0',
  });
  const [supportUsers, setSupportUsers] = useState<AdminUser[]>([]);
  const [supportSearchValue, setSupportSearchValue] = useState('');
  const [selectedSupportUserId, setSelectedSupportUserId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAccountId, setSavingAccountId] = useState<number | null>(null);
  const [savingBackupSettings, setSavingBackupSettings] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [impersonatingUserId, setImpersonatingUserId] = useState<number | null>(null);
  const [downloadingBackupId, setDownloadingBackupId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [overviewResponse, accountsResponse, backupSettingsResponse, usersResponse] =
        await Promise.all([
          apiRequest<BackofficeOverview>('/admin/backoffice/overview'),
          apiRequest<BackofficeAccount[]>('/admin/backoffice/accounts'),
          apiRequest<BackupSettingsResponse>('/admin/backoffice/backup-settings'),
          apiRequest<AdminUser[]>('/admin/users'),
        ]);

      setOverview(overviewResponse);
      setAccounts(accountsResponse);
      setBackupSettings(backupSettingsResponse);
      setBackupDraft({
        backupsEnabled: backupSettingsResponse.backupsEnabled,
        retentionCount: String(backupSettingsResponse.retentionCount),
        scheduleHourUtc: String(backupSettingsResponse.scheduleHourUtc),
        scheduleMinuteUtc: String(backupSettingsResponse.scheduleMinuteUtc),
      });
      setSupportUsers(usersResponse);
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

  function updateBackupDraft(patch: Partial<BackupDraft>) {
    setBackupDraft((current) => ({
      ...current,
      ...patch,
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

  async function handleSaveBackupSettings() {
    setSavingBackupSettings(true);
    setError('');
    setNotice('');

    try {
      const response = await apiRequest<BackupSettingsResponse>('/admin/backoffice/backup-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          backupsEnabled: backupDraft.backupsEnabled,
          retentionCount: Number(backupDraft.retentionCount),
          scheduleHourUtc: Number(backupDraft.scheduleHourUtc),
          scheduleMinuteUtc: Number(backupDraft.scheduleMinuteUtc),
        }),
      });
      setBackupSettings(response);
      setNotice('Configuracion de backups guardada.');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la configuracion de backups',
      );
    } finally {
      setSavingBackupSettings(false);
    }
  }

  async function handleRunBackup() {
    setRunningBackup(true);
    setError('');
    setNotice('');

    try {
      const response = await apiRequest<BackupSettingsResponse>('/admin/backoffice/backup-settings/run', {
        method: 'POST',
      });
      setBackupSettings(response);
      setBackupDraft({
        backupsEnabled: response.backupsEnabled,
        retentionCount: String(response.retentionCount),
        scheduleHourUtc: String(response.scheduleHourUtc),
        scheduleMinuteUtc: String(response.scheduleMinuteUtc),
      });
      setNotice('Backup ejecutado.');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'No se pudo ejecutar el backup');
    } finally {
      setRunningBackup(false);
    }
  }

  async function handleDownloadBackup(backup: DatabaseBackup) {
    if (!backup.canDownload) {
      return;
    }

    setDownloadingBackupId(backup.id);
    setError('');

    try {
      const blob = await downloadApiFile(`/admin/backoffice/database-backups/${backup.id}/download`);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backup.fileName ?? `backup-${backup.id}.dump`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el backup');
    } finally {
      setDownloadingBackupId(null);
    }
  }

  async function handleImpersonate() {
    if (!selectedSupportUserId) {
      return;
    }

    const userId = Number(selectedSupportUserId);
    setImpersonatingUserId(userId);
    setError('');
    setNotice('');

    try {
      const response = await apiRequest<LoginResponse>(
        '/admin/backoffice/support/impersonate/' + userId,
        {
        method: 'POST',
        },
      );
      startImpersonation(response);
      window.location.assign('/');
    } catch (impersonationError) {
      setError(
        impersonationError instanceof Error
          ? impersonationError.message
          : 'No se pudo iniciar la sesion de soporte',
      );
    } finally {
      setImpersonatingUserId(null);
    }
  }

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );
  const selectedDraft = selectedAccountId ? drafts[selectedAccountId] : undefined;
  const filteredSupportUsers = useMemo(() => {
    const normalized = supportSearchValue.trim().toLowerCase();

    if (!normalized) {
      return supportUsers;
    }

    return supportUsers.filter((user) =>
      [user.name, user.email, user.activeTeamName ?? ''].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [supportSearchValue, supportUsers]);
  const selectedSupportUser = useMemo(
    () => supportUsers.find((user) => String(user.id) === selectedSupportUserId) ?? null,
    [selectedSupportUserId, supportUsers],
  );

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow="Backoffice"
        title="Cuentas, backups y soporte"
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
        Validacion operativa, respaldos diarios, descargas tecnicas e ingreso de soporte.
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
            <h3>Backups diarios</h3>
            <p className="muted">
              Respaldo en formato `pg_dump custom`, reteniendo hasta 30 copias locales en servidor.
            </p>
          </div>
          <div className="candidate-actions">
            <button type="button" disabled={runningBackup} onClick={() => void handleRunBackup()}>
              {runningBackup ? 'Ejecutando backup...' : 'Ejecutar ahora'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={savingBackupSettings}
              onClick={() => void handleSaveBackupSettings()}
            >
              {savingBackupSettings ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </div>
        </div>

        {backupSettings ? (
          <>
            <div className="pill-row">
              <span className={`pill ${backupSettings.backupsEnabled ? 'pill-active' : ''}`}>
                {backupSettings.backupsEnabled ? 'Backups activos' : 'Backups pausados'}
              </span>
              <span className="pill">Retencion {backupSettings.retentionCount}</span>
              <span className="pill">
                UTC {padNumber(backupSettings.scheduleHourUtc)}:
                {padNumber(backupSettings.scheduleMinuteUtc)}
              </span>
              {backupSettings.lastBackupStatus ? (
                <span
                  className={`pill ${
                    backupSettings.lastBackupStatus === 'SUCCESS'
                      ? 'pill-active'
                      : backupSettings.lastBackupStatus === 'FAILED'
                        ? 'pill-disabled'
                        : ''
                  }`}
                >
                  Ultimo backup {backupSettings.lastBackupStatus.toLowerCase()}
                </span>
              ) : null}
            </div>

            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <label className="checkbox-item full-span">
                <input
                  type="checkbox"
                  checked={backupDraft.backupsEnabled}
                  onChange={(event) =>
                    updateBackupDraft({ backupsEnabled: event.target.checked })
                  }
                />
                <span>Habilitar backup diario automatico</span>
              </label>
              <label>
                Retencion de copias
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={backupDraft.retentionCount}
                  onChange={(event) =>
                    updateBackupDraft({ retentionCount: event.target.value })
                  }
                />
              </label>
              <label>
                Hora UTC
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={backupDraft.scheduleHourUtc}
                  onChange={(event) =>
                    updateBackupDraft({ scheduleHourUtc: event.target.value })
                  }
                />
              </label>
              <label>
                Minuto UTC
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={backupDraft.scheduleMinuteUtc}
                  onChange={(event) =>
                    updateBackupDraft({ scheduleMinuteUtc: event.target.value })
                  }
                />
              </label>
              <label className="full-span">
                Ruta local de backups
                <input value={backupSettings.storagePath} disabled readOnly />
              </label>
              <label className="full-span">
                Binario `pg_dump`
                <input value={backupSettings.pgDumpBinary} disabled readOnly />
              </label>
              <label className="full-span">
                Restore local sugerido
                <input value={backupSettings.restoreCommandExample} disabled readOnly />
              </label>
            </div>

            <p className="muted" style={{ marginTop: '1rem' }}>
              Ultimo inicio: {formatDateTime(backupSettings.lastBackupStartedAt)} · ultima
              finalizacion: {formatDateTime(backupSettings.lastBackupFinishedAt)}
            </p>
            {backupSettings.lastBackupError ? (
              <p className="muted">Ultimo error: {backupSettings.lastBackupError}</p>
            ) : null}

            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Inicio</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Archivo</th>
                    <th>Tamano</th>
                    <th>Usuario</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backupSettings.backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>{formatDateTime(backup.startedAt)}</td>
                      <td>{backup.triggerType === 'MANUAL' ? 'Manual' : 'Programado'}</td>
                      <td>
                        <span
                          className={`pill ${
                            backup.status === 'SUCCESS'
                              ? 'pill-active'
                              : backup.status === 'FAILED'
                                ? 'pill-disabled'
                                : ''
                          }`}
                        >
                          {backup.status}
                        </span>
                      </td>
                      <td>{backup.fileName ?? 'sin archivo'}</td>
                      <td>{formatBytes(backup.fileSizeBytes)}</td>
                      <td>{backup.createdByUserName ?? 'scheduler'}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={!backup.canDownload || downloadingBackupId === backup.id}
                          onClick={() => void handleDownloadBackup(backup)}
                        >
                          {downloadingBackupId === backup.id ? 'Descargando...' : 'Descargar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="card">
        <div className="list-item-actions">
          <div>
            <h3>Soporte</h3>
            <p className="muted">
              Ingresar como una usuaria para reproducir problemas, incluso si su acceso habitual es por Google.
            </p>
          </div>
          <button
            type="button"
            disabled={!selectedSupportUserId || impersonatingUserId !== null}
            onClick={() => void handleImpersonate()}
          >
            {impersonatingUserId
              ? 'Abriendo sesion de soporte...'
              : 'Ingresar como usuaria'}
          </button>
        </div>

        <div className="form-grid">
          <label className="full-span">
            Usuaria
            <SearchableCombobox
              value={selectedSupportUserId}
              options={filteredSupportUsers.map((user) => ({
                value: String(user.id),
                label: `${user.name} · ${user.email}`,
              }))}
              searchValue={supportSearchValue}
              onSearchValueChange={setSupportSearchValue}
              onChange={setSelectedSupportUserId}
              placeholder="Buscar usuaria por nombre o email"
              emptyLabel="Seleccionar usuaria"
              loadingLabel="Cargando usuarias..."
              noResultsLabel="Sin resultados"
              loading={loading}
            />
          </label>
        </div>

        {selectedSupportUser ? (
          <div className="pill-row" style={{ marginTop: '1rem' }}>
            <span className="pill">{selectedSupportUser.name}</span>
            <span className="pill">{selectedSupportUser.email}</span>
            <span className="pill">{selectedSupportUser.activeTeamName ?? 'Sin team activo'}</span>
            {selectedSupportUser.googleCalendarConnected ? (
              <span className="pill pill-active">Google conectado</span>
            ) : null}
          </div>
        ) : null}
      </section>

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
                {savingAccountId === selectedAccount.id ? 'Guardando...' : 'Guardar cuenta'}
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

function formatBytes(value: number | null) {
  if (!value || Number.isNaN(value)) {
    return 'sin datos';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
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
