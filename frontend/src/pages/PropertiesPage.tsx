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

  async function handleCopyPublicationUrl(property: Property) {
    if (!property.publicationUrl?.trim()) {
      return;
    }

    await navigator.clipboard.writeText(property.publicationUrl.trim());
    window.alert(t('common.copySuccess'));
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
            <div className="candidate-actions contact-row-actions">
              <Link
                to={`/properties/${property.id}`}
                className="ghost-button button-link action-icon-button"
                aria-label={t('properties.editProperty')}
                title={t('properties.editProperty')}
              >
                <EditIcon />
              </Link>
              <button
                type="button"
                className="ghost-button action-icon-button"
                onClick={() => void handleCopyPublicationUrl(property)}
                disabled={!property.publicationUrl?.trim()}
                aria-label={t('properties.copyPublicationUrl')}
                title={
                  property.publicationUrl?.trim()
                    ? t('properties.copyPublicationUrl')
                    : t('properties.noPublicationUrl')
                }
              >
                <LinkIcon />
              </button>
              <button
                type="button"
                className="ghost-button action-icon-button"
                onClick={() => void handleDelete(property.id)}
                aria-label={t('common.delete')}
                title={t('common.delete')}
              >
                <DeleteIcon />
              </button>
            </div>
          </article>
        ))}
      </PaginatedListCard>
    </div>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m12 6 4 4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
      <path d="M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 0 1-7-7L7 11" />
      <path d="M8 12h8" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M8 7l1 13h6l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
