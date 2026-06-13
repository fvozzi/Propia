import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { searchRequirementStatusOptions, useI18n } from '../lib/i18n';
import { formatRequirementDetails } from '../lib/requirements';
import type { Paginated, SearchRequirement } from '../types';

export function SearchRequirementsPage() {
  const { t, translateEnum } = useI18n();
  const [searchParams] = useSearchParams();
  const [response, setResponse] = useState<Paginated<SearchRequirement> | null>(null);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(1);

  async function load(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '8',
    });

    if (status) params.set('status', status);

    const data = await apiRequest<Paginated<SearchRequirement>>(`/search-requirements?${params.toString()}`);
    setResponse(data);
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  async function handleApplyFilters() {
    setPage(1);
    await load(1);
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('common.yesDeleteRequirement'))) return;
    await apiRequest(`/search-requirements/${id}`, { method: 'DELETE' });
    await load(page);
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('requirements.eyebrow')}
        title={t('requirements.title')}
        actions={
          <>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">{t('common.all')}</option>
              {searchRequirementStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('searchRequirementStatus', option)}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleApplyFilters}>
              {t('common.filter')}
            </button>
            <Link to="/requirements/new" className="button-link">
              {t('requirements.newRequirement')}
            </Link>
          </>
        }
      />

      <PaginatedListCard
        title={t('requirements.listTitle')}
        page={response?.meta.page ?? 1}
        totalPages={response?.meta.totalPages ?? 1}
        pageLabel={t('contacts.page')}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
        onPrevious={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      >
        {(response?.items ?? []).map((requirement) => (
          <article key={requirement.id} className="list-item list-item-actions">
            <div>
              <strong>{requirement.contact?.displayName ?? `${t('common.contact')} #${requirement.contactId}`}</strong>
              <p className="muted">
                {translateEnum('operationType', requirement.operationType)} · {translateEnum('propertyType', requirement.propertyType)} ·{' '}
                {requirement.neighborhoods.join(', ') || t('common.noData')}
              </p>
              <p className="muted">{formatRequirementDetails(requirement, t)}</p>
              {requirement.property ? (
                <Link to={`/properties/${requirement.property.id}`} className="agenda-link">
                  {t('common.property')}: {requirement.property.title}
                </Link>
              ) : null}
              <StatusPill value={requirement.status} />
            </div>
            <div className="candidate-actions">
              <Link
                to={`/requirements/${requirement.id}/suggestions`}
                className="ghost-button button-link"
              >
                Buscar en portales
              </Link>
              <Link to={`/requirements/${requirement.id}/edit`} className="ghost-button button-link">
                {t('common.update')}
              </Link>
              <button type="button" className="ghost-button" onClick={() => handleDelete(requirement.id)}>
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </PaginatedListCard>
    </div>
  );
}
