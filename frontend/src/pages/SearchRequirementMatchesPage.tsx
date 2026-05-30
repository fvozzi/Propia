import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import type {
  PortalProviderKey,
  PortalSearchRun,
  PortalSourceConfig,
  RequirementPortalMatch,
  SearchRequirement,
} from '../types';

type PortalConfigDraft = {
  providerKey: PortalProviderKey;
  enabled: boolean;
  priority: string;
  baseUrl: string;
  maxResultsPerRun: string;
};

export function SearchRequirementMatchesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, translateEnum, formatDateTime } = useI18n();
  const [requirement, setRequirement] = useState<SearchRequirement | null>(null);
  const [configs, setConfigs] = useState<PortalSourceConfig[]>([]);
  const [matches, setMatches] = useState<RequirementPortalMatch[]>([]);
  const [runs, setRuns] = useState<PortalSearchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSearch, setRunningSearch] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyMatchId, setBusyMatchId] = useState<number | null>(null);
  const [runsExpanded, setRunsExpanded] = useState(false);
  const [portalConfigsExpanded, setPortalConfigsExpanded] = useState(false);
  const [portalDrafts, setPortalDrafts] = useState<Record<number, PortalConfigDraft>>({});
  const [newPortalConfig, setNewPortalConfig] = useState<PortalConfigDraft>(
    createInitialPortalDraft('ARGENPROP'),
  );

  const requirementId = Number(id);

  const enabledConfigs = useMemo(() => configs.filter((config) => config.enabled), [configs]);
  const canRunSearch = useMemo(
    () => requirement?.operationType === 'BUY' && enabledConfigs.length > 0,
    [enabledConfigs.length, requirement],
  );
  const runSearchBlockedReason = useMemo(() => {
    if (!requirement) {
      return '';
    }

    if (requirement.operationType !== 'BUY') {
      return 'La busqueda externa automatica solo esta disponible para requerimientos de compra.';
    }

    if (enabledConfigs.length === 0) {
      return 'Activa al menos una fuente de portal para poder ejecutar la busqueda.';
    }

    return '';
  }, [enabledConfigs.length, requirement]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      try {
        const [requirementResponse, configsResponse, matchesResponse, runsResponse] =
          await Promise.all([
            apiRequest<SearchRequirement>(`/search-requirements/${requirementId}`),
            apiRequest<PortalSourceConfig[]>('/portal-source-configs'),
            apiRequest<RequirementPortalMatch[]>(
              `/search-requirements/${requirementId}/external-matches`,
            ),
            apiRequest<PortalSearchRun[]>(
              `/search-requirements/${requirementId}/search-runs`,
            ),
          ]);

        setRequirement(requirementResponse);
        setConfigs(configsResponse);
        setMatches(matchesResponse);
        setRuns(runsResponse);
        setPortalDrafts(buildPortalDraftMap(configsResponse));
        setPortalConfigsExpanded(configsResponse.length === 0);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la busqueda externa',
        );
      } finally {
        setLoading(false);
      }
    }

    if (Number.isFinite(requirementId)) {
      void load();
    }
  }, [requirementId]);

  async function reload() {
    const [configsResponse, matchesResponse, runsResponse] = await Promise.all([
      apiRequest<PortalSourceConfig[]>('/portal-source-configs'),
      apiRequest<RequirementPortalMatch[]>(
        `/search-requirements/${requirementId}/external-matches`,
      ),
      apiRequest<PortalSearchRun[]>(`/search-requirements/${requirementId}/search-runs`),
    ]);

    setConfigs(configsResponse);
    setMatches(matchesResponse);
    setRuns(runsResponse);
    setPortalDrafts(buildPortalDraftMap(configsResponse));
    setPortalConfigsExpanded((current) => current || configsResponse.length === 0);

    return {
      configs: configsResponse,
      matches: matchesResponse,
      runs: runsResponse,
    };
  }

  async function handleRunSearch() {
    setRunningSearch(true);
    setError('');
    setNotice('');

    try {
      const enabledProvidersCount = configs.filter((config) => config.enabled).length;
      await apiRequest(`/search-requirements/${requirementId}/run-external-search`, {
        method: 'POST',
      });
      const nextState = await reload();
      const latestRuns = nextState.runs.slice(0, enabledProvidersCount);
      const failedRuns = latestRuns.filter((run) => run.status === 'FAILED');
      const fetchedCount = latestRuns.reduce((sum, run) => sum + run.fetchedCount, 0);
      const matchedCount = latestRuns.reduce((sum, run) => sum + run.matchedCount, 0);

      if (latestRuns.length === 0) {
        setNotice('La busqueda termino sin registrar corridas.');
      } else if (failedRuns.length === latestRuns.length) {
        setError(
          'La busqueda se ejecuto, pero todos los portales fallaron. Revisa Corridas de portales para ver el detalle.',
        );
      } else if (failedRuns.length > 0) {
        setNotice(
          `Busqueda ejecutada: ${matchedCount} sugerencias, ${fetchedCount} avisos leidos y ${failedRuns.length} portales con error.`,
        );
      } else {
        setNotice(
          `Busqueda ejecutada: ${matchedCount} sugerencias y ${fetchedCount} avisos leidos.`,
        );
      }
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : 'No se pudo ejecutar la busqueda',
      );
    } finally {
      setRunningSearch(false);
    }
  }

  async function runMatchAction(matchId: number, path: string) {
    setBusyMatchId(matchId);
    setError('');

    try {
      await apiRequest(path, { method: 'POST' });
      await reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'No se pudo ejecutar la accion sobre la sugerencia',
      );
    } finally {
      setBusyMatchId(null);
    }
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

      setNotice('Fuente externa agregada.');
      setNewPortalConfig(createInitialPortalDraft('ARGENPROP'));
      await reload();
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

      setNotice('Fuente externa actualizada.');
      await reload();
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

      setNotice('Fuente externa eliminada.');
      await reload();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la fuente externa',
      );
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <ResourcePageHeader
          eyebrow={t('requirements.eyebrow')}
          title={t('requirements.externalSuggestions')}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('requirements.eyebrow')}
        title={`${t('requirements.externalSuggestions')} - ${requirement?.contact?.displayName ?? ''}`}
        actions={
          <>
            {canRunSearch ? (
              <button type="button" onClick={handleRunSearch} disabled={runningSearch}>
                {runningSearch ? t('common.loading') : t('requirements.runExternalSearch')}
              </button>
            ) : (
              <button
                type="button"
                className="ghost-button"
                disabled
                title={runSearchBlockedReason}
              >
                {t('requirements.runExternalSearch')}
              </button>
            )}
            <Link
              to={requirement ? `/requirements/${requirement.id}/edit` : '/requirements'}
              className="ghost-button button-link"
            >
              {t('common.update')}
            </Link>
            <Link to="/requirements" className="ghost-button button-link">
              {t('requirements.backToList')}
            </Link>
          </>
        }
      />

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}

      {requirement ? (
        <section className="card">
          <strong>{requirement.contact?.displayName}</strong>
          <p className="muted">
            {translateEnum('operationType', requirement.operationType)} -{' '}
            {translateEnum('propertyType', requirement.propertyType)} -{' '}
            {requirement.neighborhoods.join(', ') || t('common.noData')}
          </p>
          {!canRunSearch && runSearchBlockedReason ? (
            <p className="muted">{runSearchBlockedReason}</p>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <div className="list-item-actions">
          <div>
            <h3>{t('requirements.portalSources')}</h3>
            <p className="muted">
              La configuracion de proveedores externos se guarda a nivel cuenta/team y aplica a todos los usuarios.
            </p>
          </div>
          <div className="candidate-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setPortalConfigsExpanded((current) => !current)}
            >
              {portalConfigsExpanded ? 'Ocultar configuracion' : 'Configurar fuentes'}
            </button>
            {user?.appRole === 'ADMIN' && user.backofficeAccess ? (
              <Link to="/backoffice" className="ghost-button button-link">
                Abrir backoffice
              </Link>
            ) : null}
          </div>
        </div>

        <div className="pill-row">
          {enabledConfigs.length > 0 ? (
            enabledConfigs.map((config) => (
              <span key={config.id} className="pill pill-active">
                {providerLabel(config.providerKey)} - {config.maxResultsPerRun} avisos
              </span>
            ))
          ) : (
            <span className="pill">Sin fuentes activas</span>
          )}
        </div>

        {portalConfigsExpanded ? (
          <div className="stack-gap portal-config-panel">
            {configs.length === 0 ? (
              <p className="muted">Todavia no hay fuentes configuradas para este team.</p>
            ) : null}

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
                      <span className="pill">Prioridad {draft.priority}</span>
                      <span className="pill">{draft.maxResultsPerRun} avisos por corrida</span>
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
                      Prioridad
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
                      URL base
                      <input
                        value={draft.baseUrl}
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
                      <span>Fuente habilitada</span>
                    </label>
                  </div>
                </div>
              );
            })}

            <div className="list-item portal-config-row">
              <div className="list-item-actions">
                <div>
                  <strong>Nueva fuente</strong>
                  <p className="muted">Alta general para todo el team actual.</p>
                </div>
                <button type="button" onClick={() => void handleCreatePortalConfig()}>
                  Agregar fuente
                </button>
              </div>

              <div className="form-grid">
                <label>
                  Proveedor
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
                  Prioridad
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
                  URL base
                  <input
                    value={newPortalConfig.baseUrl}
                    onChange={(event) =>
                      updateNewPortalConfig({ baseUrl: event.target.value })
                    }
                  />
                </label>
                <label>
                  Max resultados por corrida
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
                  <span>Fuente habilitada</span>
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>{t('requirements.externalSuggestions')}</h3>
        {matches.length === 0 ? (
          <p className="muted">{t('requirements.noExternalSuggestions')}</p>
        ) : null}

        <div className="stack-gap">
          {matches.map((match) => (
            <article key={match.id} className="list-item list-item-actions">
              <div>
                {getExternalListingImageUrl(match.externalListing) ? (
                  <img
                    src={getExternalListingImageUrl(match.externalListing) ?? undefined}
                    alt={match.externalListing.title}
                    className="external-listing-thumb"
                  />
                ) : null}
                <strong>{match.externalListing.title}</strong>
                <p className="muted">
                  {providerLabel(match.externalListing.providerKey)} -{' '}
                  {match.externalListing.neighborhood ?? t('common.noData')} -{' '}
                  {formatMoney(match.externalListing.price, match.externalListing.currency)}
                </p>
                <p className="muted">
                  {t('requirements.matchScore')}: {match.score}
                </p>
                <p className="muted">
                  {t('requirements.matchReasons')}: {match.matchReasons.join(' - ')}
                </p>
                {match.dismissed ? (
                  <p className="muted">
                    Descartada{match.dismissedReason ? `: ${match.dismissedReason}` : ''}
                  </p>
                ) : null}
                <div className="pill-row">
                  <span className="pill">
                    {translateEnum('propertyType', match.externalListing.propertyType)}
                  </span>
                  <span className="pill">{match.externalListing.rooms ?? '-'} amb.</span>
                  {match.buyerPropertyCandidateId ? (
                    <span className="pill pill-active">Candidata creada</span>
                  ) : null}
                  {match.activityId ? (
                    <span className="pill pill-active">Actividad creada</span>
                  ) : null}
                </div>
              </div>
              <div className="candidate-actions">
                <a
                  href={match.externalListing.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ghost-button button-link"
                >
                  Abrir publicacion
                </a>
                {match.dismissed ? (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={busyMatchId === match.id}
                    onClick={() =>
                      runMatchAction(
                        match.id,
                        `/search-requirements/${requirementId}/external-matches/${match.id}/restore`,
                      )
                    }
                  >
                    {busyMatchId === match.id
                      ? t('common.loading')
                      : t('requirements.restoreSuggestion')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={busyMatchId === match.id}
                    onClick={() =>
                      runMatchAction(
                        match.id,
                        `/search-requirements/${requirementId}/external-matches/${match.id}/dismiss`,
                      )
                    }
                  >
                    {busyMatchId === match.id
                      ? t('common.loading')
                      : t('requirements.dismissSuggestion')}
                  </button>
                )}
                {!match.buyerPropertyCandidateId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={busyMatchId === match.id}
                    onClick={() =>
                      runMatchAction(
                        match.id,
                        `/search-requirements/${requirementId}/external-matches/${match.id}/convert-to-candidate`,
                      )
                    }
                  >
                    {busyMatchId === match.id
                      ? t('common.loading')
                      : t('requirements.convertToCandidate')}
                  </button>
                ) : null}
                {!match.activityId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={busyMatchId === match.id}
                    onClick={() =>
                      runMatchAction(
                        match.id,
                        `/search-requirements/${requirementId}/external-matches/${match.id}/create-activity`,
                      )
                    }
                  >
                    {busyMatchId === match.id
                      ? t('common.loading')
                      : t('requirements.createActivity')}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="list-item-actions">
          <div>
            <h3>{t('requirements.portalRuns')}</h3>
            <p className="muted">{summarizePortalRuns(runs, t('common.noData'))}</p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setRunsExpanded((current) => !current)}
          >
            {runsExpanded ? t('requirements.hidePortalRuns') : t('requirements.showPortalRuns')}
          </button>
        </div>

        {runsExpanded ? (
          runs.length === 0 ? (
            <p className="muted">{t('common.noData')}</p>
          ) : (
            <div className="stack-gap">
              {runs.map((run) => (
                <article key={run.id} className="list-item">
                  <strong>{providerLabel(run.providerKey)}</strong>
                  <p className="muted">
                    {run.status} - {run.fetchedCount} brutas - {run.matchedCount} sugeridas
                  </p>
                  <p className="muted">
                    {formatDateTime(run.startedAt)}
                    {run.finishedAt ? ` - ${formatDateTime(run.finishedAt)}` : ''}
                  </p>
                  {getRunSearchUrl(run) ? (
                    <p className="muted run-search-url">URL: {getRunSearchUrl(run)}</p>
                  ) : null}
                  {run.errorMessage ? <p className="muted">{run.errorMessage}</p> : null}
                </article>
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
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

function formatMoney(value: number | null, currency: string) {
  if (value === null) {
    return 'Sin precio';
  }

  return `${currency} ${new Intl.NumberFormat('es-AR').format(value)}`;
}

function getExternalListingImageUrl(listing: RequirementPortalMatch['externalListing']) {
  const value = listing.rawPayload?.previewImageUrl;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getRunSearchUrl(run: PortalSearchRun) {
  const value = run.requestSnapshot?.searchUrl;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function summarizePortalRuns(runs: PortalSearchRun[], emptyLabel: string) {
  if (runs.length === 0) {
    return emptyLabel;
  }

  const successCount = runs.filter((run) => run.status === 'SUCCESS').length;
  const failedCount = runs.filter((run) => run.status === 'FAILED').length;
  const totalFetched = runs.reduce((sum, run) => sum + run.fetchedCount, 0);
  const totalMatched = runs.reduce((sum, run) => sum + run.matchedCount, 0);

  return `${runs.length} corridas - ${successCount} ok - ${failedCount} con error - ${totalFetched} brutas - ${totalMatched} sugeridas`;
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

function createInitialPortalDraft(providerKey: PortalProviderKey): PortalConfigDraft {
  return {
    providerKey,
    enabled: true,
    priority: '100',
    baseUrl: defaultPortalBaseUrlByProvider[providerKey],
    maxResultsPerRun: '20',
  };
}

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
