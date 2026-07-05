import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Docxtemplater from 'docxtemplater';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import PizZip from 'pizzip';
import { chromium } from 'playwright';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import {
  requireActiveTeamId,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { User } from '../auth/user.entity';
import { DocumentTemplatePresetKey } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { sanitizeDocxTemplateBuffer } from './docx-template-sanitizer';
import {
  DocumentTemplate,
  type DocumentTemplateFieldDefinition,
} from './document-template.entity';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { GenerateDocumentTemplateDto } from './dto/generate-document-template.dto';

const libreofficeConvert = require('libreoffice-convert') as {
  convert: (
    document: Buffer,
    format: string,
    filter: undefined,
    callback: (error: Error | null, done: Buffer) => void,
  ) => void;
};
const convertToBufferAsync = promisify(libreofficeConvert.convert);

@Injectable()
export class DocumentTemplatesService {
  constructor(
    @InjectRepository(DocumentTemplate)
    private readonly documentTemplatesRepository: Repository<DocumentTemplate>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const templates = await this.documentTemplatesRepository.find({
      where: { teamId },
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });

    return templates.map((template) => ({
      ...template,
      sourceFileName: template.sourceFileName
        ? normalizeUploadedFileName(template.sourceFileName)
        : null,
    }));
  }

  async create(
    dto: CreateDocumentTemplateDto,
    user: AuthenticatedUser,
    templateFile?: Express.Multer.File,
  ) {
    const teamId = requireActiveTeamId(user);
    const presetKey = dto.presetKey ?? DocumentTemplatePresetKey.CUSTOM;
    const fieldDefinitions = resolveFieldDefinitions(
      presetKey,
      dto.fieldDefinitionsJson,
    );
    const storedTemplateSource = templateFile
      ? await storeTemplateSourceFile(templateFile, teamId)
      : null;
    const htmlContent = storedTemplateSource
      ? null
      : resolveHtmlContent(presetKey, dto.htmlContent);

    const template = this.documentTemplatesRepository.create({
      teamId,
      ownerUserId: user.sub,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      presetKey,
      sourceFileName: storedTemplateSource?.sourceFileName ?? null,
      sourceFilePath: storedTemplateSource?.sourceFilePath ?? null,
      htmlContent,
      fieldDefinitions,
    });

    return this.documentTemplatesRepository.save(template);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const template = await this.requireScopedTemplate(id, user);
    await this.documentTemplatesRepository.remove(template);
    return { success: true };
  }

  async generatePdfBuffer(
    id: number,
    dto: GenerateDocumentTemplateDto,
    user: AuthenticatedUser,
  ) {
    const template = await this.requireScopedTemplate(id, user);
    const teamId = requireActiveTeamId(user);
    const [contact, property, ownerUser] = await Promise.all([
      dto.contactId
        ? this.contactsRepository.findOne({
            where: { id: dto.contactId, teamId },
          })
        : Promise.resolve(null),
      dto.propertyId
        ? this.propertiesRepository.findOne({
            where: { id: dto.propertyId, teamId },
            relations: { ownerContact: true },
          })
        : Promise.resolve(null),
      this.usersRepository.findOne({ where: { id: user.sub } }),
    ]);

    if (dto.contactId && !contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    if (dto.propertyId && !property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    if (
      template.presetKey === DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION &&
      !property
    ) {
      throw new BadRequestException(
        'Este template requiere seleccionar una propiedad',
      );
    }

    const variables = await this.buildTemplateVariables({
      template,
      contact,
      property,
      ownerUser,
      manualFields: dto.manualFields ?? {},
    });
    const fileBaseName = buildOutputFileBaseName(template.name, contact, property);
    const sourceDocx = await loadTemplateSourceDocx(template);

    if (sourceDocx) {
      const docxBuffer = renderDocxTemplate(sourceDocx, variables, template.presetKey);
      const pdfBuffer = await renderPdfFromDocx(docxBuffer);

      return {
        pdfBuffer,
        outputFileName: `${fileBaseName}.pdf`,
      };
    }

    const renderedHtml = renderTemplateHtml(
      template.htmlContent || buildDefaultTemplateHtml(template.presetKey),
      variables,
    );
    const printableHtml = wrapPrintableHtml(renderedHtml);
    const pdfBuffer = await renderPdfFromHtml(printableHtml);

    return {
      pdfBuffer,
      outputFileName: `${fileBaseName}.pdf`,
    };
  }

  async generateDocxBuffer(
    id: number,
    dto: GenerateDocumentTemplateDto,
    user: AuthenticatedUser,
  ) {
    const template = await this.requireScopedTemplate(id, user);
    const teamId = requireActiveTeamId(user);
    const [contact, property, ownerUser] = await Promise.all([
      dto.contactId
        ? this.contactsRepository.findOne({
            where: { id: dto.contactId, teamId },
          })
        : Promise.resolve(null),
      dto.propertyId
        ? this.propertiesRepository.findOne({
            where: { id: dto.propertyId, teamId },
            relations: { ownerContact: true },
          })
        : Promise.resolve(null),
      this.usersRepository.findOne({ where: { id: user.sub } }),
    ]);

    if (dto.contactId && !contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    if (dto.propertyId && !property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    if (
      template.presetKey === DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION &&
      !property
    ) {
      throw new BadRequestException(
        'Este template requiere seleccionar una propiedad',
      );
    }

    const sourceDocx = await loadTemplateSourceDocx(template);
    if (!sourceDocx) {
      throw new BadRequestException(
        'Este template no tiene un archivo .docx fuente. Sube el documento original para mantener el formato exacto.',
      );
    }

    const variables = await this.buildTemplateVariables({
      template,
      contact,
      property,
      ownerUser,
      manualFields: dto.manualFields ?? {},
    });
    const docxBuffer = renderDocxTemplate(sourceDocx, variables, template.presetKey);
    const fileBaseName = buildOutputFileBaseName(template.name, contact, property);

    return {
      docxBuffer,
      outputFileName: `${fileBaseName}.docx`,
    };
  }

  private async requireScopedTemplate(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const template = await this.documentTemplatesRepository.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException('Template de documento no encontrado');
    }

    return template;
  }

  private async buildTemplateVariables(input: {
    template: DocumentTemplate;
    contact: Contact | null;
    property: Property | null;
    ownerUser: User | null;
    manualFields: Record<string, unknown>;
  }) {
    const { contact, property, ownerUser, manualFields, template } = input;
    const signatureDate = parseDateInput(manualFields.signature_date);
    const ownerContact = property?.ownerContact ?? contact;
    const propertyAddressLabel = [property?.address, property?.city]
      .filter(Boolean)
      .join(', ');
    const baseVariables: Record<string, unknown> = {
      contact_first_name: contact?.firstName ?? '',
      contact_last_name: contact?.lastName ?? '',
      contact_display_name: contact?.displayName ?? '',
      contact_phone: contact?.phone ?? '',
      contact_whatsapp: contact?.whatsapp ?? '',
      contact_email: contact?.email ?? '',
      contact_document_number: contact?.documentNumber ?? '',
      property_title: property?.title ?? '',
      property_address: propertyAddressLabel,
      property_city: property?.city ?? '',
      property_neighborhood: property?.neighborhood ?? '',
      property_price:
        property?.price !== null && property?.price !== undefined
          ? String(property.price)
          : '',
      property_currency: property?.currency ?? '',
      property_floor:
        property?.floor !== null && property?.floor !== undefined
          ? String(property.floor)
          : '',
      property_type: property?.propertyType ?? '',
      property_operation_type: property?.operationType ?? '',
      property_owner_name:
        ownerContact?.displayName ?? '',
      current_day: String(new Date().getDate()).padStart(2, '0'),
      current_month: formatMonthName(new Date()),
      current_year: String(new Date().getFullYear()),
      current_user_name: ownerUser?.name ?? '',
      owner_full_name: ownerContact?.displayName ?? '',
      publication_price_numeric:
        property?.price !== null && property?.price !== undefined
          ? formatCurrencyNumber(property.price)
          : '',
      publication_price_words:
        property?.price !== null && property?.price !== undefined
          ? numberToSpanishWords(
              Math.round(property.price),
              property.currency === 'ARS' ? 'pesos' : 'dolares',
            )
          : '',
      family_asset_choice: '',
      donation_choice: '',
      mortgage_without_release_choice: '',
      succession_in_process_choice: '',
      property_under_construction_choice: '',
      credit_eligible_choice: '',
      advisor_name: '',
      coowner_name: '',
      coowner_document_number: '',
      owner_document_number: ownerContact?.documentNumber ?? '',
      owner_address: propertyAddressLabel,
      property_unit: '',
      signature_day: signatureDate
        ? String(signatureDate.getDate()).padStart(2, '0')
        : '',
      signature_month: signatureDate ? formatMonthName(signatureDate) : '',
      signature_year: signatureDate ? String(signatureDate.getFullYear()) : '',
      signature_date: signatureDate ? signatureDate.toISOString().slice(0, 10) : '',
    };

    if (
      template.presetKey ===
      DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION
    ) {
      baseVariables.family_asset_choice = normalizeChoice(
        manualFields.family_asset_choice,
      );
      baseVariables.donation_choice = normalizeChoice(
        manualFields.donation_choice,
      );
      baseVariables.mortgage_without_release_choice = normalizeChoice(
        manualFields.mortgage_without_release_choice,
      );
      baseVariables.succession_in_process_choice = normalizeChoice(
        manualFields.succession_in_process_choice,
      );
      baseVariables.property_under_construction_choice = normalizeChoice(
        manualFields.property_under_construction_choice,
      );
      baseVariables.credit_eligible_choice = normalizeChoice(
        manualFields.credit_eligible_choice,
      );
    }

    return {
      ...baseVariables,
      ...coerceManualFields(manualFields),
    };
  }
}

function resolveFieldDefinitions(
  presetKey: DocumentTemplatePresetKey,
  fieldDefinitionsJson?: string,
) {
  if (presetKey === DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION) {
    return buildExclusiveSaleFieldDefinitions();
  }

  if (!fieldDefinitionsJson?.trim()) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fieldDefinitionsJson);
  } catch {
    throw new BadRequestException(
      'fieldDefinitionsJson debe ser un JSON valido',
    );
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestException(
      'fieldDefinitionsJson debe ser un array de campos',
    );
  }

  return parsed as DocumentTemplateFieldDefinition[];
}

function resolveHtmlContent(
  presetKey: DocumentTemplatePresetKey,
  htmlContent?: string,
) {
  const nextHtmlContent = htmlContent?.trim();

  if (nextHtmlContent) {
    return nextHtmlContent;
  }

  if (presetKey === DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION) {
    return buildExclusiveSaleHtmlTemplate();
  }

  throw new BadRequestException('Debes definir el HTML del template');
}

function buildExclusiveSaleFieldDefinitions(): DocumentTemplateFieldDefinition[] {
  const yesNoOptions = [
    { label: 'Si', value: 'SI' },
    { label: 'No', value: 'NO' },
  ];

  return [
    {
      key: 'property_floor',
      label: 'Piso',
      type: 'text',
    },
    {
      key: 'property_unit',
      label: 'Departamento / unidad',
      type: 'text',
    },
    {
      key: 'publication_price_words',
      label: 'Precio en palabras',
      type: 'text',
      helpText:
        'Si lo dejas vacio, se completa con el precio de la propiedad cuando exista.',
    },
    {
      key: 'publication_price_numeric',
      label: 'Precio numerico',
      type: 'text',
      helpText:
        'Si lo dejas vacio, se completa con el precio de la propiedad cuando exista.',
    },
    {
      key: 'family_asset_choice',
      label: 'Bien de familia',
      type: 'select',
      options: yesNoOptions,
    },
    {
      key: 'donation_choice',
      label: 'Donacion',
      type: 'select',
      options: yesNoOptions,
    },
    {
      key: 'mortgage_without_release_choice',
      label: 'Hipoteca sin levantamiento',
      type: 'select',
      options: yesNoOptions,
    },
    {
      key: 'succession_in_process_choice',
      label: 'Sucesion en tramite',
      type: 'select',
      options: yesNoOptions,
    },
    {
      key: 'property_under_construction_choice',
      label: 'Inmueble a construir',
      type: 'select',
      options: yesNoOptions,
    },
    {
      key: 'credit_eligible_choice',
      label: 'Apto credito',
      type: 'select',
      options: yesNoOptions,
    },
    {
      key: 'advisor_name',
      label: 'Nombre del agente asesor',
      type: 'text',
    },
    {
      key: 'coowner_name',
      label: 'Nombre del asentimiento / cotitular',
      type: 'text',
    },
    {
      key: 'coowner_document_number',
      label: 'DNI del asentimiento / cotitular',
      type: 'text',
    },
    {
      key: 'signature_date',
      label: 'Fecha de firma',
      type: 'date',
      required: true,
    },
  ];
}

function buildDefaultTemplateHtml(presetKey: DocumentTemplatePresetKey) {
  if (presetKey === DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION) {
    return buildExclusiveSaleHtmlTemplate();
  }

  return '<h1>{{contact_display_name}}</h1>';
}

function buildExclusiveSaleHtmlTemplate() {
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
          La comercializacion se realizara con caracter exclusivo durante el plazo y
          condiciones pactadas entre las partes. Toda informacion provista por la parte
          propietaria se considera declaracion jurada.
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
    </article>
  `.trim();
}

async function loadTemplateSourceDocx(template: DocumentTemplate) {
  if (!template.sourceFilePath?.trim()) {
    return null;
  }

  try {
    return await readFile(template.sourceFilePath);
  } catch {
    throw new NotFoundException(
      'No se encontro el archivo .docx fuente de este template',
    );
  }
}

async function storeTemplateSourceFile(
  templateFile: Express.Multer.File,
  teamId: number,
) {
  const normalizedOriginalName = normalizeUploadedFileName(templateFile.originalname);

  if (!normalizedOriginalName.toLowerCase().endsWith('.docx')) {
    throw new BadRequestException('Solo se permiten archivos .docx');
  }

  if (!templateFile.buffer?.length) {
    throw new BadRequestException('El archivo .docx esta vacio');
  }

  const templateDir = join(
    process.cwd(),
    'storage',
    'document-templates',
    `team-${teamId}`,
  );
  const fileBaseName = sanitizeFileName(normalizedOriginalName);
  const fileName = `${Date.now()}-${fileBaseName}.docx`;
  const absolutePath = join(templateDir, fileName);

  await mkdir(templateDir, { recursive: true });
  await writeFile(absolutePath, templateFile.buffer);

  return {
    sourceFileName: normalizedOriginalName,
    sourceFilePath: absolutePath,
  };
}

function renderTemplateHtml(
  templateHtml: string,
  variables: Record<string, unknown>,
) {
  return templateHtml.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
    formatTemplateValue(variables[key]),
  );
}

function formatTemplateValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return escapeHtml(String(value)).replace(/\r?\n/g, '<br />');
}

function wrapPrintableHtml(content: string) {
  if (/<html[\s>]/i.test(content)) {
    return content;
  }

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Documento</title>
      <style>
        @page {
          size: A4;
          margin: 16mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          color: #1d2328;
          font-family: "Segoe UI", Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.55;
          background: white;
        }

        .document-shell {
          display: grid;
          gap: 16px;
        }

        .document-header {
          border-bottom: 1px solid #d8d8d8;
          padding-bottom: 12px;
        }

        .document-kicker {
          margin: 0 0 4px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 9pt;
          color: #8d3710;
        }

        .document-title {
          margin: 0;
          font-size: 22pt;
          line-height: 1.15;
        }

        .document-section {
          display: grid;
          gap: 8px;
        }

        .document-section h2 {
          margin: 0;
          font-size: 13pt;
        }

        p {
          margin: 0;
        }

        .declaration-list {
          margin: 0;
          padding-left: 20px;
          display: grid;
          gap: 6px;
        }

        .signature-block {
          display: grid;
          gap: 24px;
          margin-top: 20px;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .signature-card {
          display: grid;
          gap: 8px;
          text-align: center;
          font-size: 10pt;
        }

        .signature-line {
          display: block;
          border-top: 1px solid #1d2328;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
  </html>`;
}

function renderDocxTemplate(
  sourceBuffer: Buffer,
  variables: Record<string, unknown>,
  presetKey?: DocumentTemplatePresetKey,
) {
  try {
    const zip = new PizZip(sanitizeDocxTemplateBuffer(sourceBuffer, presetKey));
    const document = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
      nullGetter() {
        return '';
      },
    });

    document.render(variables);
    return document.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  } catch (error) {
    throw new BadRequestException(
      `No se pudo completar el template .docx. Revisa placeholders y formato del documento. ${extractErrorMessage(
        error,
      )}`.trim(),
    );
  }
}

async function renderPdfFromDocx(docxBuffer: Buffer) {
  try {
    return Buffer.from(await convertToBufferAsync(docxBuffer, '.pdf', undefined));
  } catch (error) {
    throw new BadRequestException(
      `No se pudo convertir el .docx a PDF. Instala LibreOffice en el servidor para habilitar esta salida. ${extractErrorMessage(
        error,
      )}`.trim(),
    );
  }
}

async function renderPdfFromHtml(html: string) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    return Buffer.from(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '14mm',
          bottom: '16mm',
          left: '14mm',
        },
      }),
    );
  } catch (error) {
    throw new BadRequestException(
      `No se pudo generar el PDF. Verifica Playwright/Chromium. ${String(
        error ?? '',
      )}`.trim(),
    );
  } finally {
    await browser?.close().catch(() => {});
  }
}

function extractErrorMessage(error: unknown) {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    const detailedMessage = extractDocxTemplateErrorDetails(error);
    if (detailedMessage) {
      return detailedMessage;
    }

    return error.message;
  }

  return String(error);
}

function extractDocxTemplateErrorDetails(error: Error) {
  const details = (error as Error & { properties?: { errors?: unknown[] } }).properties?.errors;
  if (!Array.isArray(details) || details.length === 0) {
    return '';
  }

  const explanations = details
    .map((detail) => {
      if (!detail || typeof detail !== 'object') {
        return null;
      }

      const properties = (detail as { properties?: { explanation?: unknown; context?: unknown } }).properties;
      const explanation =
        typeof properties?.explanation === 'string' ? properties.explanation.trim() : '';
      const context = typeof properties?.context === 'string' ? properties.context.trim() : '';

      if (!explanation) {
        return null;
      }

      return context ? `${explanation} (${context})` : explanation;
    })
    .filter((value): value is string => Boolean(value));

  return explanations.length > 0 ? explanations.join(' | ') : '';
}

function sanitizeFileName(value: string) {
  const base = basename(value, extname(value))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'template';
}

function normalizeUploadedFileName(value: string): string;
function normalizeUploadedFileName(value: null | undefined): null;
function normalizeUploadedFileName(value?: string | null) {
  if (typeof value !== 'string') {
    return null;
  }

  if (!/[\u00C3\u00C2\u00E2]/.test(value)) {
    return value;
  }

  const decoded = Buffer.from(value, 'latin1').toString('utf8').trim();
  if (!decoded || decoded.includes('\uFFFD')) {
    return value;
  }

  return decoded;
}

function buildOutputFileBaseName(
  templateName: string,
  contact: Contact | null,
  property: Property | null,
) {
  return sanitizeFileName(
    [
      templateName,
      contact?.displayName ?? property?.ownerContact?.displayName ?? '',
      property?.title ?? '',
      new Date().toISOString().slice(0, 10),
    ]
      .filter(Boolean)
      .join('-'),
  );
}

function coerceManualFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  );
}

function normalizeChoice(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toUpperCase();
  return normalized === 'SI' || normalized === 'NO' ? normalized : '';
}

function parseDateInput(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthName(date: Date) {
  return new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date);
}

function formatCurrencyNumber(value: number) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function numberToSpanishWords(value: number, currencyLabel: string) {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  return `${convertNumber(value)} ${currencyLabel}`.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function convertNumber(value: number): string {
  const units = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
  ];
  const teens = [
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciseis',
    'diecisiete',
    'dieciocho',
    'diecinueve',
  ];
  const tens = [
    '',
    '',
    'veinte',
    'treinta',
    'cuarenta',
    'cincuenta',
    'sesenta',
    'setenta',
    'ochenta',
    'noventa',
  ];
  const hundreds = [
    '',
    'ciento',
    'doscientos',
    'trescientos',
    'cuatrocientos',
    'quinientos',
    'seiscientos',
    'setecientos',
    'ochocientos',
    'novecientos',
  ];

  if (value === 0) return 'cero';
  if (value === 100) return 'cien';
  if (value < 10) return units[value];
  if (value < 20) return teens[value - 10];
  if (value < 30) {
    return value === 20 ? 'veinte' : `veinti${units[value - 20]}`;
  }
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const rest = value % 10;
    return rest === 0 ? tens[ten] : `${tens[ten]} y ${units[rest]}`;
  }
  if (value < 1000) {
    const hundred = Math.floor(value / 100);
    const rest = value % 100;
    return rest === 0
      ? hundreds[hundred]
      : `${hundreds[hundred]} ${convertNumber(rest)}`;
  }
  if (value < 2000) {
    const rest = value % 1000;
    return rest === 0 ? 'mil' : `mil ${convertNumber(rest)}`;
  }
  if (value < 1000000) {
    const thousand = Math.floor(value / 1000);
    const rest = value % 1000;
    const thousandText = `${convertNumber(thousand)} mil`;
    return rest === 0 ? thousandText : `${thousandText} ${convertNumber(rest)}`;
  }
  if (value < 2000000) {
    const rest = value % 1000000;
    return rest === 0 ? 'un millon' : `un millon ${convertNumber(rest)}`;
  }

  const millions = Math.floor(value / 1000000);
  const rest = value % 1000000;
  const millionText = `${convertNumber(millions)} millones`;
  return rest === 0 ? millionText : `${millionText} ${convertNumber(rest)}`;
}
