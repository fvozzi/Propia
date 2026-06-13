import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaginatedListCard } from '../components/PaginatedListCard';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { operationTypeOptions, propertyStatusOptions, propertyTypeOptions, useI18n } from '../lib/i18n';
import type { OperationType, Paginated, Property, PropertyStatus, PropertyType } from '../types';

type PropertyFilters = {
  status: '' | PropertyStatus;
  operationType: '' | OperationType;
  propertyType: '' | PropertyType;
  neighborhood: string;
};

export function PropertiesPage() {
  const { t, translateEnum } = useI18n();
  const [searchParams] = useSearchParams();
  const [response, setResponse] = useState<Paginated<Property> | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PropertyFilters>({
    status: (searchParams.get('status') as PropertyFilters['status']) ?? '',
    operationType: (searchParams.get('operationType') as PropertyFilters['operationType']) ?? '',
    propertyType: (searchParams.get('propertyType') as PropertyFilters['propertyType']) ?? '',
    neighborhood: searchParams.get('neighborhood') ?? '',
  });

  async function load(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), limit: '8' });

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const data = await apiRequest<Paginated<Property>>(`/properties?${params.toString()}`);
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
    if (!window.confirm(t('common.yesDeleteProperty'))) return;
    await apiRequest(`/properties/${id}`, { method: 'DELETE' });
    await load(page);
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('properties.eyebrow')}
        title={t('properties.title')}
        actions={
          <>
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value as PropertyFilters['status'] })}
          >
            <option value="">{t('properties.allStatuses')}</option>
            {propertyStatusOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('propertyStatus', option)}
              </option>
            ))}
          </select>
          <select
            value={filters.operationType}
            onChange={(event) =>
              setFilters({ ...filters, operationType: event.target.value as PropertyFilters['operationType'] })
            }
          >
            <option value="">{t('properties.allOperations')}</option>
            {operationTypeOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('operationType', option)}
              </option>
            ))}
          </select>
          <select
            value={filters.propertyType}
            onChange={(event) =>
              setFilters({ ...filters, propertyType: event.target.value as PropertyFilters['propertyType'] })
            }
          >
            <option value="">{t('common.type')}</option>
            {propertyTypeOptions.map((option) => (
              <option key={option} value={option}>
                {translateEnum('propertyType', option)}
              </option>
            ))}
          </select>
          <input
            placeholder={t('common.neighborhood')}
            value={filters.neighborhood}
            onChange={(event) => setFilters({ ...filters, neighborhood: event.target.value })}
          />
          <button type="button" onClick={handleApplyFilters}>
            {t('common.filter')}
          </button>
          <Link to="/properties/new" className="button-link">
            {t('properties.newProperty')}
          </Link>
          </>
        }
      />

      <PaginatedListCard
        title={t('properties.listTitle')}
        page={response?.meta.page ?? 1}
        totalPages={response?.meta.totalPages ?? 1}
        pageLabel={t('contacts.page')}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
        onPrevious={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      >
        {(response?.items ?? []).map((property) => (
          <article key={property.id} className="list-item list-item-actions">
            <div>
              <Link to={`/properties/${property.id}`}>{property.title}</Link>
              <p className="muted">
                {property.neighborhood} · {property.price ? `${property.currency} ${property.price}` : t('properties.noPrice')}
              </p>
              <StatusPill value={property.status} />
            </div>
            <button type="button" className="ghost-button" onClick={() => handleDelete(property.id)}>
              {t('common.delete')}
            </button>
          </article>
        ))}
      </PaginatedListCard>
    </div>
  );
}
