import { useEffect, useState } from 'react';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest, getApiUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import type {
  Contact,
  DocumentTemplate,
  DocumentTemplateFieldDefinition,
  DocumentTemplatePresetKey,
  Paginated,
  Property,
} from '../types';

type TemplateDraft = {
  name: string;
  description: string;
  presetKey: DocumentTemplatePresetKey;
  fieldDefinitionsJson: string;
  sourceFile: File | null;
};

const availableVariableKeys = [
  'contact_first_name',
  'contact_last_name',
  'contact_display_name',
  'contact_phone',
  'contact_whatsapp',
  'contact_email',
  'contact_document_number',
  'property_title',
  'property_address',
  'property_city',
  'property_neighborhood',
  'property_price',
  'property_currency',
  'property_floor',
  'property_owner_name',
  'owner_full_name',
  'owner_document_number',
  'owner_address',
  'publication_price_words',
  'publication_price_numeric',
  'advisor_name',
  'coowner_name',
  'coowner_document_number',
  'signature_day',
  'signature_month',
  'signature_year',
  'current_day',
  'current_month',
  'current_year',
  'current_user_name',
];

function createDefaultDraft(): TemplateDraft {
  return {
    name: '',
    description: '',
    presetKey: 'EXCLUSIVE_SALE_AUTHORIZATION',
    fieldDefinitionsJson: '[]',
    sourceFile: null,
  };
}

export function DocumentsPage() {
  const { token } = useAuth();
  const { formatDateTime, t } = useI18n();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(createDefaultDraft);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<'pdf' | 'docx' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setSelectedTemplateId((current) => {
      if (current && templates.some((template) => template.id === current)) {
        return current;
      }

      return templates[0]?.id ?? null;
    });
  }, [templates]);

  useEffect(() => {
    if (!selectedTemplate) {
      setManualFields({});
      return;
    }

    setManualFields((current) => syncManualFields(current, selectedTemplate.fieldDefinitions));
  }, [selectedTemplate]);

  async function loadData(preferredTemplateId?: number) {
    setLoading(true);
    setError('');

    try {
      const [templatesResponse, contactsResponse, propertiesResponse] = await Promise.all([
        apiRequest<DocumentTemplate[]>('/document-templates'),
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100'),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
      ]);

      setTemplates(templatesResponse);
      setContacts(contactsResponse.items);
      setProperties(propertiesResponse.items);

      if (preferredTemplateId) {
        setSelectedTemplateId(preferredTemplateId);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t('documents.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }

  function updateTemplateDraft(patch: Partial<TemplateDraft>) {
    setTemplateDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handlePresetChange(nextPresetKey: DocumentTemplatePresetKey) {
    setTemplateDraft((current) => ({
      ...current,
      presetKey: nextPresetKey,
    }));
  }

  function updateManualField(key: string, value: string) {
    setManualFields((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (!templateDraft.name.trim()) {
        throw new Error(t('documents.nameRequired'));
      }

      if (
        templateDraft.presetKey === 'CUSTOM' &&
        templateDraft.fieldDefinitionsJson.trim()
      ) {
        JSON.parse(templateDraft.fieldDefinitionsJson);
      }

      if (templateDraft.presetKey === 'CUSTOM' && !templateDraft.sourceFile) {
        throw new Error(t('documents.templateFileRequired'));
      }

      const formData = new FormData();
      formData.set('name', templateDraft.name.trim());
      if (templateDraft.description.trim()) {
        formData.set('description', templateDraft.description.trim());
      }
      formData.set('presetKey', templateDraft.presetKey);
      if (templateDraft.presetKey === 'CUSTOM') {
        formData.set(
          'fieldDefinitionsJson',
          templateDraft.fieldDefinitionsJson.trim() || '[]',
        );
      }
      if (templateDraft.sourceFile) {
        formData.set('templateFile', templateDraft.sourceFile);
      }

      const response = await fetch(`${getApiUrl()}/document-templates`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const createdTemplate = (await response.json()) as DocumentTemplate;

      setTemplateDraft(createDefaultDraft());
      setIsCreateOpen(false);
      setNotice(t('documents.templateSaved'));
      await loadData(createdTemplate.id);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t('documents.saveError'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(templateId: number) {
    if (!window.confirm(t('documents.confirmDelete'))) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/document-templates/${templateId}`, {
        method: 'DELETE',
      });
      setNotice(t('documents.templateDeleted'));
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : t('documents.deleteError'),
      );
    }
  }

  async function handleGenerateDocument(format: 'pdf' | 'docx') {
    setGeneratingFormat(format);
    setError('');
    setNotice('');

    try {
      if (!token) {
        throw new Error('Sesion expirada');
      }

      if (!selectedTemplate) {
        throw new Error(t('documents.selectTemplateFirst'));
      }

      if (
        selectedTemplate.presetKey === 'EXCLUSIVE_SALE_AUTHORIZATION' &&
        !selectedPropertyId
      ) {
        throw new Error(t('documents.propertyRequired'));
      }

      const missingRequiredFields = selectedTemplate.fieldDefinitions.filter(
        (field) => field.required && !String(manualFields[field.key] ?? '').trim(),
      );

      if (missingRequiredFields.length > 0) {
        throw new Error(
          `${t('documents.missingFields')}: ${missingRequiredFields
            .map((field) => field.label)
            .join(', ')}`,
        );
      }

      const response = await fetch(
        `${getApiUrl()}/document-templates/${selectedTemplate.id}/generate-${format}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactId: selectedContactId ? Number(selectedContactId) : undefined,
            propertyId: selectedPropertyId ? Number(selectedPropertyId) : undefined,
            manualFields: buildManualFieldsPayload(manualFields),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        extractFileName(response.headers.get('content-disposition')) ??
          `${sanitizeDownloadName(selectedTemplate.name)}.${format}`,
      );
      setNotice(
        format === 'pdf'
          ? t('documents.pdfGenerated')
          : t('documents.docxGenerated'),
      );
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : t('documents.generateError'),
      );
    } finally {
      setGeneratingFormat(null);
    }
  }

  function handleCloseCreateForm() {
    setTemplateDraft(createDefaultDraft());
    setIsCreateOpen(false);
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('documents.eyebrow')}
        title={t('documents.title')}
        actions={
          isCreateOpen ? (
            <button
              type="button"
              className="ghost-button"
              onClick={handleCloseCreateForm}
            >
              {t('documents.closeForm')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTemplateDraft(createDefaultDraft());
                setIsCreateOpen(true);
              }}
            >
              {t('documents.newTemplate')}
            </button>
          )
        }
      />

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}

      {isCreateOpen ? (
        <section className="card">
          <h3>{t('documents.newTemplate')}</h3>
          <p className="muted">{t('documents.subtitle')}</p>

          <form className="form-grid" onSubmit={handleSaveTemplate}>
            <label>
              {t('documents.templateName')}
              <input
                value={templateDraft.name}
                onChange={(event) => updateTemplateDraft({ name: event.target.value })}
                placeholder={t('documents.templateNamePlaceholder')}
              />
            </label>

            <label>
              {t('documents.preset')}
              <select
                value={templateDraft.presetKey}
                onChange={(event) =>
                  handlePresetChange(event.target.value as DocumentTemplatePresetKey)
                }
              >
                <option value="EXCLUSIVE_SALE_AUTHORIZATION">
                  {t('documents.presetExclusiveSale')}
                </option>
                <option value="CUSTOM">{t('documents.presetCustom')}</option>
              </select>
            </label>

            <label className="full-span">
              {t('common.description')}
              <textarea
                rows={3}
                value={templateDraft.description}
                onChange={(event) =>
                  updateTemplateDraft({ description: event.target.value })
                }
              />
            </label>

            <label className="full-span">
              {t('documents.templateFile')}
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) =>
                  updateTemplateDraft({
                    sourceFile: event.target.files?.[0] ?? null,
                  })
                }
              />
              <p className="muted">{t('documents.templateFileHint')}</p>
              {templateDraft.sourceFile ? (
                <p className="muted">
                  {t('documents.templateFileSelected')}: {templateDraft.sourceFile.name}
                </p>
              ) : null}
            </label>

            {templateDraft.presetKey === 'CUSTOM' ? (
              <>
                <label className="full-span">
                  {t('documents.customFieldDefinitions')}
                  <textarea
                    rows={8}
                    value={templateDraft.fieldDefinitionsJson}
                    onChange={(event) =>
                      updateTemplateDraft({
                        fieldDefinitionsJson: event.target.value,
                      })
                    }
                    placeholder='[{"key":"owner_name","label":"Nombre del titular","type":"text","required":true}]'
                  />
                </label>
                <p className="muted full-span">
                  {t('documents.customFieldDefinitionsHint')}
                </p>
              </>
            ) : (
              <p className="muted full-span">
                {t('documents.exclusiveSaleHint')}
              </p>
            )}

            <div className="full-span stack-gap">
              <div>
                <strong>{t('documents.availableVariablesTitle')}</strong>
                <p className="muted">{t('documents.availableVariablesHint')}</p>
              </div>
              <p className="muted">
                {availableVariableKeys.map((key) => `{{${key}}}`).join(' · ')}
              </p>
            </div>

            <div className="full-span candidate-actions">
              <button type="submit" disabled={saving}>
                {saving ? t('common.loading') : t('documents.saveTemplate')}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleCloseCreateForm}
              >
                {t('documents.closeForm')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="two-column">
        <section className="card">
          <h3>{t('documents.templatesTitle')}</h3>

          {loading ? <p className="muted">{t('common.loading')}</p> : null}
          {!loading && templates.length === 0 ? (
            <p className="muted">{t('documents.noTemplates')}</p>
          ) : null}

          <div className="stack-gap">
            {templates.map((template) => (
              <article key={template.id} className="list-item">
                <div className="list-item-actions">
                  <div>
                    <strong>{template.name}</strong>
                    <p className="muted">{getPresetLabel(template.presetKey, t)}</p>
                    <p className="muted">
                      {template.sourceFileName
                        ? `${t('documents.sourceDocx')}: ${template.sourceFileName}`
                        : t('documents.sourceInternalModel')}
                    </p>
                    {template.description ? (
                      <p className="muted">{template.description}</p>
                    ) : null}
                    <div className="pill-row">
                      <span
                        className={
                          template.id === selectedTemplateId
                            ? 'pill pill-active'
                            : 'pill'
                        }
                      >
                        {template.id === selectedTemplateId
                          ? t('documents.selected')
                          : t('documents.available')}
                      </span>
                      <span className="pill">
                        {template.fieldDefinitions.length} {t('documents.manualFieldsCount')}
                      </span>
                    </div>
                    <p className="muted">
                      {t('documents.updatedAt')}: {formatDateTime(template.updatedAt)}
                    </p>
                  </div>

                  <div className="candidate-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      {t('documents.useTemplate')}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleDeleteTemplate(template.id)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>{t('documents.generateTitle')}</h3>
          <p className="muted">{t('documents.generateHint')}</p>

          {!selectedTemplate ? (
            <p className="muted">{t('documents.selectTemplateFirst')}</p>
          ) : (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void handleGenerateDocument('pdf');
              }}
            >
              <label className="full-span">
                {t('documents.selectTemplate')}
                <select
                  value={selectedTemplateId ?? ''}
                  onChange={(event) => setSelectedTemplateId(Number(event.target.value))}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('documents.contactOptional')}
                <select
                  value={selectedContactId}
                  onChange={(event) => setSelectedContactId(event.target.value)}
                >
                  <option value="">{t('documents.noContactSelected')}</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('documents.propertyOptional')}
                <select
                  value={selectedPropertyId}
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                >
                  <option value="">{t('documents.noPropertySelected')}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </label>

              {selectedTemplate.presetKey === 'EXCLUSIVE_SALE_AUTHORIZATION' ? (
                <p className="muted full-span">{t('documents.propertyRequiredHint')}</p>
              ) : null}

              {selectedTemplate.sourceFileName ? (
                <p className="muted full-span">
                  {t('documents.generateDocxHint')}: {selectedTemplate.sourceFileName}
                </p>
              ) : (
                <p className="muted full-span">{t('documents.generatePdfFallbackHint')}</p>
              )}

              {selectedTemplate.fieldDefinitions.map((field) => (
                <DocumentFieldInput
                  key={field.key}
                  field={field}
                  value={manualFields[field.key] ?? ''}
                  onChange={(value) => updateManualField(field.key, value)}
                />
              ))}

              {selectedTemplate.fieldDefinitions.length === 0 ? (
                <p className="muted full-span">{t('documents.noManualFields')}</p>
              ) : null}

              <div className="full-span candidate-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={generatingFormat !== null || !selectedTemplate.sourceFileName}
                  onClick={() => void handleGenerateDocument('docx')}
                >
                  {generatingFormat === 'docx'
                    ? t('common.loading')
                    : t('documents.generateDocx')}
                </button>
                <button type="submit" disabled={generatingFormat !== null}>
                  {generatingFormat === 'pdf'
                    ? t('common.loading')
                    : t('documents.generatePdf')}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentFieldInput({
  field,
  value,
  onChange,
}: {
  field: DocumentTemplateFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const labelText = field.required ? `${field.label} *` : field.label;
  const className = field.type === 'textarea' ? 'full-span' : undefined;

  if (field.type === 'textarea') {
    return (
      <label className={className}>
        {labelText}
        <textarea
          rows={4}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.helpText ? <p className="muted">{field.helpText}</p> : null}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className={className}>
        {labelText}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">-</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.helpText ? <p className="muted">{field.helpText}</p> : null}
      </label>
    );
  }

  return (
    <label className={className}>
      {labelText}
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.helpText ? <p className="muted">{field.helpText}</p> : null}
    </label>
  );
}

function syncManualFields(
  current: Record<string, string>,
  fields: DocumentTemplateFieldDefinition[],
) {
  return Object.fromEntries(
    fields.map((field) => [field.key, current[field.key] ?? '']),
  );
}

function buildManualFieldsPayload(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value !== ''),
  );
}

function getPresetLabel(
  presetKey: DocumentTemplatePresetKey,
  t: (path: string) => string,
) {
  return presetKey === 'EXCLUSIVE_SALE_AUTHORIZATION'
    ? t('documents.presetExclusiveSale')
    : t('documents.presetCustom');
}

function buildDefaultHtmlTemplate(presetKey: DocumentTemplatePresetKey) {
  if (presetKey === 'EXCLUSIVE_SALE_AUTHORIZATION') {
    return `
<article class="document-shell">
  <header class="document-header">
    <p class="document-kicker">Propia CRM</p>
    <h1 class="document-title">Autorizacion de venta exclusiva</h1>
  </header>

  <p>
    Entre <strong>{{owner_full_name}}</strong>, DNI <strong>{{owner_document_number}}</strong>,
    con domicilio en <strong>{{owner_address}}</strong>, en adelante la parte propietaria,
    y <strong>{{advisor_name}}</strong>, se acuerda la autorizacion de venta exclusiva del inmueble sito en
    <strong>{{property_address}}</strong>, piso <strong>{{property_floor}}</strong>, unidad
    <strong>{{property_unit}}</strong>.
  </p>

  <p>
    El precio de publicacion se fija en <strong>{{publication_price_words}}</strong>
    (<strong>{{publication_price_numeric}}</strong>).
  </p>

  <section class="document-section">
    <h2>Declaraciones</h2>
    <ul class="declaration-list">
      <li>Bien de familia: <strong>{{family_asset_choice}}</strong></li>
      <li>Donacion: <strong>{{donation_choice}}</strong></li>
      <li>Hipoteca sin levantamiento: <strong>{{mortgage_without_release_choice}}</strong></li>
      <li>Sucesion en tramite: <strong>{{succession_in_process_choice}}</strong></li>
      <li>Inmueble a construir: <strong>{{property_under_construction_choice}}</strong></li>
      <li>Apto credito: <strong>{{credit_eligible_choice}}</strong></li>
    </ul>
  </section>

  <section class="document-section">
    <h2>Observaciones</h2>
    <p>
      La comercializacion se realizara con caracter exclusivo durante el plazo y condiciones pactadas entre las partes.
      Toda informacion provista por la parte propietaria se considera declaracion jurada.
    </p>
  </section>

  <footer class="signature-block">
    <p>
      En conformidad, se firma a los <strong>{{signature_day}}</strong> dias del mes de
      <strong>{{signature_month}}</strong> de <strong>{{signature_year}}</strong>.
    </p>

    <div class="signature-grid">
      <div class="signature-card">
        <span class="signature-line"></span>
        <strong>{{owner_full_name}}</strong>
        <span>Propietario/a</span>
      </div>
      <div class="signature-card">
        <span class="signature-line"></span>
        <strong>{{coowner_name}}</strong>
        <span>Asentimiento / cotitular - DNI {{coowner_document_number}}</span>
      </div>
      <div class="signature-card">
        <span class="signature-line"></span>
        <strong>{{advisor_name}}</strong>
        <span>Agente asesor</span>
      </div>
    </div>
  </footer>
</article>`.trim();
  }

  return '<h1>{{contact_display_name}}</h1>';
}

async function readResponseError(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = payload?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  const fallback = (await response.text()).trim();
  return fallback || 'Request failed';
}

function extractFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const match = contentDisposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function sanitizeDownloadName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-');
}
