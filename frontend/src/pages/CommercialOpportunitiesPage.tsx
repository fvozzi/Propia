import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  commercialOpportunityStageOptions,
  commercialOpportunityStatusOptions,
  operationTypeOptions,
  useI18n,
} from '../lib/i18n';
import type {
  Activity,
  AppraisalRequest,
  CommercialOpportunity,
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  Contact,
  OperationType,
  Paginated,
  Property,
  SearchRequirement,
} from '../types';

type OpportunityFormState = {
  id: number | null;
  contactId: string;
  operationType: OperationType;
  stage: CommercialOpportunityStage;
  status: CommercialOpportunityStatus;
  propertyId: string;
  searchRequirementId: string;
  appraisalRequestId: string;
  sourceActivityId: string;
  title: string;
  summary: string;
  lostReason: string;
};

const initialFormState: OpportunityFormState = {
  id: null,
  contactId: '',
  operationType: 'BUY',
  stage: 'SEARCHING',
  status: 'OPEN',
  propertyId: '',
  searchRequirementId: '',
  appraisalRequestId: '',
  sourceActivityId: '',
  title: '',
  summary: '',
  lostReason: '',
};

export function CommercialOpportunitiesPage() {
  const { t, translateEnum } = useI18n();
  const [response, setResponse] = useState<Paginated<CommercialOpportunity> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requirements, setRequirements] = useState<SearchRequirement[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalRequest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState<OpportunityFormState>(initialFormState);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [operationTypeFilter, setOperationTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void load(page);
  }, [page]);

  async function load(nextPage = page) {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '12',
      });

      if (operationTypeFilter) params.set('operationType', operationTypeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (stageFilter) params.set('stage', stageFilter);

      const [
        opportunitiesResponse,
        contactsResponse,
        propertiesResponse,
        requirementsResponse,
        appraisalsResponse,
        activitiesResponse,
      ] = await Promise.all([
        apiRequest<Paginated<CommercialOpportunity>>(
          `/commercial-opportunities?${params.toString()}`,
        ),
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
        apiRequest<Paginated<SearchRequirement>>('/search-requirements?page=1&limit=100'),
        apiRequest<Paginated<AppraisalRequest>>('/appraisal-requests?page=1&limit=100'),
        apiRequest<Paginated<Activity>>('/activities?page=1&limit=100'),
      ]);

      setResponse(opportunitiesResponse);
      setContacts(contactsResponse.items);
      setProperties(propertiesResponse.items);
      setRequirements(requirementsResponse.items);
      setAppraisals(appraisalsResponse.items);
      setActivities(activitiesResponse.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t('commercialOpportunities.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialFormState);
  }

  function handleOperationTypeChange(operationType: OperationType) {
    setForm((current) => ({
      ...current,
      operationType,
      stage:
        current.status === 'OPEN'
          ? defaultStageForOperation(operationType)
          : current.status === 'WON'
            ? 'CLOSED_WON'
            : current.status === 'LOST'
              ? 'CLOSED_LOST'
              : current.stage,
    }));
  }

  function handleStatusChange(status: CommercialOpportunityStatus) {
    setForm((current) => ({
      ...current,
      status,
      stage:
        status === 'WON'
          ? 'CLOSED_WON'
          : status === 'LOST'
            ? 'CLOSED_LOST'
            : current.stage === 'CLOSED_WON' || current.stage === 'CLOSED_LOST'
              ? defaultStageForOperation(current.operationType)
              : current.stage,
    }));
  }

  async function handleApplyFilters() {
    setPage(1);
    await load(1);
  }

  function handleEdit(opportunity: CommercialOpportunity) {
    setForm({
      id: opportunity.id,
      contactId: String(opportunity.contactId),
      operationType: opportunity.operationType,
      stage: opportunity.stage,
      status: opportunity.status,
      propertyId: opportunity.propertyId ? String(opportunity.propertyId) : '',
      searchRequirementId: opportunity.searchRequirementId
        ? String(opportunity.searchRequirementId)
        : '',
      appraisalRequestId: opportunity.appraisalRequestId
        ? String(opportunity.appraisalRequestId)
        : '',
      sourceActivityId: opportunity.sourceActivityId
        ? String(opportunity.sourceActivityId)
        : '',
      title: opportunity.title,
      summary: opportunity.summary ?? '',
      lostReason: opportunity.lostReason ?? '',
    });
    setNotice('');
    setError('');
    setIsCreateOpen(true);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        contactId: Number(form.contactId),
        operationType: form.operationType,
        stage: form.stage,
        status: form.status,
        propertyId: form.propertyId ? Number(form.propertyId) : undefined,
        searchRequirementId: form.searchRequirementId
          ? Number(form.searchRequirementId)
          : undefined,
        appraisalRequestId: form.appraisalRequestId
          ? Number(form.appraisalRequestId)
          : undefined,
        sourceActivityId: form.sourceActivityId
          ? Number(form.sourceActivityId)
          : undefined,
        title: form.title || undefined,
        summary: form.summary || undefined,
        lostReason: form.lostReason || undefined,
      };

      if (form.id) {
        await apiRequest(`/commercial-opportunities/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/commercial-opportunities', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setNotice(t('commercialOpportunities.saved'));
      resetForm();
      setIsCreateOpen(false);
      await load(page);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('commercialOpportunities.saveError'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('commercialOpportunities.confirmDelete'))) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/commercial-opportunities/${id}`, {
        method: 'DELETE',
      });
      setNotice(t('commercialOpportunities.deleted'));
      await load(page);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t('commercialOpportunities.deleteError'),
      );
    }
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('commercialOpportunities.eyebrow')}
        title={t('commercialOpportunities.title')}
        actions={
          <div className="candidate-actions">
            <select
              value={operationTypeFilter}
              onChange={(event) => setOperationTypeFilter(event.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {operationTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('operationType', option)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {commercialOpportunityStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('commercialOpportunityStatus', option)}
                </option>
              ))}
            </select>
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {commercialOpportunityStageOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('commercialOpportunityStage', option)}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleApplyFilters}>
              {t('common.filter')}
            </button>
            {isCreateOpen ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                {t('commercialOpportunities.closeForm')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
              >
                {t('commercialOpportunities.newOpportunity')}
              </button>
            )}
          </div>
        }
      />

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}

      {isCreateOpen ? (
        <section className="card">
          <h3>
            {form.id
              ? t('commercialOpportunities.editOpportunity')
              : t('commercialOpportunities.newOpportunity')}
          </h3>
          <p className="muted">{t('commercialOpportunities.subtitle')}</p>

          <form className="form-grid" onSubmit={handleSave}>
            <label>
              {t('commercialOpportunities.contact')}
              <select
                value={form.contactId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contactId: event.target.value,
                  }))
                }
                required
              >
                <option value="">{t('commercialOpportunities.noContactSelected')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commercialOpportunities.operation')}
              <select
                value={form.operationType}
                onChange={(event) =>
                  handleOperationTypeChange(event.target.value as OperationType)
                }
              >
                {operationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('operationType', option)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commercialOpportunities.status')}
              <select
                value={form.status}
                onChange={(event) =>
                  handleStatusChange(
                    event.target.value as CommercialOpportunityStatus,
                  )
                }
              >
                {commercialOpportunityStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('commercialOpportunityStatus', option)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commercialOpportunities.stage')}
              <select
                value={form.stage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stage: event.target.value as CommercialOpportunityStage,
                  }))
                }
              >
                {commercialOpportunityStageOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('commercialOpportunityStage', option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-span">
              {t('commercialOpportunities.titleLabel')}
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              {t('commercialOpportunities.linkedProperty')}
              <select
                value={form.propertyId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    propertyId: event.target.value,
                  }))
                }
              >
                <option value="">{t('commercialOpportunities.noPropertySelected')}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commercialOpportunities.linkedRequirement')}
              <select
                value={form.searchRequirementId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    searchRequirementId: event.target.value,
                  }))
                }
              >
                <option value="">{t('commercialOpportunities.noRequirementSelected')}</option>
                {requirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {buildRequirementLabel(requirement, translateEnum)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commercialOpportunities.linkedPrelisting')}
              <select
                value={form.appraisalRequestId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    appraisalRequestId: event.target.value,
                  }))
                }
              >
                <option value="">{t('commercialOpportunities.noPrelistingSelected')}</option>
                {appraisals.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.propertyAddress || `#${request.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commercialOpportunities.sourceActivity')}
              <select
                value={form.sourceActivityId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sourceActivityId: event.target.value,
                  }))
                }
              >
                <option value="">{t('commercialOpportunities.noActivitySelected')}</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {buildActivityLabel(activity, translateEnum)}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-span">
              {t('commercialOpportunities.summary')}
              <textarea
                rows={3}
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </label>

            <label className="full-span">
              {t('commercialOpportunities.lostReason')}
              <textarea
                rows={2}
                value={form.lostReason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lostReason: event.target.value,
                  }))
                }
              />
            </label>

            <div className="full-span candidate-actions">
              <button type="submit" disabled={saving}>
                {saving ? t('common.loading') : t('commercialOpportunities.save')}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                {t('commercialOpportunities.closeForm')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <h3>{t('commercialOpportunities.listTitle')}</h3>
        {loading ? <p className="muted">{t('common.loading')}</p> : null}
        {!loading && (response?.items.length ?? 0) === 0 ? (
          <p className="muted">{t('commercialOpportunities.noItems')}</p>
        ) : null}
        {!loading && response?.items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commercialOpportunities.titleLabel')}</th>
                  <th>{t('commercialOpportunities.contact')}</th>
                  <th>{t('commercialOpportunities.operation')}</th>
                  <th>{t('commercialOpportunities.stage')}</th>
                  <th>{t('commercialOpportunities.status')}</th>
                  <th>{t('commercialOpportunities.sourceColumn')}</th>
                  <th>{t('commercialOpportunities.updatedColumn')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {response.items.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{opportunity.title}</strong>
                        {opportunity.summary ? (
                          <span className="muted">{opportunity.summary}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {opportunity.contact ? (
                        <Link to={`/contacts/${opportunity.contact.id}`}>
                          {opportunity.contact.displayName}
                        </Link>
                      ) : (
                        `#${opportunity.contactId}`
                      )}
                    </td>
                    <td>{translateEnum('operationType', opportunity.operationType)}</td>
                    <td>
                      {translateEnum('commercialOpportunityStage', opportunity.stage)}
                    </td>
                    <td>
                      {translateEnum('commercialOpportunityStatus', opportunity.status)}
                    </td>
                    <td>{buildOpportunitySource(opportunity, translateEnum)}</td>
                    <td>
                      {new Date(opportunity.updatedAt).toLocaleDateString('es-AR')}
                    </td>
                    <td>
                      <div className="candidate-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleEdit(opportunity)}
                        >
                          {t('common.update')}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => void handleDelete(opportunity.id)}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {response ? (
          <div className="pagination-row">
            <button
              type="button"
              className="ghost-button"
              disabled={response.meta.page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              {t('common.previous')}
            </button>
            <span className="muted">
              {response.meta.page} / {response.meta.totalPages}
            </span>
            <button
              type="button"
              className="ghost-button"
              disabled={response.meta.page >= response.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('common.next')}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function defaultStageForOperation(operationType: OperationType): CommercialOpportunityStage {
  return operationType === 'BUY'
    ? 'SEARCHING'
    : operationType === 'SALE'
      ? 'QUALIFYING'
      : 'NEW';
}

function buildActivityLabel(
  activity: Activity,
  translateEnum: (group: 'activityType', value: string) => string,
) {
  return `${translateEnum('activityType', activity.activityType)} - ${activity.title}`;
}

function buildRequirementLabel(
  requirement: SearchRequirement,
  translateEnum: (
    group: 'operationType' | 'propertyType',
    value: string,
  ) => string,
) {
  return [
    requirement.contact?.displayName ?? `#${requirement.id}`,
    translateEnum('operationType', requirement.operationType),
    translateEnum('propertyType', requirement.propertyType),
  ].join(' · ');
}

function buildOpportunitySource(
  opportunity: CommercialOpportunity,
  translateEnum: (group: 'activityType', value: string) => string,
) {
  if (opportunity.property) {
    return opportunity.property.title;
  }

  if (opportunity.searchRequirement) {
    return `Req. #${opportunity.searchRequirement.id}`;
  }

  if (opportunity.appraisalRequest) {
    return opportunity.appraisalRequest.propertyAddress || `Prelisting #${opportunity.appraisalRequest.id}`;
  }

  if (opportunity.sourceActivity) {
    return `${translateEnum('activityType', opportunity.sourceActivity.activityType)} - ${opportunity.sourceActivity.title}`;
  }

  return '-';
}
