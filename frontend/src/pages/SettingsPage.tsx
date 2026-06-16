import { useEffect, useState } from 'react';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import type {
  ActivityGoal,
  ActivityType,
  FinanceConfig,
  PortalProviderKey,
  PortalSourceConfig,
} from '../types';

type ActivityGoalDraft = {
  activityType: ActivityType;
  targetCount: string;
};

type PortalConfigDraft = {
  providerKey: PortalProviderKey;
  enabled: boolean;
  priority: string;
  baseUrl: string;
  maxResultsPerRun: string;
};

type FinanceConfigDraft = {
  franchisePercent: string;
  saleCommissionPercent: string;
  purchaseCommissionPercent: string;
};

const portalProviderOptions: PortalProviderKey[] = [
  'ARGENPROP',
  'ZONAPROP',
  'MERCADOLIBRE',
  'MOCK',
];

const defaultPortalBaseUrlByProvider: Record<PortalProviderKey, string> = {
  ARGENPROP: 'https://www.argenprop.com',
  ZONAPROP: 'https://zonaprop.com.ar',
  MERCADOLIBRE: 'https://inmuebles.mercadolibre.com.ar',
  MOCK: 'https://mock.propia.local',
};

export function SettingsPage() {
  const { user } = useAuth();
  const { t, translateEnum } = useI18n();
  const [activityGoals, setActivityGoals] = useState<ActivityGoal[]>([]);
  const [activityGoalDrafts, setActivityGoalDrafts] = useState<Record<number, ActivityGoalDraft>>({});
  const [newActivityGoal, setNewActivityGoal] = useState<ActivityGoalDraft>({
    activityType: 'CALL',
    targetCount: '10',
  });
  const [configs, setConfigs] = useState<PortalSourceConfig[]>([]);
  const [portalDrafts, setPortalDrafts] = useState<Record<number, PortalConfigDraft>>({});
  const [newPortalConfig, setNewPortalConfig] = useState<PortalConfigDraft>(
    createInitialPortalDraft('ARGENPROP'),
  );
  const [financeConfigDraft, setFinanceConfigDraft] = useState<FinanceConfigDraft>({
    franchisePercent: '55',
    saleCommissionPercent: '3',
    purchaseCommissionPercent: '4',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [activityGoalsResponse, portalConfigsResponse, financeConfigResponse] = await Promise.all([
        apiRequest<ActivityGoal[]>('/activity-goals'),
        apiRequest<PortalSourceConfig[]>('/portal-source-configs'),
        apiRequest<FinanceConfig>('/finance-config'),
      ]);
      setActivityGoals(activityGoalsResponse);
      setActivityGoalDrafts(buildActivityGoalDraftMap(activityGoalsResponse));
      setConfigs(portalConfigsResponse);
      setPortalDrafts(buildPortalDraftMap(portalConfigsResponse));
      setFinanceConfigDraft({
        franchisePercent: String(financeConfigResponse.franchisePercent),
        saleCommissionPercent: String(financeConfigResponse.saleCommissionPercent),
        purchaseCommissionPercent: String(financeConfigResponse.purchaseCommissionPercent),
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la configuracion',
      );
    } finally {
      setLoading(false);
    }
  }

  function updateActivityGoalDraft(goalId: number, patch: Partial<ActivityGoalDraft>) {
    setActivityGoalDrafts((current) => ({
      ...current,
      [goalId]: {
        ...current[goalId],
        ...patch,
      },
    }));
  }

  function updateNewActivityGoal(patch: Partial<ActivityGoalDraft>) {
    setNewActivityGoal((current) => ({
      ...current,
      ...patch,
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

  function updateNewPortalConfig(patch: Partial<PortalConfigDraft>) {
    setNewPortalConfig((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updateFinanceConfigDraft(patch: Partial<FinanceConfigDraft>) {
    setFinanceConfigDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function handleCreateActivityGoal() {
    setError('');
    setNotice('');

    try {
      await apiRequest('/activity-goals', {
        method: 'POST',
        body: JSON.stringify({
          activityType: newActivityGoal.activityType,
          targetCount: Number(newActivityGoal.targetCount),
        }),
      });

      setNotice(t('settings.goalAdded'));
      setNewActivityGoal({
        activityType: 'CALL',
        targetCount: '10',
      });
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo agregar el objetivo semanal',
      );
    }
  }

  async function handleSaveActivityGoal(goalId: number) {
    const draft = activityGoalDrafts[goalId];
    if (!draft) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/activity-goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          activityType: draft.activityType,
          targetCount: Number(draft.targetCount),
        }),
      });

      setNotice(t('settings.goalUpdated'));
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el objetivo semanal',
      );
    }
  }

  async function handleDeleteActivityGoal(goalId: number) {
    setError('');
    setNotice('');

    try {
      await apiRequest(`/activity-goals/${goalId}`, {
        method: 'DELETE',
      });

      setNotice(t('settings.goalDeleted'));
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el objetivo semanal',
      );
    }
  }

  async function handleCreatePortalConfig() {
    setError('');
    setNotice('');

    try {
      await apiRequest('/portal-source-configs', {
        method: 'POST',
        body: JSON.stringify({
          providerKey: newPortalConfig.providerKey,
          enabled: newPortalConfig.enabled,
          priority: Number(newPortalConfig.priority),
          baseUrl: newPortalConfig.baseUrl || undefined,
          maxResultsPerRun: Number(newPortalConfig.maxResultsPerRun),
        }),
      });

      setNotice(t('settings.sourceAdded'));
      setNewPortalConfig(createInitialPortalDraft('ARGENPROP'));
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
      await apiRequest(`/portal-source-configs/${configId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          providerKey: draft.providerKey,
          enabled: draft.enabled,
          priority: Number(draft.priority),
          baseUrl: draft.baseUrl || undefined,
          maxResultsPerRun: Number(draft.maxResultsPerRun),
        }),
      });

      setNotice(t('settings.sourceUpdated'));
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
      await apiRequest(`/portal-source-configs/${configId}`, {
        method: 'DELETE',
      });

      setNotice(t('settings.sourceDeleted'));
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la fuente externa',
      );
    }
  }

  async function handleSaveFinanceConfig() {
    setError('');
    setNotice('');

    try {
      await apiRequest('/finance-config', {
        method: 'PATCH',
        body: JSON.stringify({
          franchisePercent: Number(financeConfigDraft.franchisePercent),
          saleCommissionPercent: Number(financeConfigDraft.saleCommissionPercent),
          purchaseCommissionPercent: Number(financeConfigDraft.purchaseCommissionPercent),
        }),
      });

      setNotice(t('settings.financeConfigSaved'));
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la configuracion de comisiones',
      );
    }
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
      />

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}

      <section className="card">
        <h3>{t('settings.activityGoalsTitle')}</h3>
        <p className="muted">{t('settings.activityGoalsSubtitle')}</p>
        <p className="muted">
          {t('settings.currentTeam')}: {user?.activeTeamName ?? t('common.noData')}
        </p>

        {loading ? <p className="muted">{t('common.loading')}</p> : null}
        {!loading && activityGoals.length === 0 ? (
          <p className="muted">{t('settings.noActivityGoals')}</p>
        ) : null}

        <div className="stack-gap portal-config-panel">
          {activityGoals.map((goal) => {
            const draft = activityGoalDrafts[goal.id];
            if (!draft) {
              return null;
            }

            return (
              <div key={goal.id} className="list-item portal-config-row">
                <div className="list-item-actions">
                  <div className="pill-row">
                    <span className="pill">
                      {translateEnum('activityType', draft.activityType)}
                    </span>
                    <span className="pill">
                      {t('settings.weeklyTarget')} {draft.targetCount}
                    </span>
                  </div>
                  <div className="candidate-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleSaveActivityGoal(goal.id)}
                    >
                      {t('settings.saveGoal')}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleDeleteActivityGoal(goal.id)}
                    >
                      {t('settings.deleteGoal')}
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    {t('settings.activityType')}
                    <select
                      value={draft.activityType}
                      onChange={(event) =>
                        updateActivityGoalDraft(goal.id, {
                          activityType: event.target.value as ActivityType,
                        })
                      }
                    >
                      {activityTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {translateEnum('activityType', option)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('settings.weeklyTarget')}
                    <input
                      type="number"
                      min="1"
                      value={draft.targetCount}
                      onChange={(event) =>
                        updateActivityGoalDraft(goal.id, {
                          targetCount: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}

          <div className="list-item portal-config-row">
            <div className="list-item-actions">
              <div>
                <strong>{t('settings.newGoal')}</strong>
              </div>
              <button type="button" onClick={() => void handleCreateActivityGoal()}>
                {t('settings.addGoal')}
              </button>
            </div>

            <div className="form-grid">
              <label>
                {t('settings.activityType')}
                <select
                  value={newActivityGoal.activityType}
                  onChange={(event) =>
                    updateNewActivityGoal({
                      activityType: event.target.value as ActivityType,
                    })
                  }
                >
                  {activityTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateEnum('activityType', option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('settings.weeklyTarget')}
                <input
                  type="number"
                  min="1"
                  value={newActivityGoal.targetCount}
                  onChange={(event) =>
                    updateNewActivityGoal({ targetCount: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>{t('settings.financeConfigTitle')}</h3>
        <p className="muted">{t('settings.financeConfigSubtitle')}</p>
        <p className="muted">
          {t('settings.currentTeam')}: {user?.activeTeamName ?? t('common.noData')}
        </p>

        <div className="form-grid">
          <label>
            {t('settings.franchisePercent')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeConfigDraft.franchisePercent}
              onChange={(event) =>
                updateFinanceConfigDraft({ franchisePercent: event.target.value })
              }
            />
          </label>
          <label>
            {t('settings.saleCommissionPercent')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeConfigDraft.saleCommissionPercent}
              onChange={(event) =>
                updateFinanceConfigDraft({
                  saleCommissionPercent: event.target.value,
                })
              }
            />
          </label>
          <label>
            {t('settings.purchaseCommissionPercent')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeConfigDraft.purchaseCommissionPercent}
              onChange={(event) =>
                updateFinanceConfigDraft({
                  purchaseCommissionPercent: event.target.value,
                })
              }
            />
          </label>
        </div>

        <div className="candidate-actions" style={{ marginTop: '1rem' }}>
          <button type="button" onClick={() => void handleSaveFinanceConfig()}>
            {t('common.save')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>{t('settings.portalSourcesTitle')}</h3>
        <p className="muted">{t('settings.portalSourcesSubtitle')}</p>
        <p className="muted">
          {t('settings.currentTeam')}: {user?.activeTeamName ?? t('common.noData')}
        </p>

        {loading ? <p className="muted">{t('common.loading')}</p> : null}
        {!loading && configs.length === 0 ? (
          <p className="muted">{t('settings.noPortalSources')}</p>
        ) : null}

        <div className="stack-gap portal-config-panel">
          {configs.map((config) => {
            const draft = portalDrafts[config.id];
            if (!draft) {
              return null;
            }

            return (
              <div key={config.id} className="list-item portal-config-row">
                <div className="list-item-actions">
                  <div className="pill-row">
                    <span className={`pill ${draft.enabled ? 'pill-active' : ''}`}>
                      {providerLabel(draft.providerKey)}
                    </span>
                    <span className="pill">{t('requirements.priority')} {draft.priority}</span>
                    <span className="pill">
                      {draft.maxResultsPerRun} {draft.maxResultsPerRun === '1' ? 'aviso' : 'avisos'}
                    </span>
                  </div>
                  <div className="candidate-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleSavePortalConfig(config.id)}
                    >
                      {t('settings.saveSource')}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleDeletePortalConfig(config.id)}
                    >
                      {t('settings.deleteSource')}
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    {t('requirements.provider')}
                    <select
                      value={draft.providerKey}
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
                    {t('requirements.priority')}
                    <input
                      type="number"
                      min="1"
                      value={draft.priority}
                      onChange={(event) =>
                        updatePortalDraft(config.id, { priority: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    {t('requirements.baseUrl')}
                    <input
                      value={draft.baseUrl}
                      onChange={(event) =>
                        updatePortalDraft(config.id, { baseUrl: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    {t('requirements.maxResultsPerRun')}
                    <input
                      type="number"
                      min="1"
                      value={draft.maxResultsPerRun}
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
                      checked={draft.enabled}
                      onChange={(event) =>
                        updatePortalDraft(config.id, { enabled: event.target.checked })
                      }
                    />
                    <span>{t('requirements.enabledSource')}</span>
                  </label>
                </div>
              </div>
            );
          })}

          <div className="list-item portal-config-row">
            <div className="list-item-actions">
              <div>
                <strong>{t('settings.newSource')}</strong>
              </div>
              <button type="button" onClick={() => void handleCreatePortalConfig()}>
                {t('settings.addSource')}
              </button>
            </div>

            <div className="form-grid">
              <label>
                {t('requirements.provider')}
                <select
                  value={newPortalConfig.providerKey}
                  onChange={(event) => {
                    const providerKey = event.target.value as PortalProviderKey;
                    updateNewPortalConfig({
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
                {t('requirements.priority')}
                <input
                  type="number"
                  min="1"
                  value={newPortalConfig.priority}
                  onChange={(event) =>
                    updateNewPortalConfig({ priority: event.target.value })
                  }
                />
              </label>
              <label>
                {t('requirements.baseUrl')}
                <input
                  value={newPortalConfig.baseUrl}
                  onChange={(event) =>
                    updateNewPortalConfig({ baseUrl: event.target.value })
                  }
                />
              </label>
              <label>
                {t('requirements.maxResultsPerRun')}
                <input
                  type="number"
                  min="1"
                  value={newPortalConfig.maxResultsPerRun}
                  onChange={(event) =>
                    updateNewPortalConfig({ maxResultsPerRun: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-item full-span">
                <input
                  type="checkbox"
                  checked={newPortalConfig.enabled}
                  onChange={(event) =>
                    updateNewPortalConfig({ enabled: event.target.checked })
                  }
                />
                <span>{t('requirements.enabledSource')}</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildActivityGoalDraftMap(goals: ActivityGoal[]) {
  return Object.fromEntries(
    goals.map((goal) => [
      goal.id,
      {
        activityType: goal.activityType,
        targetCount: String(goal.targetCount),
      },
    ]),
  ) as Record<number, ActivityGoalDraft>;
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

function buildPortalDraftMap(configs: PortalSourceConfig[]) {
  return Object.fromEntries(
    configs.map((config) => [
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
  ) as Record<number, PortalConfigDraft>;
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
