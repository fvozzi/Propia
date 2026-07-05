import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { describe, expect, it } from 'vitest';
import { DocumentTemplatePresetKey } from '../common/enums';
import { sanitizeDocxTemplateBuffer } from './docx-template-sanitizer';

describe('docx template sanitizer', () => {
  it('removes Word proofing markers inside placeholders before rendering DOCX templates', () => {
    const sourceXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{{</w:t></w:r>
      <w:proofErr w:type="spellStart"/>
      <w:r><w:t>owner_full_name</w:t></w:r>
      <w:proofErr w:type="spellEnd"/>
      <w:r><w:t>}}</w:t></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;

    const zip = new PizZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    zip.folder('word')?.file('document.xml', sourceXml);

    const sanitizedBuffer = sanitizeDocxTemplateBuffer(
      Buffer.from(
        zip.generate({
          type: 'nodebuffer',
          compression: 'DEFLATE',
        }),
      ),
    );

    const sanitizedZip = new PizZip(sanitizedBuffer);
    const sanitizedXml = sanitizedZip.file('word/document.xml')?.asText() ?? '';

    expect(sanitizedXml).not.toContain('<w:proofErr');

    const document = new Docxtemplater(sanitizedZip, {
      delimiters: {
        start: '{{',
        end: '}}',
      },
      nullGetter() {
        return '';
      },
    });

    expect(() => document.render({ owner_full_name: 'Susi' })).not.toThrow();
  });

  it('injects missing exclusive sale placeholders when the DOCX keeps only the legal questions', () => {
    const sourceXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>*Bien de Familia:</w:t></w:r></w:p>
    <w:p><w:r><w:t>*Donación:</w:t></w:r></w:p>
    <w:p><w:r><w:t>*Registra Hipoteca Sin Levantamiento:</w:t></w:r></w:p>
    <w:p><w:r><w:t>*Sucesión en Trámite:</w:t></w:r></w:p>
    <w:p><w:r><w:t>Inmueble a Construir:</w:t></w:r></w:p>
    <w:p><w:r><w:t>*Apto Crédito:</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;

    const zip = new PizZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    zip.folder('word')?.file('document.xml', sourceXml);

    const sanitizedBuffer = sanitizeDocxTemplateBuffer(
      Buffer.from(
        zip.generate({
          type: 'nodebuffer',
          compression: 'DEFLATE',
        }),
      ),
      DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION,
    );

    const sanitizedZip = new PizZip(sanitizedBuffer);
    const sanitizedXml = sanitizedZip.file('word/document.xml')?.asText() ?? '';

    expect(sanitizedXml).toContain('{{family_asset_choice}}');
    expect(sanitizedXml).toContain('{{donation_choice}}');
    expect(sanitizedXml).toContain('{{mortgage_without_release_choice}}');
    expect(sanitizedXml).toContain('{{succession_in_process_choice}}');
    expect(sanitizedXml).toContain('{{property_under_construction_choice}}');
    expect(sanitizedXml).toContain('{{credit_eligible_choice}}');

    const document = new Docxtemplater(sanitizedZip, {
      delimiters: {
        start: '{{',
        end: '}}',
      },
      nullGetter() {
        return '';
      },
    });

    expect(() =>
      document.render({
        family_asset_choice: 'SI',
        donation_choice: 'NO',
        mortgage_without_release_choice: 'NO',
        succession_in_process_choice: 'SI',
        property_under_construction_choice: 'NO',
        credit_eligible_choice: 'SI',
      }),
    ).not.toThrow();
  });
});
