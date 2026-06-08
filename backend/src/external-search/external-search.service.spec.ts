import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../activities/activity.entity', () => ({
  Activity: class Activity {},
}));

vi.mock('../buyer-property-candidates/buyer-property-candidate.entity', () => ({
  BuyerPropertyCandidate: class BuyerPropertyCandidate {},
}));

vi.mock('../search-requirements/search-requirement.entity', () => ({
  SearchRequirement: class SearchRequirement {},
}));

vi.mock('./external-listing.entity', () => ({
  ExternalListing: class ExternalListing {},
}));

vi.mock('./portal-search-run.entity', () => ({
  PortalSearchRun: class PortalSearchRun {},
}));

vi.mock('./portal-source-config.entity', () => ({
  PortalSourceConfig: class PortalSourceConfig {},
}));

vi.mock('./requirement-portal-match.entity', () => ({
  RequirementPortalMatch: class RequirementPortalMatch {},
}));
import {
  buildArgenpropSearchUrl,
  buildMercadoLibreSearchUrl,
  buildZonapropSearchUrl,
  normalizePortalBaseUrl,
  normalizePortalRequestUrl,
  parseArgenpropAnchor,
  parseMercadoLibreAnchor,
  parseZonapropFallbackAnchor,
} from './external-search.service';
import {
  CurrencyType,
  OperationType,
  PortalProviderKey,
  PropertyType,
} from '../common/enums';
import type { SearchRequirement } from '../search-requirements/search-requirement.entity';

function createRequirement(
  overrides: Partial<SearchRequirement> = {},
): SearchRequirement {
  return {
    id: 1,
    contactId: 1,
    propertyId: null,
    operationType: OperationType.BUY,
    propertyType: PropertyType.PH,
    neighborhoods: ['Almagro'],
    minPrice: null,
    maxPrice: null,
    currency: CurrencyType.USD,
    minRooms: 3,
    minBedrooms: 2,
    minBathrooms: 1,
    needsParking: false,
    creditEligible: false,
    professionalUse: false,
    accessible: false,
    bright: false,
    amenities: [],
    roomTypes: [],
    ageRange: null,
    notes: null,
    status: undefined as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SearchRequirement;
}

describe('external-search helpers', () => {
  it('builds the expected Argenprop search url', () => {
    const requirement = createRequirement();

    expect(buildArgenpropSearchUrl('https://argenprop.com/', requirement)).toBe(
      'https://argenprop.com/ph/venta/almagro',
    );
  });

  it('builds the expected Zonaprop search url with filter slugs', () => {
    const requirement = createRequirement({
      minRooms: 4,
      needsParking: true,
      amenities: ['POOL', 'GRILL'] as SearchRequirement['amenities'],
    });

    expect(buildZonapropSearchUrl('https://zonaprop.com.ar', requirement)).toBe(
      'https://zonaprop.com.ar/ph-venta-almagro-con-cochera-con-pileta.html',
    );
  });

  it('builds the expected Mercado Libre search url', () => {
    const requirement = createRequirement({
      minRooms: 2,
    });

    expect(
      buildMercadoLibreSearchUrl('https://inmuebles.mercadolibre.com.ar', requirement),
    ).toBe('https://inmuebles.mercadolibre.com.ar/ph/venta/2-ambientes/capital-federal/almagro/');
  });

  it('normalizes Zonaprop and Argenprop base urls', () => {
    expect(
      normalizePortalBaseUrl(
        PortalProviderKey.ZONAPROP,
        'https://www.zonaprop.com.ar/ph/venta/caballito/',
      ),
    ).toBe('https://zonaprop.com.ar');
    expect(
      normalizePortalBaseUrl(
        PortalProviderKey.ARGENPROP,
        'https://www.argenprop.com/ph/venta/almagro',
      ),
    ).toBe('https://argenprop.com');
  });

  it('normalizes request urls without altering non-target hosts', () => {
    expect(
      normalizePortalRequestUrl('https://www.argenprop.com/ph/venta/almagro'),
    ).toBe('https://argenprop.com/ph/venta/almagro');
    expect(
      normalizePortalRequestUrl('https://www.zonaprop.com.ar/ph-venta-almagro.html'),
    ).toBe('https://zonaprop.com.ar/ph-venta-almagro.html');
    expect(
      normalizePortalRequestUrl('https://inmuebles.mercadolibre.com.ar/ph/venta/almagro/'),
    ).toBe('https://inmuebles.mercadolibre.com.ar/ph/venta/almagro/');
  });

  it('recovers a Zonaprop listing from the slug fallback', () => {
    const requirement = createRequirement();
    const listing = parseZonapropFallbackAnchor(
      {
        href: 'https://zonaprop.com.ar/propiedades/clasificado/veclapin-venta-ph-6-ambientes-en-almagro-1-piso-por-escalera-sin-expensas-58415428.html?n_src=Listado',
        text: 'USD 245.000 130 m² 3 dorm. 2 baños',
        html: '<img src="https://img.example.com/ph.jpg" />',
      },
      requirement,
      0,
    );

    expect(listing).toMatchObject({
      providerKey: PortalProviderKey.ZONAPROP,
      neighborhood: 'Almagro',
      city: 'Capital Federal',
      price: 245000,
      bedrooms: 3,
      canonicalUrl:
        'https://zonaprop.com.ar/propiedades/clasificado/veclapin-venta-ph-6-ambientes-en-almagro-1-piso-por-escalera-sin-expensas-58415428.html?n_src=Listado',
    });
    expect(listing?.title).toContain('6 Ambientes Almagro');
  });

  it('parses an Argenprop listing anchor', () => {
    const requirement = createRequirement();
    const listing = parseArgenpropAnchor(
      {
        href: 'https://argenprop.com/ph-en-venta-en-almagro-1460000',
        text: 'Venta PH en Venta en Almagro, Capital Federal USD 245.000 130 m² 3 dorm 2 bañ cochera',
        html: '<img src="https://img.example.com/argenprop.jpg" />',
      },
      requirement,
      0,
    );

    expect(listing).toMatchObject({
      providerKey: PortalProviderKey.ARGENPROP,
      neighborhood: 'Almagro',
      city: 'Capital Federal',
      price: 245000,
      bedrooms: 3,
      bathrooms: 2,
      hasGarage: true,
      totalArea: 130,
    });
  });

  it('parses a Mercado Libre listing anchor', () => {
    const requirement = createRequirement();
    const listing = parseMercadoLibreAnchor(
      {
        href: 'https://inmuebles.mercadolibre.com.ar/MLA-1234567890-ph-en-venta-en-almagro',
        text: 'Ph en venta Villa Crespo, Capital Federal US$ 129.000 3 dorm. 60 m² útiles cochera',
        html: '<img src="https://img.example.com/ml.jpg" />',
      },
      requirement,
      0,
    );

    expect(listing).toMatchObject({
      providerKey: PortalProviderKey.MERCADOLIBRE,
      neighborhood: 'Ph en venta Villa Crespo',
      city: 'Capital Federal',
      price: 129000,
      bedrooms: 3,
      hasGarage: true,
      totalArea: 60,
    });
  });
});
