import { describe, expect, it } from 'vitest';
import { extractDomain, parseActivityPreviewMetadata } from './activity-preview.utils';

describe('activity-preview.utils', () => {
  it('parses og tags and resolves relative image urls', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Venta Departamento &amp; Amenities" />
          <meta property="og:description" content="Luminoso &#225;tico en Caballito" />
          <meta property="og:image" content="/images/preview.jpg" />
        </head>
      </html>
    `;

    expect(
      parseActivityPreviewMetadata(html, 'https://zonaprop.com.ar/propiedades/aviso.html'),
    ).toEqual({
      imageUrl: 'https://zonaprop.com.ar/images/preview.jpg',
      title: 'Venta Departamento & Amenities',
      description: 'Luminoso ático en Caballito',
      domain: 'zonaprop.com.ar',
    });
  });

  it('falls back to twitter/title tags and strips www from domain', () => {
    const html = `
      <html>
        <head>
          <title>PH con terraza</title>
          <meta name="twitter:image" content="https://cdn.example.com/preview.png" />
        </head>
      </html>
    `;

    expect(parseActivityPreviewMetadata(html, 'https://www.argenprop.com/ph/venta/caballito')).toEqual({
      imageUrl: 'https://cdn.example.com/preview.png',
      title: 'PH con terraza',
      description: null,
      domain: 'argenprop.com',
    });
    expect(extractDomain('https://www.argenprop.com/ph/venta/caballito')).toBe('argenprop.com');
  });
});
