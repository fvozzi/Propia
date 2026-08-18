import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import {
  buyerPropertyCandidateWorkflowStatusOptions,
  useI18n,
} from '../lib/i18n';
import {
  buildBuyerSearchAgentMessage,
  buildBuyerTourWhatsappMessage,
  buildWhatsAppShareUrl,
  openWhatsAppShareUrl,
} from '../lib/whatsapp';
import type {
  BuyerPropertyCandidate,
  BuyerPropertyCandidateWorkflowStatus,
  Paginated,
  Property,
  SearchRequirement,
  Visit,
} from '../types';

type CandidateCreateForm = {
  propertyId: string;
  portal: string;
  url: string;
  title: string;
  agentName: string;
  agentWhatsapp: string;
  internalNotes: string;
};

type CandidateWorkflowDraft = {
  workflowStatus: BuyerPropertyCandidateWorkflowStatus;
  proposedScheduleOptions: string;
  scheduledVisitAt: string;
  workflowNotes: string;
  agentName: string;
  agentWhatsapp: string;
  lastContactedAt: string;
};

type ScheduledBuyerPropertyCandidate = BuyerPropertyCandidate & {
  scheduledVisitAt: string;
};

const initialCreateForm: CandidateCreateForm = {
  propertyId: '',
  portal: '',
  url: '',
  title: '',
  agentName: '',
  agentWhatsapp: '',
  internalNotes: '',
};

function toLocalDateTimeValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function buildCandidateDraft(candidate: BuyerPropertyCandidate): CandidateWorkflowDraft {
  return {
    workflowStatus: candidate.workflowStatus,
    proposedScheduleOptions: candidate.proposedScheduleOptions ?? '',
    scheduledVisitAt: toLocalDateTimeValue(candidate.scheduledVisitAt),
    workflowNotes: candidate.workflowNotes ?? '',
    agentName: candidate.agentName ?? '',
    agentWhatsapp: candidate.agentWhatsapp ?? '',
    lastContactedAt: toLocalDateTimeValue(candidate.lastContactedAt),
  };
}

function sameScheduledInstant(left: string | null, right: string | null) {
  if (!left || !right) return false;
  return new Date(left).getTime() === new Date(right).getTime();
}

function hasScheduledVisitAt(
  candidate: BuyerPropertyCandidate,
): candidate is ScheduledBuyerPropertyCandidate {
  return Boolean(candidate.scheduledVisitAt);
}

export function SearchRequirementManagePage() {
  const { id } = useParams();
  const { formatDateTime, t, translateEnum } = useI18n();
  const requirementId = Number(id);
  const [requirement, setRequirement] = useState<SearchRequirement | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [createForm, setCreateForm] = useState<CandidateCreateForm>(initialCreateForm);
  const [drafts, setDrafts] = useState<Record<number, CandidateWorkflowDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyCandidateId, setBusyCandidateId] = useState<number | null>(null);
  const [creatingCandidate, setCreatingCandidate] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [requirementResponse, propertiesResponse] = await Promise.all([
        apiRequest<SearchRequirement>(`/search-requirements/${requirementId}`),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=200'),
      ]);

      setRequirement(requirementResponse);
      setProperties(propertiesResponse.items);
      setDrafts(
        Object.fromEntries(
          (requirementResponse.propertyCandidates ?? []).map((candidate) => [
            candidate.id,
            buildCandidateDraft(candidate),
          ]),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la gestion.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(requirementId)) {
      void load();
    }
  }, [requirementId]);

  const selectedProperty =
    properties.find((property) => String(property.id) === createForm.propertyId) ?? null;
  const scheduledCandidates = useMemo(
    () =>
      (requirement?.propertyCandidates ?? [])
        .filter(
          (candidate) => candidate.workflowStatus === 'VISIT_SCHEDULED',
        )
        .filter(hasScheduledVisitAt)
        .sort(
          (left, right) =>
            new Date(left.scheduledVisitAt).getTime() -
            new Date(right.scheduledVisitAt).getTime(),
        ),
    [requirement],
  );

  const pendingSummary = useMemo(() => {
    const counts = {
      waiting:
        requirement?.propertyCandidates?.filter(
          (candidate) => candidate.workflowStatus === 'WAITING_RESPONSE',
        ).length ?? 0,
      schedules:
        requirement?.propertyCandidates?.filter(
          (candidate) => candidate.workflowStatus === 'PROPOSED_SCHEDULES',
        ).length ?? 0,
      toContact:
        requirement?.propertyCandidates?.filter(
          (candidate) => candidate.workflowStatus === 'TO_CONTACT',
        ).length ?? 0,
    };

    return counts;
  }, [requirement]);

  function setDraft(candidateId: number, patch: Partial<CandidateWorkflowDraft>) {
    setDrafts((current) => ({
      ...current,
      [candidateId]: {
        ...current[candidateId],
        ...patch,
      },
    }));
  }

  function applyQuickStatus(candidate: BuyerPropertyCandidate, nextStatus: BuyerPropertyCandidateWorkflowStatus) {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

    const patch: Partial<CandidateWorkflowDraft> = {
      workflowStatus: nextStatus,
      lastContactedAt: localNow,
    };

    if (nextStatus === 'DISCARDED') {
      patch.proposedScheduleOptions = '';
      patch.scheduledVisitAt = '';
    }

    setDraft(candidate.id, patch);
  }

  async function handleCreateCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirement) return;

    setCreatingCandidate(true);
    setError('');
    setNotice('');

    try {
      const title = selectedProperty?.title ?? createForm.title.trim();
      const url =
        selectedProperty?.publicationUrl?.trim() ||
        (selectedProperty ? `${window.location.origin}/properties/${selectedProperty.id}` : createForm.url.trim());

      await apiRequest('/buyer-property-candidates', {
        method: 'POST',
        body: JSON.stringify({
          contactId: requirement.contactId,
          searchRequirementId: requirement.id,
          propertyId: selectedProperty?.id,
          portal: selectedProperty ? 'CRM' : createForm.portal.trim(),
          url,
          title,
          agentName: createForm.agentName.trim() || undefined,
          agentWhatsapp: createForm.agentWhatsapp.trim() || undefined,
          internalNotes: createForm.internalNotes.trim() || undefined,
        }),
      });

      setCreateForm(initialCreateForm);
      setNotice('Propiedad candidata agregada.');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo agregar la candidata.');
    } finally {
      setCreatingCandidate(false);
    }
  }

  function findExistingVisit(candidate: BuyerPropertyCandidate) {
    const visits = requirement?.contact?.visits ?? [];
    return visits.find(
      (visit) =>
        visit.propertyId === candidate.propertyId &&
        sameScheduledInstant(visit.scheduledAt, candidate.scheduledVisitAt),
    );
  }

  async function saveCandidate(candidate: BuyerPropertyCandidate, createVisit = false) {
    const draft = drafts[candidate.id];
    if (!draft || !requirement) return;

    setBusyCandidateId(candidate.id);
    setError('');
    setNotice('');

    try {
      await apiRequest(`/buyer-property-candidates/${candidate.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          workflowStatus: draft.workflowStatus,
          proposedScheduleOptions: draft.proposedScheduleOptions || null,
          scheduledVisitAt: toIsoOrNull(draft.scheduledVisitAt),
          workflowNotes: draft.workflowNotes || null,
          agentName: draft.agentName || null,
          agentWhatsapp: draft.agentWhatsapp || null,
          lastContactedAt: toIsoOrNull(draft.lastContactedAt),
        }),
      });

      if (
        createVisit &&
        candidate.propertyId &&
        draft.workflowStatus === 'VISIT_SCHEDULED' &&
        draft.scheduledVisitAt
      ) {
        const refreshedRequirement = await apiRequest<SearchRequirement>(
          `/search-requirements/${requirement.id}`,
        );
        const refreshedCandidate =
          refreshedRequirement.propertyCandidates?.find((item) => item.id === candidate.id) ?? null;
        const existingVisit = refreshedCandidate ? findMatchingVisit(refreshedRequirement.contact?.visits ?? [], refreshedCandidate) : null;

        if (existingVisit) {
          setNotice(t('requirements.candidateVisitExists'));
          setRequirement(refreshedRequirement);
        } else if (refreshedCandidate) {
          await apiRequest('/visits', {
            method: 'POST',
            body: JSON.stringify({
              propertyId: refreshedCandidate.propertyId,
              contactId: refreshedRequirement.contactId,
              scheduledAt: refreshedCandidate.scheduledVisitAt,
              status: 'SCHEDULED',
              notes: refreshedCandidate.workflowNotes || undefined,
              externalUrl: refreshedCandidate.url,
            }),
          });
          setNotice(t('requirements.candidateVisitCreated'));
        }
      }

      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el seguimiento.');
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function handleDeleteCandidate(candidateId: number) {
    if (!window.confirm('Eliminar esta propiedad candidata?')) return;

    setBusyCandidateId(candidateId);
    setError('');
    setNotice('');

    try {
      await apiRequest(`/buyer-property-candidates/${candidateId}`, { method: 'DELETE' });
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la candidata.');
    } finally {
      setBusyCandidateId(null);
    }
  }

  function openAgentWhatsapp(candidate: BuyerPropertyCandidate) {
    if (!requirement?.contact || !drafts[candidate.id]?.agentWhatsapp) return;

    openWhatsAppShareUrl(
      buildWhatsAppShareUrl(
        { phone: '', whatsapp: drafts[candidate.id].agentWhatsapp },
        buildBuyerSearchAgentMessage(
          candidate.title,
          requirement.contact.displayName,
          candidate.property ?? undefined,
        ),
      ),
    );
  }

  function sendBuyerTour() {
    if (!requirement?.contact || scheduledCandidates.length === 0) return;

    openWhatsAppShareUrl(
      buildWhatsAppShareUrl(
        requirement.contact,
        buildBuyerTourWhatsappMessage(requirement.contact.displayName, scheduledCandidates),
      ),
    );
  }

  if (loading) {
    return (
      <div className="page-stack">
        <ResourcePageHeader
          eyebrow={t('requirements.eyebrow')}
          title={t('requirements.manageTitle')}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('requirements.eyebrow')}
        title={`${t('requirements.manageTitle')} - ${requirement?.contact?.displayName ?? ''}`}
        actions={
          <>
            <Link
              to={`/requirements/${requirementId}/suggestions`}
              className="ghost-button button-link"
            >
              {t('requirements.externalSuggestions')}
            </Link>
            <Link to={`/requirements/${requirementId}/edit`} className="ghost-button button-link">
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
        <section className="card buyer-search-summary">
          <div>
            <strong>{requirement.contact?.displayName}</strong>
            <p className="muted">
              {translateEnum('operationType', requirement.operationType)} ·{' '}
              {translateEnum('propertyType', requirement.propertyType)} ·{' '}
              {requirement.neighborhoods.join(', ') || t('common.noData')}
            </p>
            {requirement.notes ? <p className="muted">{requirement.notes}</p> : null}
          </div>
          <div className="pill-row">
            <span className="pill">{`${t('requirements.pendingSummary')}: ${pendingSummary.toContact}`}</span>
            <span className="pill">{`Esperando: ${pendingSummary.waiting}`}</span>
            <span className="pill">{`Horarios: ${pendingSummary.schedules}`}</span>
          </div>
        </section>
      ) : null}

      <div className="two-column buyer-search-grid">
        <section className="card">
          <h3>{t('requirements.addCandidate')}</h3>
          <form className="form-grid" onSubmit={handleCreateCandidate}>
            <label>
              {t('requirements.candidatePropertyOptional')}
              <select
                value={createForm.propertyId}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    propertyId: event.target.value,
                    portal: event.target.value ? 'CRM' : current.portal,
                  }))
                }
              >
                <option value="">{t('common.select')}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('contacts.candidatePortal')}
              <input
                value={selectedProperty ? 'CRM' : createForm.portal}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, portal: event.target.value }))
                }
                disabled={Boolean(selectedProperty)}
                required={!selectedProperty}
              />
            </label>
            <label className="full-span">
              {t('contacts.candidateTitle')}
              <input
                value={selectedProperty?.title ?? createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, title: event.target.value }))
                }
                disabled={Boolean(selectedProperty)}
                required={!selectedProperty}
              />
            </label>
            <label className="full-span">
              {t('contacts.candidateUrl')}
              <input
                type="url"
                value={
                  selectedProperty?.publicationUrl?.trim() ||
                  (selectedProperty ? `${window.location.origin}/properties/${selectedProperty.id}` : createForm.url)
                }
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, url: event.target.value }))
                }
                disabled={Boolean(selectedProperty)}
                required={!selectedProperty}
              />
            </label>
            <label>
              {t('requirements.candidateAgentName')}
              <input
                value={createForm.agentName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, agentName: event.target.value }))
                }
              />
            </label>
            <label>
              {t('requirements.candidateAgentWhatsapp')}
              <input
                value={createForm.agentWhatsapp}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, agentWhatsapp: event.target.value }))
                }
              />
            </label>
            <label className="full-span">
              {t('contacts.candidateInternalNotes')}
              <textarea
                rows={3}
                value={createForm.internalNotes}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, internalNotes: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="full-span" disabled={creatingCandidate}>
              {creatingCandidate ? t('common.loading') : t('contacts.candidateSave')}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="candidate-header">
            <div>
              <h3>{t('requirements.routeTitle')}</h3>
              <p className="muted">{t('requirements.manageSubtitle')}</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={sendBuyerTour}
              disabled={scheduledCandidates.length === 0 || !requirement?.contact}
            >
              {t('requirements.sendRoute')}
            </button>
          </div>
          {scheduledCandidates.length === 0 ? (
            <p className="muted">{t('requirements.routeEmpty')}</p>
          ) : (
            <div className="stack-gap">
              {scheduledCandidates.map((candidate) => (
                <article key={candidate.id} className="mini-agenda-item">
                  <strong>{candidate.property?.address ?? candidate.title}</strong>
                  <span className="muted">
                    {candidate.scheduledVisitAt
                      ? formatDateTime(candidate.scheduledVisitAt)
                      : t('common.noData')}
                  </span>
                  {candidate.proposedScheduleOptions ? (
                    <span className="muted">{candidate.proposedScheduleOptions}</span>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h3>{t('requirements.shortlistedProperties')}</h3>
        {(requirement?.propertyCandidates ?? []).length === 0 ? (
          <p className="muted">{t('contacts.candidateEmpty')}</p>
        ) : null}

        <div className="stack-gap">
          {(requirement?.propertyCandidates ?? []).map((candidate) => {
            const draft = drafts[candidate.id] ?? buildCandidateDraft(candidate);
            const existingVisit = findExistingVisit(candidate);
            const isBusy = busyCandidateId === candidate.id;

            return (
              <article key={candidate.id} className="list-item buyer-search-candidate">
                <div className="candidate-header">
                  <div>
                    <strong>{candidate.property?.address ?? candidate.title}</strong>
                    <p className="muted">
                      {candidate.property?.title ?? candidate.title} · {candidate.portal}
                    </p>
                    {candidate.property?.neighborhood ? (
                      <p className="muted">{candidate.property.neighborhood}</p>
                    ) : null}
                  </div>
                  <StatusPill value={draft.workflowStatus} />
                </div>

                <div className="candidate-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => applyQuickStatus(candidate, 'WAITING_RESPONSE')}
                  >
                    {t('requirements.candidateQuickNoResponse')}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => applyQuickStatus(candidate, 'CONTACTED')}
                  >
                    {t('requirements.candidateQuickAvailable')}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => applyQuickStatus(candidate, 'DISCARDED')}
                  >
                    {t('requirements.candidateQuickUnavailable')}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => applyQuickStatus(candidate, 'PROPOSED_SCHEDULES')}
                  >
                    {t('requirements.candidateQuickSchedules')}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => applyQuickStatus(candidate, 'VISIT_SCHEDULED')}
                  >
                    {t('requirements.candidateQuickConfirmed')}
                  </button>
                </div>

                <div className="form-grid buyer-search-candidate-form">
                  <label>
                    {t('common.status')}
                    <select
                      value={draft.workflowStatus}
                      onChange={(event) =>
                        setDraft(candidate.id, {
                          workflowStatus:
                            event.target.value as BuyerPropertyCandidateWorkflowStatus,
                        })
                      }
                    >
                      {buyerPropertyCandidateWorkflowStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {translateEnum('buyerPropertyCandidateWorkflowStatus', option)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ultimo contacto
                    <input
                      type="datetime-local"
                      value={draft.lastContactedAt}
                      onChange={(event) =>
                        setDraft(candidate.id, { lastContactedAt: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    {t('requirements.candidateAgentName')}
                    <input
                      value={draft.agentName}
                      onChange={(event) =>
                        setDraft(candidate.id, { agentName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    {t('requirements.candidateAgentWhatsapp')}
                    <input
                      value={draft.agentWhatsapp}
                      onChange={(event) =>
                        setDraft(candidate.id, { agentWhatsapp: event.target.value })
                      }
                    />
                  </label>
                  <label className="full-span">
                    {t('requirements.candidateScheduleOptions')}
                    <textarea
                      rows={2}
                      value={draft.proposedScheduleOptions}
                      onChange={(event) =>
                        setDraft(candidate.id, {
                          proposedScheduleOptions: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    {t('requirements.candidateScheduledAt')}
                    <input
                      type="datetime-local"
                      value={draft.scheduledVisitAt}
                      onChange={(event) =>
                        setDraft(candidate.id, { scheduledVisitAt: event.target.value })
                      }
                    />
                  </label>
                  <label className="full-span">
                    {t('requirements.candidateWorkflowNotes')}
                    <textarea
                      rows={3}
                      value={draft.workflowNotes}
                      onChange={(event) =>
                        setDraft(candidate.id, { workflowNotes: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="candidate-actions">
                  {candidate.url ? (
                    <a href={candidate.url} target="_blank" rel="noreferrer" className="ghost-button button-link">
                      {t('contacts.candidateOpenLink')}
                    </a>
                  ) : null}
                  {draft.agentWhatsapp ? (
                    <button type="button" className="ghost-button" onClick={() => openAgentWhatsapp(candidate)}>
                      {t('requirements.openAgentWhatsapp')}
                    </button>
                  ) : null}
                  <button type="button" className="ghost-button" onClick={() => saveCandidate(candidate)} disabled={isBusy}>
                    {isBusy ? t('common.loading') : t('requirements.candidateSaveWorkflow')}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => saveCandidate(candidate, true)}
                    disabled={
                      isBusy ||
                      !candidate.propertyId ||
                      !draft.scheduledVisitAt ||
                      draft.workflowStatus !== 'VISIT_SCHEDULED'
                    }
                  >
                    {t('requirements.candidateCreateVisit')}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => handleDeleteCandidate(candidate.id)} disabled={isBusy}>
                    {t('contacts.candidateDelete')}
                  </button>
                </div>

                {existingVisit ? (
                  <p className="muted">
                    {t('requirements.candidateVisitExists')} {formatDateTime(existingVisit.scheduledAt)}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function findMatchingVisit(visits: Visit[], candidate: BuyerPropertyCandidate) {
  return visits.find(
    (visit) =>
      visit.propertyId === candidate.propertyId &&
      sameScheduledInstant(visit.scheduledAt, candidate.scheduledVisitAt),
  );
}
