import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SearchableCombobox } from '../components/SearchableCombobox';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import {
  currencyOptions,
  operationTypeOptions,
  propertyTypeOptions,
  searchRequirementAgeRangeOptions,
  searchRequirementAmenityOptions,
  searchRequirementRoomTypeOptions,
  searchRequirementStatusOptions,
  useI18n,
} from '../lib/i18n';
import {
  translateRequirementAgeRange,
  translateRequirementAmenity,
  translateRequirementRoomType,
} from '../lib/requirements';
import type {
  Contact,
  CurrencyType,
  OperationType,
  Paginated,
  Property,
  PropertyType,
  SearchRequirement,
  SearchRequirementAgeRange,
  SearchRequirementAmenity,
  SearchRequirementRoomType,
  SearchRequirementStatus,
} from '../types';

type RequirementFormState = {
  contactId: string;
  operationType: OperationType;
  propertyType: PropertyType;
  selectedPropertyId: string;
  neighborhoods: string;
  minPrice: string;
  maxPrice: string;
  currency: CurrencyType;
  minRooms: string;
  minBedrooms: string;
  minBathrooms: string;
  needsParking: boolean;
  creditEligible: boolean;
  professionalUse: boolean;
  accessible: boolean;
  bright: boolean;
  amenities: SearchRequirementAmenity[];
  roomTypes: SearchRequirementRoomType[];
  ageRange: SearchRequirementAgeRange | '';
  notes: string;
  status: SearchRequirementStatus;
};

const initialForm: RequirementFormState = {
  contactId: '',
  operationType: 'BUY',
  propertyType: 'APARTMENT',
  selectedPropertyId: '',
  neighborhoods: '',
  minPrice: '',
  maxPrice: '',
  currency: 'USD',
  minRooms: '',
  minBedrooms: '',
  minBathrooms: '',
  needsParking: false,
  creditEligible: false,
  professionalUse: false,
  accessible: false,
  bright: false,
  amenities: [],
  roomTypes: [],
  ageRange: '',
  notes: '',
  status: 'ACTIVE',
};

function toggleOption<T extends string>(currentValues: T[], value: T) {
  return currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value];
}

export function SearchRequirementCreatePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactMatches, setContactMatches] = useState<Contact[] | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState<RequirementFormState>(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));

  const requirementId = id ? Number(id) : null;
  const isEditing = Boolean(requirementId);
  const initialContactId = searchParams.get('contactId') ?? '';
  const contactSearchTerm = contactSearch.trim();

  useEffect(() => {
    async function loadDependencies() {
      setError('');

      try {
        const [contactsData, propertiesData, requirementData] = await Promise.all([
          apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100&sortBy=DISPLAY_NAME&sortDirection=ASC'),
          apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
          isEditing && requirementId
            ? apiRequest<SearchRequirement>(`/search-requirements/${requirementId}`)
            : Promise.resolve(null),
        ]);

        setContacts(
          mergeContacts(contactsData.items, requirementData?.contact ? [requirementData.contact] : []),
        );
        setProperties(propertiesData.items);

        if (requirementData) {
          setForm({
            contactId: String(requirementData.contactId),
            operationType: requirementData.operationType,
            propertyType: requirementData.propertyType,
            selectedPropertyId: requirementData.propertyId ? String(requirementData.propertyId) : '',
            neighborhoods: requirementData.neighborhoods.join(', '),
            minPrice: requirementData.minPrice ? String(requirementData.minPrice) : '',
            maxPrice: requirementData.maxPrice ? String(requirementData.maxPrice) : '',
            currency: requirementData.currency,
            minRooms: requirementData.minRooms ? String(requirementData.minRooms) : '',
            minBedrooms: requirementData.minBedrooms ? String(requirementData.minBedrooms) : '',
            minBathrooms: requirementData.minBathrooms ? String(requirementData.minBathrooms) : '',
            needsParking: requirementData.needsParking,
            creditEligible: requirementData.creditEligible,
            professionalUse: requirementData.professionalUse,
            accessible: requirementData.accessible,
            bright: requirementData.bright,
            amenities: requirementData.amenities,
            roomTypes: requirementData.roomTypes,
            ageRange: requirementData.ageRange ?? '',
            notes: requirementData.notes ?? '',
            status: requirementData.status,
          });
        } else if (initialContactId) {
          setForm((current) => ({
            ...current,
            contactId: initialContactId,
          }));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el requerimiento');
      } finally {
        setLoading(false);
      }
    }

    void loadDependencies();
  }, [initialContactId, isEditing, requirementId]);

  useEffect(() => {
    if (!contactSearchTerm) {
      setContactMatches(null);
      setContactsLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setContactsLoading(true);
      void apiRequest<Paginated<Contact>>(
        `/contacts?page=1&limit=100&sortBy=DISPLAY_NAME&sortDirection=ASC&search=${encodeURIComponent(contactSearchTerm)}`,
      )
        .then((contactsData) => {
          if (cancelled) {
            return;
          }

          setContactMatches(contactsData.items);
          setContacts((current) => mergeContacts(current, contactsData.items));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setContactMatches([]);
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setContactsLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [contactSearchTerm]);

  const selectedProperty =
    properties.find((property) => String(property.id) === form.selectedPropertyId) ?? null;
  const isSaleRequirement = form.operationType === 'SALE';
  const usingExistingProperty = isSaleRequirement && Boolean(selectedProperty);
  const selectedContact = contacts.find((contact) => String(contact.id) === form.contactId) ?? null;
  const visibleContacts = mergeContacts(
    contactSearchTerm ? contactMatches ?? [] : contacts,
    selectedContact ? [selectedContact] : [],
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      await apiRequest(
        isEditing && requirementId
          ? `/search-requirements/${requirementId}`
          : '/search-requirements',
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: JSON.stringify({
            contactId: Number(form.contactId),
            propertyId: usingExistingProperty ? Number(form.selectedPropertyId) : undefined,
            operationType: form.operationType,
            propertyType: form.propertyType,
            neighborhoods: form.neighborhoods
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
            minPrice: form.minPrice ? Number(form.minPrice) : undefined,
            maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
            currency: form.currency,
            minRooms: form.minRooms ? Number(form.minRooms) : undefined,
            minBedrooms: form.minBedrooms ? Number(form.minBedrooms) : undefined,
            minBathrooms: form.minBathrooms ? Number(form.minBathrooms) : undefined,
            needsParking: form.needsParking,
            creditEligible: form.creditEligible,
            professionalUse: form.professionalUse,
            accessible: form.accessible,
            bright: form.bright,
            amenities: form.amenities,
            roomTypes: form.roomTypes,
            ageRange: form.ageRange || undefined,
            notes: form.notes || undefined,
            status: form.status,
          }),
        },
      );

      navigate('/requirements');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el requerimiento');
    }
  }

  function handleOperationTypeChange(nextOperationType: OperationType) {
    setForm((current) => ({
      ...current,
      operationType: nextOperationType,
      selectedPropertyId: nextOperationType === 'SALE' ? current.selectedPropertyId : '',
    }));
  }

  function handlePropertyChange(nextPropertyId: string) {
    const property = properties.find((item) => String(item.id) === nextPropertyId);
    setForm((current) => ({
      ...current,
      selectedPropertyId: nextPropertyId,
      propertyType: property?.propertyType ?? current.propertyType,
      neighborhoods: property?.neighborhood ?? current.neighborhoods,
    }));
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('requirements.eyebrow')}
        title={isEditing ? t('requirements.editRequirement') : t('requirements.newRequirement')}
        actions={
          <>
            {isEditing && form.operationType === 'BUY' ? (
              <>
                <Link
                  to={`/requirements/${requirementId}/manage`}
                  className="ghost-button button-link"
                >
                  {t('requirements.manageRequirement')}
                </Link>
                <Link
                  to={`/requirements/${requirementId}/suggestions`}
                  className="ghost-button button-link"
                >
                  Buscar en portales
                </Link>
              </>
            ) : null}
            <Link to="/requirements" className="ghost-button button-link">
              {t('requirements.backToList')}
            </Link>
          </>
        }
      />

      {error ? <div className="card">{error}</div> : null}

      {loading ? (
        <section className="card">
          <p>{t('common.loading')}</p>
        </section>
      ) : (
        <section className="card">
          <form className="form-grid" onSubmit={handleSave}>
            <label>
              {t('common.contact')}
              <SearchableCombobox
                value={form.contactId}
                options={visibleContacts.map((contact) => ({
                  value: String(contact.id),
                  label: contact.displayName,
                }))}
                searchValue={contactSearch}
                onSearchValueChange={setContactSearch}
                onChange={(value) =>
                  setForm((current) => ({ ...current, contactId: value }))
                }
                placeholder={t('contacts.searchPlaceholder')}
                emptyLabel={t('common.select')}
                loadingLabel={t('common.loading')}
                noResultsLabel={t('common.noData')}
                required
                loading={contactsLoading}
              />
            </label>
            <label>
              {t('common.operation')}
              <select
                value={form.operationType}
                onChange={(event) => handleOperationTypeChange(event.target.value as OperationType)}
              >
                {operationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('operationType', option)}
                  </option>
                ))}
              </select>
            </label>
            {isSaleRequirement ? (
              <div className="full-span stack-gap">
                <label>
                  {t('common.property')}
                  <select
                    value={form.selectedPropertyId}
                    onChange={(event) => handlePropertyChange(event.target.value)}
                  >
                    <option value="">{t('common.select')}</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedProperty ? (
                  <p className="muted">
                    {t('common.type')}: {translateEnum('propertyType', selectedProperty.propertyType)} -{' '}
                    {t('common.neighborhood')}: {selectedProperty.neighborhood ?? t('common.noData')}
                  </p>
                ) : null}
              </div>
            ) : null}
            <label>
              {t('common.type')}
              <select
                value={form.propertyType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    propertyType: event.target.value as PropertyType,
                  }))
                }
                disabled={usingExistingProperty}
              >
                {propertyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('propertyType', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('requirements.neighborhoods')}
              <input
                value={form.neighborhoods}
                onChange={(event) =>
                  setForm((current) => ({ ...current, neighborhoods: event.target.value }))
                }
                placeholder="Caballito, Almagro"
                disabled={usingExistingProperty}
              />
            </label>
            <label>
              {t('requirements.minPrice')}
              <input
                value={form.minPrice}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minPrice: event.target.value }))
                }
              />
            </label>
            <label>
              {t('requirements.maxPrice')}
              <input
                value={form.maxPrice}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxPrice: event.target.value }))
                }
              />
            </label>
            <label>
              {t('common.currency')}
              <select
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency: event.target.value as CurrencyType,
                  }))
                }
              >
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('currency', option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('requirements.minRooms')}
              <input
                value={form.minRooms}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minRooms: event.target.value }))
                }
              />
            </label>
            <label>
              {t('requirements.minBedrooms')}
              <input
                value={form.minBedrooms}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minBedrooms: event.target.value }))
                }
              />
            </label>
            <label>
              {t('requirements.minBathrooms')}
              <input
                value={form.minBathrooms}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minBathrooms: event.target.value }))
                }
              />
            </label>

            <div className="full-span requirement-section">
              <span className="field-label requirement-section-title">
                {t('requirements.propertyFeaturesTitle')}
              </span>
              <div className="checkbox-grid">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.creditEligible}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        creditEligible: event.target.checked,
                      }))
                    }
                  />
                  <span>{t('requirements.creditEligible')}</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.professionalUse}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        professionalUse: event.target.checked,
                      }))
                    }
                  />
                  <span>{t('requirements.professionalUse')}</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.accessible}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, accessible: event.target.checked }))
                    }
                  />
                  <span>{t('requirements.accessible')}</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.bright}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, bright: event.target.checked }))
                    }
                  />
                  <span>{t('requirements.bright')}</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.needsParking}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        needsParking: event.target.checked,
                      }))
                    }
                  />
                  <span>{t('requirements.needsParking')}</span>
                </label>
              </div>
            </div>

            <div className="full-span requirement-section">
              <span className="field-label requirement-section-title">
                {t('requirements.amenitiesTitle')}
              </span>
              <div className="checkbox-grid">
                {searchRequirementAmenityOptions.map((option) => (
                  <label key={option} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.amenities.includes(option)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          amenities: toggleOption(current.amenities, option),
                        }))
                      }
                    />
                    <span>{translateRequirementAmenity(option, t)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="full-span requirement-section">
              <span className="field-label requirement-section-title">
                {t('requirements.roomTypesTitle')}
              </span>
              <div className="checkbox-grid">
                {searchRequirementRoomTypeOptions.map((option) => (
                  <label key={option} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.roomTypes.includes(option)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          roomTypes: toggleOption(current.roomTypes, option),
                        }))
                      }
                    />
                    <span>{translateRequirementRoomType(option, t)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="full-span requirement-section">
              <span className="field-label requirement-section-title">
                {t('requirements.ageRangeTitle')}
              </span>
              <div className="radio-stack">
                {searchRequirementAgeRangeOptions.map((option) => (
                  <label key={option} className="checkbox-item radio-item">
                    <input
                      type="radio"
                      name="ageRange"
                      checked={form.ageRange === option}
                      onChange={() => setForm((current) => ({ ...current, ageRange: option }))}
                    />
                    <span>{translateRequirementAgeRange(option, t)}</span>
                  </label>
                ))}
                <button
                  type="button"
                  className="ghost-button requirement-clear-button"
                  onClick={() => setForm((current) => ({ ...current, ageRange: '' }))}
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>

            <label>
              {t('common.status')}
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as SearchRequirementStatus,
                  }))
                }
              >
                {searchRequirementStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEnum('searchRequirementStatus', option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              {t('common.notes')}
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
              />
            </label>
            <button type="submit" className="full-span">
              {t('requirements.save')}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function mergeContacts(...groups: Array<Contact[] | null | undefined>) {
  const uniqueContacts = new Map<number, Contact>();

  groups.forEach((group) => {
    group?.forEach((contact) => {
      uniqueContacts.set(contact.id, contact);
    });
  });

  return Array.from(uniqueContacts.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'es', { sensitivity: 'base' }),
  );
}
