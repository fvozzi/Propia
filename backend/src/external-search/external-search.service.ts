import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { chromium, type Page } from 'playwright';
import { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import {
  ActivityType,
  BuyerPropertyShareStatus,
  CurrencyType,
  ExternalListingStatus,
  OperationType,
  PortalProviderKey,
  PortalSearchRunStatus,
  PropertyType,
} from '../common/enums';
import {
  areExternalListingsLikelyDuplicates,
  scoreExternalListingForRequirement,
} from '../use-cases/external-listing-matching.use-case';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { CreatePortalSourceConfigDto } from './dto/create-portal-source-config.dto';
import { DismissRequirementPortalMatchDto } from './dto/dismiss-requirement-portal-match.dto';
import { QueryRequirementPortalMatchesDto } from './dto/query-requirement-portal-matches.dto';
import { UpdatePortalSourceConfigDto } from './dto/update-portal-source-config.dto';
import { ExternalListing } from './external-listing.entity';
import { PortalSearchRun } from './portal-search-run.entity';
import { PortalSourceConfig } from './portal-source-config.entity';
import { RequirementPortalMatch } from './requirement-portal-match.entity';

type MockListingInput = {
  providerKey: PortalProviderKey;
  externalListingId: string;
  canonicalUrl: string;
  title: string;
  description: string;
  operationType: OperationType;
  propertyType: PropertyType;
  price: number | null;
  currency: CurrencyType;
  neighborhood: string | null;
  city: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  hasGarage: boolean | null;
  totalArea: number | null;
  rawPayload: Record<string, unknown>;
};

type ExternalFetchResult = {
  searchUrl: string | null;
  rawListings: MockListingInput[];
};

@Injectable()
export class ExternalSearchService {
  constructor(
    @InjectRepository(PortalSourceConfig)
    private readonly portalSourceConfigsRepository: Repository<PortalSourceConfig>,
    @InjectRepository(ExternalListing)
    private readonly externalListingsRepository: Repository<ExternalListing>,
    @InjectRepository(RequirementPortalMatch)
    private readonly requirementPortalMatchesRepository: Repository<RequirementPortalMatch>,
    @InjectRepository(PortalSearchRun)
    private readonly portalSearchRunsRepository: Repository<PortalSearchRun>,
    @InjectRepository(SearchRequirement)
    private readonly searchRequirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(BuyerPropertyCandidate)
    private readonly buyerPropertyCandidatesRepository: Repository<BuyerPropertyCandidate>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
  ) {}

  async listPortalSourceConfigs(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    return this.portalSourceConfigsRepository.find({
      where: { teamId },
      order: {
        priority: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async createPortalSourceConfig(
    dto: CreatePortalSourceConfigDto,
    user: AuthenticatedUser,
  ) {
    const teamId = requireActiveTeamId(user);
    const created = this.portalSourceConfigsRepository.create({
      teamId,
      providerKey: dto.providerKey,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 100,
      baseUrl:
        normalizePortalBaseUrl(dto.providerKey, dto.baseUrl?.trim()) ||
        defaultBaseUrlByProvider[dto.providerKey] ||
        null,
      rateLimitPerHour: dto.rateLimitPerHour ?? null,
      maxResultsPerRun: dto.maxResultsPerRun ?? 20,
      requiresAuth: dto.requiresAuth ?? false,
      authConfig: dto.authConfig ?? null,
    });
    return this.portalSourceConfigsRepository.save(created);
  }

  async updatePortalSourceConfig(
    id: number,
    dto: UpdatePortalSourceConfigDto,
    user: AuthenticatedUser,
  ) {
    const config = await this.requireScopedPortalSourceConfig(id, requireActiveTeamId(user));

    if (dto.providerKey) {
      config.providerKey = dto.providerKey;
    }

    if ('enabled' in dto && typeof dto.enabled === 'boolean') {
      config.enabled = dto.enabled;
    }

    if ('priority' in dto) {
      config.priority = dto.priority ?? config.priority;
    }

    if ('baseUrl' in dto) {
      config.baseUrl =
        normalizePortalBaseUrl(config.providerKey, dto.baseUrl?.trim()) ||
        defaultBaseUrlByProvider[config.providerKey] ||
        null;
    }

    if ('rateLimitPerHour' in dto) {
      config.rateLimitPerHour = dto.rateLimitPerHour ?? null;
    }

    if ('maxResultsPerRun' in dto) {
      config.maxResultsPerRun = dto.maxResultsPerRun ?? null;
    }

    if ('requiresAuth' in dto && typeof dto.requiresAuth === 'boolean') {
      config.requiresAuth = dto.requiresAuth;
    }

    if ('authConfig' in dto) {
      config.authConfig = dto.authConfig ?? null;
    }

    return this.portalSourceConfigsRepository.save(config);
  }

  async removePortalSourceConfig(id: number, user: AuthenticatedUser) {
    const config = await this.requireScopedPortalSourceConfig(id, requireActiveTeamId(user));
    await this.portalSourceConfigsRepository.remove(config);
    return { success: true };
  }

  async runExternalSearchForRequirement(requirementId: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const requirement = await this.requireScopedRequirement(requirementId, teamId);
    const configs = await this.portalSourceConfigsRepository.find({
      where: { teamId, enabled: true },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });

    for (const config of configs) {
      const run = await this.portalSearchRunsRepository.save(
        this.portalSearchRunsRepository.create({
          teamId,
          providerKey: config.providerKey,
          searchRequirementId: requirement.id,
          status: PortalSearchRunStatus.RUNNING,
          startedAt: new Date(),
          finishedAt: null,
          fetchedCount: 0,
          normalizedCount: 0,
          matchedCount: 0,
          errorMessage: null,
          requestSnapshot: {
            requirementId: requirement.id,
            contactId: requirement.contactId,
            propertyType: requirement.propertyType,
            neighborhoods: requirement.neighborhoods,
            maxResultsPerRun: config.maxResultsPerRun,
          },
        }),
      );

      try {
        const { rawListings, searchUrl } = await getListingsForConfig(config, requirement);
        run.requestSnapshot = {
          ...(run.requestSnapshot ?? {}),
          searchUrl,
          providerKey: config.providerKey,
        };
        const persistedListings: ExternalListing[] = [];

        for (const rawListing of rawListings) {
          const listing = await this.upsertExternalListing(rawListing, teamId);
          persistedListings.push(listing);
        }

        const uniqueListings = await this.markDuplicates(teamId, persistedListings);
        let matchedCount = 0;

        for (const listing of uniqueListings) {
          if (listing.status === ExternalListingStatus.DUPLICATED) {
            continue;
          }

          const match = scoreExternalListingForRequirement(requirement, listing);
          if (match.score < 50) {
            continue;
          }

          matchedCount += 1;
          const existingMatch = await this.requirementPortalMatchesRepository.findOne({
            where: {
              teamId,
              searchRequirementId: requirement.id,
              externalListingId: listing.id,
            },
          });

          const nextMatch = existingMatch
            ? existingMatch
            : this.requirementPortalMatchesRepository.create({
                teamId,
                searchRequirementId: requirement.id,
                externalListingId: listing.id,
              });

          nextMatch.score = match.score;
          nextMatch.scoreBreakdown = match.scoreBreakdown;
          nextMatch.matchReasons = match.matchReasons;
          nextMatch.lastEvaluatedAt = new Date();
          await this.requirementPortalMatchesRepository.save(nextMatch);
        }

        run.status = PortalSearchRunStatus.SUCCESS;
        run.finishedAt = new Date();
        run.fetchedCount = rawListings.length;
        run.normalizedCount = persistedListings.length;
        run.matchedCount = matchedCount;
        await this.portalSearchRunsRepository.save(run);
      } catch (error) {
        run.status = PortalSearchRunStatus.FAILED;
        run.finishedAt = new Date();
        run.errorMessage =
          error instanceof Error ? error.message : 'No se pudo ejecutar la busqueda externa';
        await this.portalSearchRunsRepository.save(run);
      }
    }

    return this.listRequirementPortalMatches(requirement.id, {}, user);
  }

  async listRequirementPortalMatches(
    requirementId: number,
    query: QueryRequirementPortalMatchesDto,
    user: AuthenticatedUser,
  ) {
    const teamId = requireActiveTeamId(user);
    await this.requireScopedRequirement(requirementId, teamId);

    const qb = this.requirementPortalMatchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.externalListing', 'externalListing')
      .where('match.teamId = :teamId', { teamId })
      .andWhere('match.searchRequirementId = :requirementId', { requirementId })
      .orderBy('match.score', 'DESC')
      .addOrderBy('match.updatedAt', 'DESC');

    if (query.providerKey) {
      qb.andWhere('externalListing.providerKey = :providerKey', {
        providerKey: query.providerKey,
      });
    }

    if (query.minScore !== undefined) {
      qb.andWhere('match.score >= :minScore', { minScore: query.minScore });
    }

    if (query.dismissed !== undefined) {
      qb.andWhere('match.dismissed = :dismissed', { dismissed: query.dismissed });
    }

    if (query.converted !== undefined) {
      qb.andWhere(
        query.converted
          ? 'match.convertedToCandidateAt IS NOT NULL'
          : 'match.convertedToCandidateAt IS NULL',
      );
    }

    return qb.getMany();
  }

  async dismissRequirementPortalMatch(
    id: number,
    dto: DismissRequirementPortalMatchDto,
    user: AuthenticatedUser,
  ) {
    const match = await this.requireScopedRequirementPortalMatch(id, requireActiveTeamId(user));
    match.dismissed = true;
    match.dismissedReason = dto.reason?.trim() || null;
    match.dismissedAt = new Date();
    return this.requirementPortalMatchesRepository.save(match);
  }

  async restoreRequirementPortalMatch(id: number, user: AuthenticatedUser) {
    const match = await this.requireScopedRequirementPortalMatch(id, requireActiveTeamId(user));
    match.dismissed = false;
    match.dismissedReason = null;
    match.dismissedAt = null;
    return this.requirementPortalMatchesRepository.save(match);
  }

  async convertMatchToCandidate(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const match = await this.requirementPortalMatchesRepository.findOne({
      where: { id, teamId },
      relations: {
        externalListing: true,
        searchRequirement: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Sugerencia externa no encontrada');
    }

    if (match.buyerPropertyCandidateId) {
      return this.requirementPortalMatchesRepository.findOne({
        where: { id: match.id, teamId },
        relations: {
          externalListing: true,
          buyerPropertyCandidate: true,
        },
      });
    }

    const candidate = await this.buyerPropertyCandidatesRepository.save(
      this.buyerPropertyCandidatesRepository.create({
        teamId,
        ownerUserId: user.sub,
        contactId: match.searchRequirement.contactId,
        searchRequirementId: match.searchRequirement.id,
        portal: match.externalListing.providerKey,
        url: match.externalListing.canonicalUrl,
        title: match.externalListing.title,
        internalNotes: `Preseleccion automatica. ${match.matchReasons.join('. ')}`,
        shareComments: null,
        shareStatus: BuyerPropertyShareStatus.PENDING_WHATSAPP,
        sharedAt: null,
      }),
    );

    match.buyerPropertyCandidateId = candidate.id;
    match.convertedToCandidateAt = new Date();
    await this.requirementPortalMatchesRepository.save(match);

    return this.requirementPortalMatchesRepository.findOne({
      where: { id: match.id, teamId },
      relations: {
        externalListing: true,
        buyerPropertyCandidate: true,
      },
    });
  }

  async createActivityFromMatch(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const match = await this.requirementPortalMatchesRepository.findOne({
      where: { id, teamId },
      relations: {
        externalListing: true,
        searchRequirement: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Sugerencia externa no encontrada');
    }

    if (match.activityId) {
      return this.activitiesRepository.findOne({
        where: { id: match.activityId, teamId },
      });
    }

    const activity = await this.activitiesRepository.save(
      this.activitiesRepository.create({
        teamId,
        ownerUserId: user.sub,
        contactId: match.searchRequirement.contactId,
        propertyId: null,
        appraisalRequestId: null,
        activityType: ActivityType.PROPERTY_SEARCH,
        title: match.externalListing.title,
        description: `Sugerencia automatica desde ${match.externalListing.providerKey}. ${match.matchReasons.join('. ')}`,
        externalUrl: match.externalListing.canonicalUrl,
        externalPreviewImageUrl: getExternalListingPreviewImageUrl(match.externalListing),
        externalPreviewTitle: match.externalListing.title,
        externalPreviewDescription: match.externalListing.description,
        externalPreviewDomain: getExternalListingPreviewDomain(match.externalListing),
        externalPreviewFetchedAt: new Date(),
        whatsappComment: buildWhatsappComment(match.matchReasons),
        whatsappSharedAt: null,
        propertySearchLiked: null,
        googleEventId: null,
        googleSyncStatus: 'PENDING',
        lastSyncedAt: null,
        googleSyncError: null,
        activityDate: new Date(),
        nextFollowUpDate: null,
      }),
    );

    match.activityId = activity.id;
    match.createdActivityAt = new Date();
    await this.requirementPortalMatchesRepository.save(match);
    return activity;
  }

  async listSearchRunsForRequirement(requirementId: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.requireScopedRequirement(requirementId, teamId);
    return this.portalSearchRunsRepository.find({
      where: { teamId, searchRequirementId: requirementId },
      order: { startedAt: 'DESC' },
    });
  }

  private async upsertExternalListing(input: MockListingInput, teamId: number) {
    const existing = await this.externalListingsRepository.findOne({
      where: [
        {
          teamId,
          providerKey: input.providerKey,
          externalListingId: input.externalListingId,
        },
        {
          teamId,
          canonicalUrl: input.canonicalUrl,
        },
      ],
    });

    const now = new Date();
    const listing = existing
      ? existing
      : this.externalListingsRepository.create({
          teamId,
          providerKey: input.providerKey,
          externalListingId: input.externalListingId,
          canonicalUrl: input.canonicalUrl,
          urlHash: hashUrl(input.canonicalUrl),
          firstSeenAt: now,
        });

    Object.assign(listing, {
      teamId,
      providerKey: input.providerKey,
      externalListingId: input.externalListingId,
      canonicalUrl: input.canonicalUrl,
      urlHash: hashUrl(input.canonicalUrl),
      title: input.title,
      description: input.description,
      operationType: input.operationType,
      propertyType: input.propertyType,
      price: input.price,
      currency: input.currency,
      expenses: null,
      address: null,
      city: input.city,
      neighborhood: input.neighborhood,
      rooms: input.rooms,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      hasGarage: input.hasGarage,
      coveredArea: null,
      totalArea: input.totalArea,
      sourcePublishedAt: null,
      lastSeenAt: now,
      rawPayload: input.rawPayload,
      status: ExternalListingStatus.ACTIVE,
    });

    return this.externalListingsRepository.save(listing);
  }

  private async markDuplicates(teamId: number, listings: ExternalListing[]) {
    const persisted: ExternalListing[] = [];

    for (const listing of listings) {
      const siblings = await this.externalListingsRepository.find({
        where: { teamId },
      });

      const duplicate = siblings.find(
        (sibling) =>
          sibling.id !== listing.id &&
          areExternalListingsLikelyDuplicates(
            {
              canonicalUrl: listing.canonicalUrl,
              providerKey: listing.providerKey,
              externalListingId: listing.externalListingId,
              title: listing.title,
              neighborhood: listing.neighborhood,
              price: listing.price,
              rooms: listing.rooms,
            },
            {
              canonicalUrl: sibling.canonicalUrl,
              providerKey: sibling.providerKey,
              externalListingId: sibling.externalListingId,
              title: sibling.title,
              neighborhood: sibling.neighborhood,
              price: sibling.price,
              rooms: sibling.rooms,
            },
          ),
      );

      if (duplicate) {
        listing.status = ExternalListingStatus.DUPLICATED;
        await this.externalListingsRepository.save(listing);
      }

      persisted.push(listing);
    }

    return persisted;
  }

  private async requireScopedPortalSourceConfig(id: number, teamId: number) {
    const config = await this.portalSourceConfigsRepository.findOne({
      where: { id, teamId },
    });

    if (!config) {
      throw new NotFoundException('Configuracion de portal no encontrada');
    }

    return config;
  }

  private async requireScopedRequirement(id: number, teamId: number) {
    const requirement = await this.searchRequirementsRepository.findOne({
      where: { id, teamId },
      relations: {
        contact: true,
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    return requirement;
  }

  private async requireScopedRequirementPortalMatch(id: number, teamId: number) {
    const match = await this.requirementPortalMatchesRepository.findOne({
      where: { id, teamId },
      relations: {
        externalListing: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Sugerencia externa no encontrada');
    }

    return match;
  }
}

function hashUrl(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function buildWhatsappComment(reasons: string[]) {
  if (reasons.length === 0) {
    return 'Te comparto una opcion preseleccionada para revisar.';
  }

  return `Te comparto una opcion preseleccionada. ${reasons.slice(0, 2).join('. ')}.`;
}

function getExternalListingPreviewImageUrl(listing: ExternalListing) {
  const value = listing.rawPayload?.previewImageUrl;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getExternalListingPreviewDomain(listing: ExternalListing) {
  try {
    return new URL(listing.canonicalUrl).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function createMockListings(
  providerKey: PortalProviderKey,
  requirement: SearchRequirement,
  maxResultsPerRun: number,
) {
  const primaryNeighborhood = requirement.neighborhoods[0] ?? 'Caballito';
  const secondaryNeighborhood = requirement.neighborhoods[1] ?? primaryNeighborhood;
  const basePrice = requirement.maxPrice ?? requirement.minPrice ?? 120000;
  const propertyLabel = propertyTypeLabel[requirement.propertyType];
  const host = defaultBaseUrlByProvider[providerKey] ?? 'https://example.com';
  const results: MockListingInput[] = [
    {
      providerKey,
      externalListingId: `${providerKey}-${requirement.id}-1`,
      canonicalUrl: `${host}/propiedad/${requirement.id}-1`,
      title: `${propertyLabel} en ${primaryNeighborhood}`,
      description: `Publicacion simulada de ${providerKey} para ${primaryNeighborhood}.`,
      operationType: requirement.operationType,
      propertyType: requirement.propertyType,
      price: basePrice,
      currency: requirement.currency,
      neighborhood: primaryNeighborhood,
      city: 'CABA',
      rooms: requirement.minRooms ?? 3,
      bedrooms: requirement.minBedrooms ?? 2,
      bathrooms: requirement.minBathrooms ?? 1,
      hasGarage: requirement.needsParking ? true : null,
      totalArea: 70,
      rawPayload: { mock: true, providerKey, variant: 'strong' },
    },
    {
      providerKey,
      externalListingId: `${providerKey}-${requirement.id}-2`,
      canonicalUrl: `${host}/propiedad/${requirement.id}-2`,
      title: `${propertyLabel} luminoso en ${secondaryNeighborhood}`,
      description: `Publicacion simulada de ${providerKey} con ajuste parcial al requerimiento.`,
      operationType: requirement.operationType,
      propertyType: requirement.propertyType,
      price: basePrice && requirement.maxPrice ? requirement.maxPrice + 15000 : basePrice + 10000,
      currency: requirement.currency,
      neighborhood: secondaryNeighborhood,
      city: 'CABA',
      rooms: requirement.minRooms ?? 2,
      bedrooms: requirement.minBedrooms ?? 1,
      bathrooms: requirement.minBathrooms ?? 1,
      hasGarage: requirement.needsParking ? false : null,
      totalArea: 58,
      rawPayload: { mock: true, providerKey, variant: 'medium' },
    },
    {
      providerKey,
      externalListingId: `${providerKey}-${requirement.id}-3`,
      canonicalUrl: `${host}/propiedad/${requirement.id}-3`,
      title: `${propertyLabel} en ${primaryNeighborhood} premium`,
      description: `Publicacion simulada de ${providerKey} fuera de presupuesto.`,
      operationType: requirement.operationType,
      propertyType: requirement.propertyType,
      price: basePrice ? basePrice + 50000 : 200000,
      currency: requirement.currency,
      neighborhood: primaryNeighborhood,
      city: 'CABA',
      rooms: requirement.minRooms ?? 2,
      bedrooms: requirement.minBedrooms ?? 1,
      bathrooms: requirement.minBathrooms ?? 1,
      hasGarage: true,
      totalArea: 95,
      rawPayload: { mock: true, providerKey, variant: 'premium' },
    },
  ];

  return results.slice(0, Math.max(1, Math.min(maxResultsPerRun, results.length)));
}

const defaultBaseUrlByProvider: Record<PortalProviderKey, string | undefined> = {
  [PortalProviderKey.ARGENPROP]: 'https://argenprop.com',
  [PortalProviderKey.ZONAPROP]: 'https://zonaprop.com.ar',
  [PortalProviderKey.MERCADOLIBRE]: 'https://inmuebles.mercadolibre.com.ar',
  [PortalProviderKey.MOCK]: 'https://mock.propia.local',
};

const propertyTypeLabel: Record<PropertyType, string> = {
  [PropertyType.HOUSE]: 'Casa',
  [PropertyType.APARTMENT]: 'Departamento',
  [PropertyType.PH]: 'PH',
  [PropertyType.LAND]: 'Lote',
  [PropertyType.OFFICE]: 'Oficina',
  [PropertyType.COMMERCIAL]: 'Local',
  [PropertyType.OTHER]: 'Propiedad',
};

async function getListingsForConfig(
  config: PortalSourceConfig,
  requirement: SearchRequirement,
): Promise<ExternalFetchResult> {
  switch (config.providerKey) {
    case PortalProviderKey.ARGENPROP:
      return fetchArgenpropListings(config, requirement);
    case PortalProviderKey.ZONAPROP:
      return fetchZonapropListings(config, requirement);
    case PortalProviderKey.MERCADOLIBRE:
      return fetchMercadoLibreListings(config, requirement);
    case PortalProviderKey.MOCK:
    default:
      return {
        searchUrl: null,
        rawListings: createMockListings(
          config.providerKey,
          requirement,
          config.maxResultsPerRun ?? 20,
        ),
      };
  }
}

async function fetchArgenpropListings(
  config: PortalSourceConfig,
  requirement: SearchRequirement,
): Promise<ExternalFetchResult> {
  const baseUrl = config.baseUrl?.trim() || defaultBaseUrlByProvider[PortalProviderKey.ARGENPROP];
  if (!baseUrl) {
    return { searchUrl: null, rawListings: [] };
  }

  const searchUrl = buildArgenpropSearchUrl(baseUrl, requirement);
  const html = await fetchHtmlWithBrowser(searchUrl, {
    portalLabel: 'Argenprop',
    waitForSelector: 'a[href*="-en-"]',
    diagnosticSelectors: ['a[href*="-en-"]', 'a[href*="/propiedad-"]'],
  });
  const anchors = extractGroupedAnchors(
    html,
    new URL(baseUrl).origin,
    (href) => href.includes('-en-') && !href.includes('/publicar'),
  );

  return {
    searchUrl,
    rawListings: anchors
      .map((anchor, index) => parseArgenpropAnchor(anchor, requirement, index))
      .filter(isPresent)
      .slice(0, config.maxResultsPerRun ?? 20),
  };
}

async function fetchZonapropListings(
  config: PortalSourceConfig,
  requirement: SearchRequirement,
): Promise<ExternalFetchResult> {
  const baseUrl = config.baseUrl?.trim() || defaultBaseUrlByProvider[PortalProviderKey.ZONAPROP];
  if (!baseUrl) {
    return { searchUrl: null, rawListings: [] };
  }

  const searchUrl = buildZonapropSearchUrl(baseUrl, requirement);
  const html = await fetchHtmlWithBrowser(searchUrl, {
    portalLabel: 'Zonaprop',
    waitForSelector: 'a[href*="/propiedades/"]',
    diagnosticSelectors: ['a[href*="/propiedades/"]', 'a[href$=".html"]'],
    allowHttpErrorWhenSelectorVisible: true,
  });
  const anchors = extractGroupedAnchors(
    html,
    new URL(baseUrl).origin,
    (href) => href.includes('/propiedades/') && /\.html(?:[?#].*)?$/i.test(href),
  );
  return {
    searchUrl,
    rawListings: anchors
      .map(
        (anchor, index) =>
          parseZonapropAnchor(anchor, requirement, index) ??
          parseZonapropFallbackAnchor(anchor, requirement, index),
      )
      .filter(isPresent)
      .slice(0, config.maxResultsPerRun ?? 20),
  };
}

async function fetchMercadoLibreListings(
  config: PortalSourceConfig,
  requirement: SearchRequirement,
): Promise<ExternalFetchResult> {
  const baseUrl =
    config.baseUrl?.trim() || defaultBaseUrlByProvider[PortalProviderKey.MERCADOLIBRE];
  if (!baseUrl) {
    return { searchUrl: null, rawListings: [] };
  }

  const searchUrl = buildMercadoLibreSearchUrl(baseUrl, requirement);
  const html = await fetchMercadoLibreHtmlWithBrowser(searchUrl);
  const anchors = extractGroupedAnchors(html, new URL(baseUrl).origin, (href) => {
    if (href === searchUrl) {
      return false;
    }

    return (
      /mercadolibre\.com\.ar/i.test(href) &&
      !href.includes('/_Desde_') &&
      !href.includes('/gz/account-verification') &&
      !href.includes('/categorias/') &&
      !href.includes('/tienda/') &&
      !href.includes('/perfil/') &&
      (/\/MLA-\d+/i.test(href) ||
        /\/p\/MLA/i.test(href) ||
        /\/[A-Z0-9-]+_JM/i.test(href) ||
        /\/inmuebles\/[^/?#]+/i.test(href))
    );
  });

  return {
    searchUrl,
    rawListings: anchors
      .map((anchor, index) => parseMercadoLibreAnchor(anchor, requirement, index))
      .filter(isPresent)
      .slice(0, config.maxResultsPerRun ?? 20),
  };
}

function buildArgenpropSearchUrl(baseUrl: string, requirement: SearchRequirement) {
  const propertySlug = argenpropPropertyTypeSlug[requirement.propertyType] ?? 'departamentos';
  const operationSlug = requirement.operationType === OperationType.BUY ? 'venta' : 'alquiler';
  const neighborhoodSlug = slugify(requirement.neighborhoods[0] ?? 'caballito');
  return `${trimTrailingSlash(baseUrl)}/${propertySlug}/${operationSlug}/${neighborhoodSlug}`;
}

function buildZonapropSearchUrl(baseUrl: string, requirement: SearchRequirement) {
  const propertySlug = zonapropPropertyTypeSlug[requirement.propertyType] ?? 'departamento';
  const operationSlug = requirement.operationType === OperationType.BUY ? 'venta' : 'alquiler';
  const neighborhoodSlug = slugify(requirement.neighborhoods[0] ?? 'caballito');
  const filterSlugs = buildZonapropFilterSlugs(requirement);
  const routeSlug = [propertySlug, operationSlug, neighborhoodSlug, ...filterSlugs].join('-');
  return `${trimTrailingSlash(baseUrl)}/${routeSlug}.html`;
}

function buildMercadoLibreSearchUrl(baseUrl: string, requirement: SearchRequirement) {
  const propertySlug =
    mercadolibrePropertyTypeSlug[requirement.propertyType] ?? 'departamentos';
  const operationSlug = requirement.operationType === OperationType.BUY ? 'venta' : 'alquiler';
  const roomsSegment =
    requirement.minRooms && requirement.minRooms >= 2
      ? `${requirement.minRooms}-ambientes/`
      : '';
  const neighborhoodSlug = slugify(requirement.neighborhoods[0] ?? 'caballito');
  return `${trimTrailingSlash(baseUrl)}/${propertySlug}/${operationSlug}/${roomsSegment}capital-federal/${neighborhoodSlug}/`;
}

async function fetchHtml(url: string) {
  const normalizedUrl = normalizePortalRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const response = await fetch(normalizedUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      Referer: `${requestOrigin}/`,
      Origin: requestOrigin,
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo consultar el portal externo (${response.status} ${response.statusText}): ${normalizedUrl}`,
    );
  }

  return response.text();
}

async function fetchHtmlWithBrowser(
  url: string,
  options: {
    portalLabel?: string;
    waitForSelector?: string;
    diagnosticSelectors?: string[];
    allowHttpErrorWhenSelectorVisible?: boolean;
  } = {},
) {
  const normalizedUrl = normalizePortalRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const timeout = Number.parseInt(process.env.PORTAL_BROWSER_TIMEOUT_MS ?? '25000', 10);
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: buildPortalBrowserArgs(),
  });
  let page: Page | null = null;
  let responseStatus: number | null = null;
  let responseStatusText: string | null = null;

  try {
    const context = await createPortalBrowserContext(browser, requestOrigin);
    page = await context.newPage();
    const response = await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout,
    });
    responseStatus = response?.status() ?? null;
    responseStatusText = response?.statusText() ?? null;

    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 15000) }).catch(() => {});
    let selectorVisible = false;
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, {
          timeout: Math.min(timeout, 15000),
        });
        selectorVisible = true;
      } catch (error) {
        throw new Error(
          await buildBrowserPortalErrorMessage({
            portalLabel: options.portalLabel,
            page,
            normalizedUrl,
            responseStatus,
            responseStatusText,
            diagnosticSelectors: options.diagnosticSelectors ?? [options.waitForSelector],
            cause: error,
          }),
        );
      }
    }

    if (
      response &&
      !response.ok() &&
      !(options.allowHttpErrorWhenSelectorVisible && selectorVisible)
    ) {
      throw new Error(
        await buildBrowserPortalErrorMessage({
          portalLabel: options.portalLabel,
          page,
          normalizedUrl,
          responseStatus,
          responseStatusText,
          diagnosticSelectors: options.diagnosticSelectors,
        }),
      );
    }

    const html = await page.content();
    await context.close();
    return html;
  } catch (error) {
    if (error instanceof Error && /Executable doesn't exist|browserType\.launch/i.test(error.message)) {
      throw new Error(
        `No se pudo iniciar Chromium para scraping. Instala el browser de Playwright o define PLAYWRIGHT_EXECUTABLE_PATH. Detalle: ${error.message}`,
      );
    }

    if (error instanceof Error && error.message.startsWith('No se pudo consultar el portal externo')) {
      throw error;
    }

    if (page) {
      throw new Error(
        await buildBrowserPortalErrorMessage({
          portalLabel: options.portalLabel,
          page,
          normalizedUrl,
          responseStatus,
          responseStatusText,
          diagnosticSelectors: options.diagnosticSelectors,
          cause: error,
        }),
      );
    }

    throw error;
  } finally {
    await browser.close();
  }
}

async function fetchMercadoLibreHtmlWithBrowser(url: string) {
  const normalizedUrl = normalizePortalRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const timeout = Number.parseInt(process.env.PORTAL_BROWSER_TIMEOUT_MS ?? '25000', 10);
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: buildPortalBrowserArgs(),
  });
  let page: Page | null = null;
  let responseStatus: number | null = null;
  let responseStatusText: string | null = null;

  try {
    const context = await createPortalBrowserContext(browser, requestOrigin);

    await context.addCookies([
      {
        name: '_bm_skipml',
        value: 'true',
        domain: '.mercadolibre.com.ar',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 300,
      },
    ]);

    page = await context.newPage();
    const browserPage = page;
    const visit = async () => {
      const response = await browserPage.goto(normalizedUrl, {
        waitUntil: 'domcontentloaded',
        timeout,
      });
      responseStatus = response?.status() ?? null;
      responseStatusText = response?.statusText() ?? null;

      if (response && !response.ok()) {
        throw new Error(
          await buildBrowserPortalErrorMessage({
            portalLabel: 'Mercado Libre',
            page: browserPage,
            normalizedUrl,
            responseStatus,
            responseStatusText,
            diagnosticSelectors: [
              'a.poly-component__title[href*="/MLA-"]',
              'a.ui-search-item__group__element[href*="/MLA-"]',
              'a[href*="/MLA-"]',
            ],
          }),
        );
      }

      await browserPage
        .waitForLoadState('networkidle', { timeout: Math.min(timeout, 15000) })
        .catch(() => {});

      await resolveMercadoLibreInterstitial(browserPage, timeout);
    };

    await visit();

    const preferredSelector = 'a.poly-component__title[href*="/MLA-"], a.poly-component__title[href*="/inmuebles/"]';
    const fallbackSelector = 'a.ui-search-item__group__element[href*="/MLA-"], a.ui-search-item__group__element[href*="/inmuebles/"]';
    const broadSelector = 'a[href*="/MLA-"], a[href*="/inmuebles/"]';

    if (
      (await page.locator(preferredSelector).count()) === 0 &&
      (await page.locator(fallbackSelector).count()) === 0 &&
      (await page.locator(broadSelector).count()) === 0
    ) {
      await visit();
    }

    const preferredCount = await browserPage.locator(preferredSelector).count();
    const fallbackCount = await browserPage.locator(fallbackSelector).count();
    const broadCount = await browserPage.locator(broadSelector).count();
    if (preferredCount === 0 && fallbackCount === 0 && broadCount === 0) {
      throw new Error(
        await buildBrowserPortalErrorMessage({
          portalLabel: 'Mercado Libre',
          page: browserPage,
          normalizedUrl,
          responseStatus,
          responseStatusText,
          diagnosticSelectors: [preferredSelector, fallbackSelector, broadSelector],
        }),
      );
    }

    const html = await browserPage.content();
    await context.close();
    return html;
  } catch (error) {
    if (error instanceof Error && /Executable doesn't exist|browserType\.launch/i.test(error.message)) {
      throw new Error(
        `No se pudo iniciar Chromium para scraping. Instala el browser de Playwright o define PLAYWRIGHT_EXECUTABLE_PATH. Detalle: ${error.message}`,
      );
    }

    if (error instanceof Error && error.message.startsWith('No se pudo consultar el portal externo')) {
      throw error;
    }

    if (page) {
      throw new Error(
        await buildBrowserPortalErrorMessage({
          portalLabel: 'Mercado Libre',
          page,
          normalizedUrl,
          responseStatus,
          responseStatusText,
          diagnosticSelectors: [
            'a.poly-component__title[href*="/MLA-"]',
            'a.ui-search-item__group__element[href*="/MLA-"]',
            'a[href*="/MLA-"]',
          ],
          cause: error,
        }),
      );
    }

    throw error;
  } finally {
    await browser.close();
  }
}

function buildPortalBrowserArgs() {
  return [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--window-size=1440,1600',
  ];
}

async function createPortalBrowserContext(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  requestOrigin: string,
) {
  const context = await browser.newContext({
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    colorScheme: 'light',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 1600 },
    screen: { width: 1440, height: 1600 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      Referer: `${requestOrigin}/`,
      Origin: requestOrigin,
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Upgrade-Insecure-Requests': '1',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'language', { get: () => 'es-AR' });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin' },
        { name: 'Chrome PDF Viewer' },
        { name: 'Native Client' },
      ],
    });

    const originalQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions);
    if (originalQuery) {
      window.navigator.permissions.query = ((parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters)) as typeof window.navigator.permissions.query;
    }
  });

  return context;
}

async function resolveMercadoLibreInterstitial(page: Page, timeout: number) {
  const acceptSelectors = [
    'button:has-text("Aceptar cookies")',
    'button:has-text("Aceptar")',
    'a:has-text("Aceptar cookies")',
  ];

  for (const selector of acceptSelectors) {
    try {
      const candidate = page.locator(selector).first();
      if ((await candidate.count()) > 0) {
        await candidate.click({ timeout: 2000 });
        await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 8000) }).catch(() => {});
        break;
      }
    } catch {
      // Ignore and try the next selector.
    }
  }

  if (page.url().includes('/gz/account-verification')) {
    try {
      const targetUrl = new URL(page.url()).searchParams.get('go');
      if (targetUrl) {
        await page.goto(decodeURIComponent(targetUrl), {
          waitUntil: 'domcontentloaded',
          timeout,
        });
        await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 8000) }).catch(() => {});
      }
    } catch {
      // Keep current page; diagnostics will explain the failure if results still do not appear.
    }
  }
}

async function buildBrowserPortalErrorMessage(input: {
  portalLabel?: string;
  page: Page;
  normalizedUrl: string;
  responseStatus: number | null;
  responseStatusText: string | null;
  diagnosticSelectors?: string[];
  cause?: unknown;
}) {
  const finalUrl = safeTruncate(input.page.url(), 220);
  const title = safeTruncate(await safeGetPageTitle(input.page), 120);
  const bodySnippet = safeTruncate(await safeGetBodySnippet(input.page), 280);
  const selectorDiagnostics = await Promise.all(
    (input.diagnosticSelectors ?? []).map(async (selector) => {
      try {
        const count = await input.page!.locator(selector).count();
        return `${selector}=${count}`;
      } catch {
        return `${selector}=ERR`;
      }
    }),
  );

  const statusLabel =
    input.responseStatus !== null
      ? `${input.responseStatus}${input.responseStatusText ? ` ${input.responseStatusText}` : ''}`
      : 'sin respuesta HTTP';
  const causeLabel =
    input.cause instanceof Error && input.cause.message
      ? ` | detalle: ${safeTruncate(input.cause.message.replace(/\s+/g, ' ').trim(), 220)}`
      : '';
  const selectorsLabel =
    selectorDiagnostics.length > 0
      ? ` | selectores: ${selectorDiagnostics.join(', ')}`
      : '';
  const titleLabel = title ? ` | titulo: ${title}` : '';
  const finalUrlLabel = finalUrl ? ` | url final: ${finalUrl}` : '';
  const bodyLabel = bodySnippet ? ` | muestra: ${bodySnippet}` : '';
  const portalLabel = input.portalLabel ? `${input.portalLabel} ` : '';

  return `No se pudo consultar el portal externo (${portalLabel}${statusLabel}): ${input.normalizedUrl}${finalUrlLabel}${titleLabel}${selectorsLabel}${bodyLabel}${causeLabel}`;
}

async function safeGetPageTitle(page: Page) {
  try {
    return normalizeWhitespace(await page.title());
  } catch {
    return '';
  }
}

async function safeGetBodySnippet(page: Page) {
  try {
    const bodyText = await page.locator('body').innerText({ timeout: 2000 });
    return normalizeWhitespace(bodyText);
  } catch {
    return '';
  }
}

function safeTruncate(value: string, maxLength: number) {
  if (!value) {
    return '';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function extractGroupedAnchors(
  html: string,
  origin: string,
  shouldInclude: (href: string) => boolean,
) {
  const groups = new Map<
    string,
    {
      href: string;
      textParts: string[];
      htmlParts: string[];
    }
  >();

  const cleanedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const anchorPattern = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  for (let match = anchorPattern.exec(cleanedHtml); match; match = anchorPattern.exec(cleanedHtml)) {
    const href = normalizeHref(match[2], origin);
    if (!href || !shouldInclude(href)) {
      continue;
    }

    const innerHtml = decodePortalHtml(match[3]);
    const text = normalizeWhitespace(stripTags(innerHtml));
    if (!text) {
      continue;
    }

    const group = groups.get(href) ?? { href, textParts: [], htmlParts: [] };
    if (!group.textParts.includes(text)) {
      group.textParts.push(text);
    }
    if (!group.htmlParts.includes(innerHtml)) {
      group.htmlParts.push(innerHtml);
    }
    groups.set(href, group);
  }

  return Array.from(groups.values()).map((group) => ({
    href: group.href,
    text: normalizeWhitespace(group.textParts.join(' ')),
    html: group.htmlParts.join(' '),
  }));
}

function parseArgenpropAnchor(
  anchor: { href: string; text: string; html: string },
  requirement: SearchRequirement,
  index: number,
) {
  if (!anchor.text.includes('Venta') && !anchor.text.includes('Alquiler')) {
    return null;
  }

  const price = extractPrice(anchor.text);
  const neighborhood =
    capture(anchor.text, /en (?:Venta|Alquiler) en ([^,]+),/i) ??
    capture(anchor.text, /en ([^,]+), Capital Federal/i);
  const description = anchor.text;
  const previewImageUrl = extractImageUrl(anchor.html, anchor.href);
  const title =
    capture(anchor.text, /(\b[A-ZÁÉÍÓÚÑ][^.]{20,120})/) ??
    `Publicacion ${index + 1} ${propertyTypeLabel[requirement.propertyType]}`;

  const finalTitle = deriveExternalListingTitle(anchor.text, title, requirement, index);

  return {
    providerKey: PortalProviderKey.ARGENPROP,
    externalListingId: extractArgenpropExternalId(anchor.href) ?? `ARGENPROP-${index + 1}`,
    canonicalUrl: anchor.href,
    title: truncate(finalTitle, 160),
    description: truncate(description, 1200),
    operationType: requirement.operationType,
    propertyType: requirement.propertyType,
    price,
    currency: requirement.currency,
    neighborhood,
    city: 'Capital Federal',
    rooms: extractInteger(anchor.text, /(\d+)\s*amb/i),
    bedrooms: extractInteger(anchor.text, /(\d+)\s*dorm/i),
    bathrooms: extractInteger(anchor.text, /(\d+)\s*bañ/i),
    hasGarage: /cochera/i.test(anchor.text) ? true : null,
    totalArea:
      extractNumber(anchor.text, /(\d+(?:[.,]\d+)?)\s*m²/i) ??
      extractNumber(anchor.text, /sup\. total:\s*(\d+(?:[.,]\d+)?)\s*m2/i),
    rawPayload: {
      source: 'argenprop-html',
      anchorText: anchor.text,
      anchorHtml: truncate(anchor.html, 3000),
      previewImageUrl,
      searchUrlPattern: 'category-page',
    },
  };
}

function parseZonapropAnchor(
  anchor: { href: string; text: string; html: string },
  requirement: SearchRequirement,
  index: number,
) {
  if (
    !/USD|\b\d+\s*amb/i.test(anchor.text) ||
    (!anchor.text.includes('Caballito') &&
      requirement.neighborhoods.length > 0 &&
      !requirement.neighborhoods.some((neighborhood) =>
        normalizeTextSimple(anchor.text).includes(normalizeTextSimple(neighborhood)),
      ))
  ) {
    return null;
  }

  const title =
    capture(anchor.text, /(Venta[^.]{20,140}|Departamento[^.]{20,140}|PH[^.]{20,140})/i) ??
    `Publicacion ${index + 1} ${propertyTypeLabel[requirement.propertyType]}`;
  const description = anchor.text;
  const neighborhood =
    capture(anchor.text, /([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s]+), Capital Federal/i) ??
    requirement.neighborhoods[0] ??
    null;

  const previewImageUrl = extractImageUrl(anchor.html, anchor.href);
  const finalTitle = deriveExternalListingTitle(anchor.text, title, requirement, index);

  return {
    providerKey: PortalProviderKey.ZONAPROP,
    externalListingId:
      extractZonapropExternalId(anchor.href) ?? `ZONAPROP-${index + 1}`,
    canonicalUrl: anchor.href,
    title: truncate(finalTitle, 160),
    description: truncate(description, 1200),
    operationType: requirement.operationType,
    propertyType: requirement.propertyType,
    price: extractPrice(anchor.text),
    currency: requirement.currency,
    neighborhood,
    city: 'Capital Federal',
    rooms: extractInteger(anchor.text, /(\d+)\s*amb/i),
    bedrooms: extractInteger(anchor.text, /(\d+)\s*dorm/i),
    bathrooms: extractInteger(anchor.text, /(\d+)\s*bañ/i),
    hasGarage: /coch/i.test(anchor.text) ? true : null,
    totalArea: extractNumber(anchor.text, /(\d+(?:[.,]\d+)?)\s*m²/i),
    rawPayload: {
      source: 'zonaprop-html',
      anchorText: anchor.text,
      anchorHtml: truncate(anchor.html, 3000),
      previewImageUrl,
      searchUrlPattern: 'category-page',
    },
  };
}

function parseMercadoLibreAnchor(
  anchor: { href: string; text: string; html: string },
  requirement: SearchRequirement,
  index: number,
) {
  if (
    !/(USD|\$)/.test(anchor.text) ||
    (!anchor.text.includes('Capital Federal') &&
      requirement.neighborhoods.length > 0 &&
      !requirement.neighborhoods.some((neighborhood) =>
        normalizeTextSimple(anchor.text).includes(normalizeTextSimple(neighborhood)),
      ))
  ) {
    return null;
  }

  const title =
    capture(anchor.text, /(Ph en venta[^.]{20,160}|Venta[^.]{20,160}|Departamento[^.]{20,160}|Casa[^.]{20,160})/i) ??
    `Publicacion ${index + 1} ${propertyTypeLabel[requirement.propertyType]}`;
  const description = anchor.text;
  const neighborhood =
    capture(anchor.text, /([^,]+), Capital Federal/i) ?? requirement.neighborhoods[0] ?? null;
  const previewImageUrl = extractImageUrl(anchor.html, anchor.href);
  const finalTitle = deriveExternalListingTitle(anchor.text, title, requirement, index);

  return {
    providerKey: PortalProviderKey.MERCADOLIBRE,
    externalListingId:
      extractMercadoLibreExternalId(anchor.href) ?? `MERCADOLIBRE-${index + 1}`,
    canonicalUrl: anchor.href,
    title: truncate(finalTitle, 160),
    description: truncate(description, 1200),
    operationType: requirement.operationType,
    propertyType: requirement.propertyType,
    price: extractPrice(anchor.text),
    currency: requirement.currency,
    neighborhood,
    city: 'Capital Federal',
    rooms: extractInteger(anchor.text, /(\d+)\s*ambs?/i),
    bedrooms: extractInteger(anchor.text, /(\d+)\s*dorm/i),
    bathrooms: extractInteger(anchor.text, /(\d+)\s*ba(?:ñ|n)os?/i),
    hasGarage: /cocher/i.test(anchor.text) ? true : null,
    totalArea:
      extractNumber(anchor.text, /(\d+(?:[.,]\d+)?)\s*m²/i) ??
      extractNumber(anchor.text, /(\d+(?:[.,]\d+)?)\s*m2/i),
    rawPayload: {
      source: 'mercadolibre-html',
      anchorText: anchor.text,
      anchorHtml: truncate(anchor.html, 3000),
      previewImageUrl,
      searchUrlPattern: 'category-page',
    },
  };
}

function normalizeHref(href: string, origin: string) {
  try {
    return new URL(href, origin).toString();
  } catch {
    return null;
  }
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function decodePortalHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&uuml;/gi, 'ü');
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&uuml;/gi, 'ü');
}

function extractImageUrl(html: string, pageUrl: string) {
  const match =
    html.match(/\b(?:src|data-src|data-original)=["']([^"']+)["']/i) ??
    html.match(/url\((https?:\/\/[^)]+)\)/i);
  const rawUrl = match?.[1];
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(decodePortalHtml(rawUrl), pageUrl).toString();
  } catch {
    return null;
  }
}

function deriveExternalListingTitle(
  text: string,
  currentTitle: string,
  requirement: SearchRequirement,
  index: number,
) {
  const normalizedCurrentTitle = normalizeWhitespace(currentTitle);
  if (!isAuxiliaryListingTitle(normalizedCurrentTitle)) {
    return normalizedCurrentTitle;
  }

  return (
    capture(text, /\b(?:Venta|Alquiler)\b[^.]*? en [^.]+?\.\s*([^.]{12,140})/i) ??
    capture(text, /\b(?:USD|\$)\s*[\d.\s,]+(?:[^\w]|$)\s*([^.]{12,140})/i) ??
    capture(text, /(\b(?:Departamento|Casa|PH|Lote|Oficina|Local)[^.]{12,140})/i) ??
    `Publicacion ${index + 1} ${propertyTypeLabel[requirement.propertyType]}`
  );
}

function isAuxiliaryListingTitle(value: string) {
  const normalized = normalizeTextSimple(value);
  return (
    normalized.startsWith('ver mas fotos') ||
    normalized.includes('ver mas fotos') ||
    normalized.startsWith('visto ') ||
    normalized.length < 10
  );
}

function extractPrice(value: string) {
  const match = value.match(/USD\s*([\d.,]+)/i) ?? value.match(/\$\s*([\d.,]+)/);
  if (!match) {
    return null;
  }

  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}

function extractInteger(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match ? Number(match[1]) : null;
}

function extractNumber(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match ? Number(match[1].replace(/\./g, '').replace(',', '.')) : null;
}

function capture(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractArgenpropExternalId(url: string) {
  return capture(url, /--(\d+)(?:\?|$)/);
}

function extractZonapropExternalId(url: string) {
  return capture(url, /-([0-9]{6,})\.html(?:\?|$)/);
}

function extractZonapropListingSlug(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').filter(Boolean).pop() ?? '';
    return segment.replace(/\.html$/i, '');
  } catch {
    return '';
  }
}

function extractTitleFromListingSlug(slug: string) {
  if (!slug) {
    return null;
  }

  const withoutId = slug.replace(/-\d{6,}$/i, '');
  const withoutPrefix = withoutId
    .replace(/^clasificado-/i, '')
    .replace(/^[^-]+-venta-/i, '')
    .replace(/^[^-]+-alquiler-/i, '')
    .replace(/^[^-]+-/i, '');
  const words = withoutPrefix
    .split('-')
    .filter(Boolean)
    .filter(
      (word) =>
        !['en', 'de', 'del', 'con', 'sin', 'a', 'por', 'y', 'capital', 'federal'].includes(word),
    );

  if (words.length < 3) {
    return null;
  }

  return words
    .slice(0, 12)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractNeighborhoodFromListingSlug(slug: string, neighborhoods: string[]) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = normalizeTextSimple(slug);
  return (
    neighborhoods.find((candidateNeighborhood) =>
      normalizedSlug.includes(slugify(candidateNeighborhood)),
    ) ?? null
  );
}

function parseZonapropFallbackAnchor(
  anchor: { href: string; text: string; html: string },
  requirement: SearchRequirement,
  index: number,
) {
  const slug = extractZonapropListingSlug(anchor.href);
  if (!slug) {
    return null;
  }

  const neighborhood =
    extractNeighborhoodFromListingSlug(slug, requirement.neighborhoods) ??
    requirement.neighborhoods[0] ??
    null;
  if (requirement.neighborhoods.length > 0 && !neighborhood) {
    return null;
  }

  const title = extractTitleFromListingSlug(slug);
  if (!title) {
    return null;
  }

  const combinedText = `${title} ${anchor.text}`.trim();
  const previewImageUrl = extractImageUrl(anchor.html, anchor.href);

  return {
    providerKey: PortalProviderKey.ZONAPROP,
    externalListingId:
      extractZonapropExternalId(anchor.href) ?? `ZONAPROP-${index + 1}`,
    canonicalUrl: anchor.href,
    title: truncate(deriveExternalListingTitle(combinedText, title, requirement, index), 160),
    description: truncate(combinedText || title, 1200),
    operationType: requirement.operationType,
    propertyType: requirement.propertyType,
    price: extractPrice(anchor.text),
    currency: requirement.currency,
    neighborhood,
    city: 'Capital Federal',
    rooms:
      extractInteger(combinedText, /(\d+)\s*amb/i) ??
      extractInteger(combinedText, /(\d+)\s*ambientes/i),
    bedrooms: extractInteger(combinedText, /(\d+)\s*dorm/i),
    bathrooms: extractInteger(combinedText, /(\d+)\s*baÃ±/i),
    hasGarage: /coch/i.test(combinedText) ? true : null,
    totalArea: extractNumber(combinedText, /(\d+(?:[.,]\d+)?)\s*mÂ²/i),
    rawPayload: {
      source: 'zonaprop-html-fallback',
      anchorText: anchor.text,
      anchorHtml: truncate(anchor.html, 3000),
      previewImageUrl,
      searchUrlPattern: 'category-page',
      listingSlug: slug,
    },
  };
}

function extractMercadoLibreExternalId(url: string) {
  return (
    capture(url, /\/(MLA-\d+)(?:[/?]|$)/i) ??
    capture(url, /\/([^/?#]+)(?:[/?#]|$)/)
  );
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizePortalBaseUrl(providerKey: PortalProviderKey, value?: string | null) {
  if (!value) {
    return null;
  }

  if (
    providerKey !== PortalProviderKey.ZONAPROP &&
    providerKey !== PortalProviderKey.ARGENPROP
  ) {
    return trimTrailingSlash(value);
  }

  try {
    const url = new URL(value);
    if (url.hostname === 'www.zonaprop.com.ar') {
      url.hostname = 'zonaprop.com.ar';
    }
    if (url.hostname === 'www.argenprop.com') {
      url.hostname = 'argenprop.com';
    }

    url.pathname = '';
    url.search = '';
    url.hash = '';
    return trimTrailingSlash(url.toString());
  } catch {
    return trimTrailingSlash(
      value
        .replace('://www.zonaprop.com.ar', '://zonaprop.com.ar')
        .replace('://www.argenprop.com', '://argenprop.com'),
    );
  }
}

function normalizePortalRequestUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === 'www.zonaprop.com.ar') {
      url.hostname = 'zonaprop.com.ar';
    }
    if (url.hostname === 'www.argenprop.com') {
      url.hostname = 'argenprop.com';
    }
    return url.toString();
  } catch {
    return value
      .replace('://www.zonaprop.com.ar', '://zonaprop.com.ar')
      .replace('://www.argenprop.com', '://argenprop.com');
  }
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function buildZonapropFilterSlugs(requirement: SearchRequirement) {
  const slugs = new Set<string>();

  if (requirement.needsParking) {
    slugs.add('con-cochera');
  }

  for (const amenity of requirement.amenities ?? []) {
    const amenitySlug = zonapropAmenitySlug[amenity];
    if (amenitySlug) {
      slugs.add(amenitySlug);
    }
  }

  return Array.from(slugs).slice(0, 2);
}

function normalizeTextSimple(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const argenpropPropertyTypeSlug: Record<PropertyType, string> = {
  [PropertyType.HOUSE]: 'casas',
  [PropertyType.APARTMENT]: 'departamentos',
  [PropertyType.PH]: 'ph',
  [PropertyType.LAND]: 'terrenos',
  [PropertyType.OFFICE]: 'oficinas',
  [PropertyType.COMMERCIAL]: 'locales',
  [PropertyType.OTHER]: 'propiedades',
};

const zonapropPropertyTypeSlug: Record<PropertyType, string> = {
  [PropertyType.HOUSE]: 'casa',
  [PropertyType.APARTMENT]: 'departamento',
  [PropertyType.PH]: 'ph',
  [PropertyType.LAND]: 'terreno',
  [PropertyType.OFFICE]: 'oficina-comercial',
  [PropertyType.COMMERCIAL]: 'local-comercial',
  [PropertyType.OTHER]: 'departamento',
};

const mercadolibrePropertyTypeSlug: Record<PropertyType, string> = {
  [PropertyType.HOUSE]: 'casas',
  [PropertyType.APARTMENT]: 'departamentos',
  [PropertyType.PH]: 'ph',
  [PropertyType.LAND]: 'terrenos',
  [PropertyType.OFFICE]: 'oficinas',
  [PropertyType.COMMERCIAL]: 'locales',
  [PropertyType.OTHER]: 'departamentos',
};

const zonapropAmenitySlug: Record<string, string | undefined> = {
  POOL: 'con-pileta',
  GRILL: 'con-parrilla',
  DOORMAN: 'con-porteria',
  SECURITY: 'con-seguridad',
  ELEVATOR: 'con-ascensor',
  SPORTS_COURT: 'con-cancha-deportes',
  GYM: 'con-gimnasio',
  LAUNDRY: 'con-laundry',
  QUINCHO: 'con-quincho',
  SOLARIUM: 'con-solarium',
  SUM: 'con-sum',
};
