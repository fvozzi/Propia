import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { chromium } from 'playwright';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Contact } from '../contacts/contact.entity';
import { paginate } from '../common/pagination';
import { ActivityType } from '../common/enums';
import { Property } from '../properties/property.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import {
  buildAppraisalRequestActivityTitle,
  createAppraisalRequestExpiration,
  createPublicFormToken,
} from '../use-cases/appraisal-initial-intake.use-case';
import { ActivityCalendarSyncService } from './activity-calendar-sync.service';
import { extractDomain, parseActivityPreviewMetadata } from './activity-preview.utils';
import { Activity } from './activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { ShareActivityDto } from './dto/share-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(AppraisalRequest)
    private readonly appraisalRequestsRepository: Repository<AppraisalRequest>,
    private readonly activityCalendarSyncService: ActivityCalendarSyncService,
  ) {}

  async create(dto: CreateActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    await this.assertScopedRelations(dto.contactId ?? null, dto.propertyId ?? null, dto.appraisalRequestId ?? null, teamId);
    this.assertPropertySearchPayload(dto.activityType, dto.externalUrl);
    const nextTitle =
      dto.activityType === ActivityType.APPRAISAL_REQUEST
        ? buildAppraisalRequestActivityTitle(dto.appraisalPropertyAddress ?? null)
        : dto.title;
    const preview =
      dto.activityType === ActivityType.PROPERTY_SEARCH
        ? await this.resolvePropertySearchPreview(dto.externalUrl?.trim() || null, nextTitle, null)
        : createEmptyActivityPreview();

    let appraisalRequestId = dto.appraisalRequestId ?? null;

    if (dto.activityType === ActivityType.APPRAISAL_REQUEST) {
      if (!dto.contactId) {
        throw new BadRequestException('La actividad de solicitud de tasacion requiere un contacto');
      }
      if (!dto.appraisalPropertyAddress?.trim()) {
        throw new BadRequestException('La actividad de solicitud de tasacion requiere direccion de la propiedad');
      }

      const request = await this.appraisalRequestsRepository.save(
        this.appraisalRequestsRepository.create({
          teamId,
          ownerUserId: user.sub,
          contactId: dto.contactId,
          propertyAddress: dto.appraisalPropertyAddress.trim(),
          publicToken: createPublicFormToken(),
          expiresAt: createAppraisalRequestExpiration(),
          submittedAt: null,
        }),
      );
      appraisalRequestId = request.id;
    }

    const activity = this.activitiesRepository.create({
      ...dto,
      teamId,
      ownerUserId: user.sub,
      googleEventId: null,
      googleSyncStatus: 'PENDING',
      lastSyncedAt: null,
      googleSyncError: null,
      activityDate: new Date(dto.activityDate),
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      contactId: dto.contactId ?? null,
      propertyId: dto.propertyId ?? null,
      appraisalRequestId,
      title: nextTitle,
      externalUrl: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.externalUrl?.trim() || null : null,
      externalPreviewImageUrl: preview.imageUrl,
      externalPreviewTitle: preview.title,
      externalPreviewDescription: preview.description,
      externalPreviewDomain: preview.domain,
      externalPreviewFetchedAt: preview.fetchedAt,
      whatsappComment: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.whatsappComment?.trim() || null : null,
      whatsappSharedAt: dto.whatsappSharedAt ? new Date(dto.whatsappSharedAt) : null,
      propertySearchLiked: dto.activityType === ActivityType.PROPERTY_SEARCH ? dto.propertySearchLiked ?? null : null,
    });

    const saved = await this.activitiesRepository.save(activity);
    await this.activityCalendarSyncService.syncById(saved.id, 'create');
    return this.findOne(saved.id, user);
  }

  async findAll(query: QueryActivitiesDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const followUpDayStart = new Date();
    followUpDayStart.setHours(0, 0, 0, 0);
    const followUpDayEnd = new Date(followUpDayStart);
    followUpDayEnd.setDate(followUpDayEnd.getDate() + 1);
    const qb = this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.contact', 'contact')
      .leftJoinAndSelect('activity.property', 'property')
      .leftJoinAndSelect('activity.appraisalRequest', 'appraisalRequest')
      .where('activity.teamId = :teamId', { teamId })
      .orderBy('activity.activityDate', 'DESC');

    if (query.contactId) {
      qb.andWhere('activity.contactId = :contactId', { contactId: query.contactId });
    }

    if (query.activityType) {
      qb.andWhere('activity.activityType = :activityType', { activityType: query.activityType });
    }

    if (query.propertySearchFeedback) {
      qb.andWhere('activity.activityType = :propertySearchType', {
        propertySearchType: ActivityType.PROPERTY_SEARCH,
      });

      if (query.propertySearchFeedback === 'LIKED') {
        qb.andWhere('activity.propertySearchLiked = true');
      } else if (query.propertySearchFeedback === 'DISLIKED') {
        qb.andWhere('activity.propertySearchLiked = false');
      } else {
        qb.andWhere('activity.propertySearchLiked IS NULL');
      }
    }

    if (query.whatsappShareStatus) {
      qb.andWhere('activity.activityType = :shareActivityType', {
        shareActivityType: ActivityType.PROPERTY_SEARCH,
      });

      if (query.whatsappShareStatus === 'PENDING') {
        qb.andWhere('activity.whatsappSharedAt IS NULL');
      } else {
        qb.andWhere('activity.whatsappSharedAt IS NOT NULL');
      }
    }

    if (query.propertyId) {
      qb.andWhere('activity.propertyId = :propertyId', { propertyId: query.propertyId });
    }

    if (query.nextFollowUpStatus) {
      qb.andWhere('activity.nextFollowUpDate IS NOT NULL');

      if (query.nextFollowUpStatus === 'DUE_TODAY') {
        qb.andWhere('activity.nextFollowUpDate >= :followUpDayStart', {
          followUpDayStart: followUpDayStart.toISOString(),
        });
        qb.andWhere('activity.nextFollowUpDate < :followUpDayEnd', {
          followUpDayEnd: followUpDayEnd.toISOString(),
        });
      } else {
        qb.andWhere('activity.nextFollowUpDate < :followUpDayStart', {
          followUpDayStart: followUpDayStart.toISOString(),
        });
      }
    }

    if (query.nextFollowUpDate) {
      qb.andWhere('DATE(activity.nextFollowUpDate) = :followUpDate', {
        followUpDate: query.nextFollowUpDate,
      });
    }

    if (query.fromDate) {
      qb.andWhere('DATE(activity.activityDate) >= :fromDate', {
        fromDate: query.fromDate,
      });
    }

    if (query.toDate) {
      qb.andWhere('DATE(activity.activityDate) <= :toDate', {
        toDate: query.toDate,
      });
    }

    return paginate(qb, query);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
      relations: { contact: true, property: true, appraisalRequest: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return activity;
  }

  async update(id: number, dto: UpdateActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
      relations: { appraisalRequest: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.activityType === ActivityType.APPRAISAL_REQUEST && dto.activityType && dto.activityType !== ActivityType.APPRAISAL_REQUEST) {
      throw new BadRequestException('La actividad de solicitud de tasacion no puede cambiar de tipo');
    }

    const nextActivityType = dto.activityType ?? activity.activityType;
    const nextContactId = dto.contactId === undefined ? activity.contactId : dto.contactId ?? null;
    const nextPropertyId = dto.propertyId === undefined ? activity.propertyId : dto.propertyId ?? null;
    const nextAppraisalRequestId = activity.appraisalRequestId;
    await this.assertScopedRelations(nextContactId ?? null, nextPropertyId ?? null, nextAppraisalRequestId ?? null, teamId);
    this.assertPropertySearchPayload(nextActivityType, dto.externalUrl ?? activity.externalUrl ?? undefined);
    const nextTitle =
      nextActivityType === ActivityType.APPRAISAL_REQUEST
        ? buildAppraisalRequestActivityTitle(
            dto.appraisalPropertyAddress ?? activity.appraisalRequest?.propertyAddress ?? null,
          )
        : dto.title ?? activity.title;
    const nextExternalUrl =
      nextActivityType === ActivityType.PROPERTY_SEARCH
        ? dto.externalUrl === undefined
          ? activity.externalUrl
          : dto.externalUrl?.trim() || null
        : null;
    const preview =
      nextActivityType === ActivityType.PROPERTY_SEARCH
        ? await this.resolvePropertySearchPreview(nextExternalUrl, nextTitle, activity)
        : createEmptyActivityPreview();

    if (nextActivityType === ActivityType.APPRAISAL_REQUEST) {
      if (!nextContactId) {
        throw new BadRequestException('La actividad de solicitud de tasacion requiere un contacto');
      }

      if (activity.appraisalRequest) {
        activity.appraisalRequest.contactId = nextContactId;
        if (dto.appraisalPropertyAddress !== undefined) {
          const propertyAddress = dto.appraisalPropertyAddress.trim();
          if (!propertyAddress) {
            throw new BadRequestException('La actividad de solicitud de tasacion requiere direccion de la propiedad');
          }
          activity.appraisalRequest.propertyAddress = propertyAddress;
        }
        await this.appraisalRequestsRepository.save(activity.appraisalRequest);
      }
    }

    Object.assign(activity, {
      ...dto,
      activityDate: dto.activityDate ? new Date(dto.activityDate) : activity.activityDate,
      nextFollowUpDate:
        dto.nextFollowUpDate === undefined
          ? activity.nextFollowUpDate
          : dto.nextFollowUpDate
            ? new Date(dto.nextFollowUpDate)
            : null,
      contactId: nextContactId,
      propertyId: nextPropertyId,
      appraisalRequestId: nextAppraisalRequestId ?? null,
      title: nextTitle,
      externalUrl: nextExternalUrl,
      externalPreviewImageUrl: preview.imageUrl,
      externalPreviewTitle: preview.title,
      externalPreviewDescription: preview.description,
      externalPreviewDomain: preview.domain,
      externalPreviewFetchedAt: preview.fetchedAt,
      whatsappComment:
        nextActivityType === ActivityType.PROPERTY_SEARCH
          ? dto.whatsappComment === undefined
            ? activity.whatsappComment
            : dto.whatsappComment?.trim() || null
          : null,
      whatsappSharedAt:
        nextActivityType !== ActivityType.PROPERTY_SEARCH
          ? null
          : dto.whatsappSharedAt === undefined
          ? activity.whatsappSharedAt
          : dto.whatsappSharedAt
            ? new Date(dto.whatsappSharedAt)
            : null,
      propertySearchLiked:
        nextActivityType !== ActivityType.PROPERTY_SEARCH
          ? null
          : dto.propertySearchLiked === undefined
            ? activity.propertySearchLiked
            : dto.propertySearchLiked,
    });

    await this.activitiesRepository.save(activity);
    await this.activityCalendarSyncService.syncById(activity.id, 'update');
    return this.findOne(id, user);
  }

  async share(id: number, dto: ShareActivityDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
      relations: { contact: true, property: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.activityType !== ActivityType.PROPERTY_SEARCH) {
      throw new BadRequestException('Solo las actividades de busqueda de propiedad se pueden compartir por WhatsApp');
    }

    if (!activity.externalUrl) {
      throw new BadRequestException('La actividad no tiene link para compartir');
    }

    activity.whatsappComment = dto.whatsappComment?.trim() || activity.whatsappComment;
    activity.whatsappSharedAt = new Date();
    await this.activitiesRepository.save(activity);
    await this.activityCalendarSyncService.syncById(activity.id, 'update');
    return this.findOne(id, user);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id, teamId },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    await this.activityCalendarSyncService.deleteExternal(activity);

    if (activity.appraisalRequestId) {
      const appraisalRequest = await this.appraisalRequestsRepository.findOne({
        where: { id: activity.appraisalRequestId, teamId },
      });

      if (appraisalRequest) {
        await this.appraisalRequestsRepository.remove(appraisalRequest);
      }
    }

    await this.activitiesRepository.remove(activity);
    return { success: true };
  }

  private async assertScopedRelations(
    contactId: number | null,
    propertyId: number | null,
    appraisalRequestId: number | null,
    teamId: number | null,
  ) {
    if (contactId && teamId) {
      const contact = await this.contactsRepository.findOne({
        where: { id: contactId, teamId },
      });

      if (!contact) {
        throw new NotFoundException('Contacto no encontrado');
      }
    }

    if (propertyId && teamId) {
      const property = await this.propertiesRepository.findOne({
        where: { id: propertyId, teamId },
      });

      if (!property) {
        throw new NotFoundException('Propiedad no encontrada');
      }
    }

    if (appraisalRequestId && teamId) {
      const appraisalRequest = await this.appraisalRequestsRepository.findOne({
        where: { id: appraisalRequestId, teamId },
      });

      if (!appraisalRequest) {
        throw new NotFoundException('Solicitud de tasacion no encontrada');
      }
    }
  }

  private assertPropertySearchPayload(activityType: ActivityType, externalUrl?: string) {
    if (activityType === ActivityType.PROPERTY_SEARCH && !externalUrl?.trim()) {
      throw new BadRequestException('La actividad de busqueda de propiedad requiere un link');
    }
  }

  private async resolvePropertySearchPreview(
    externalUrl: string | null,
    fallbackTitle: string | null,
    currentActivity: Activity | null,
  ): Promise<ActivityPreviewSnapshot> {
    if (!externalUrl) {
      return createEmptyActivityPreview();
    }

    const hasSameUrl = currentActivity?.externalUrl?.trim() === externalUrl;
    const fallback = {
      imageUrl: null,
      title: fallbackTitle?.trim() || (hasSameUrl ? currentActivity?.externalPreviewTitle : null) || null,
      description: hasSameUrl ? currentActivity?.externalPreviewDescription ?? null : null,
      domain: extractDomain(externalUrl),
      fetchedAt: hasSameUrl ? currentActivity?.externalPreviewFetchedAt ?? null : null,
    } satisfies ActivityPreviewSnapshot;

    if (
      hasSameUrl &&
      (currentActivity.externalPreviewImageUrl ||
        currentActivity.externalPreviewTitle ||
        currentActivity.externalPreviewDescription ||
        currentActivity.externalPreviewDomain)
    ) {
      return {
        imageUrl: currentActivity.externalPreviewImageUrl,
        title: currentActivity.externalPreviewTitle ?? fallback.title,
        description: currentActivity.externalPreviewDescription,
        domain: currentActivity.externalPreviewDomain ?? fallback.domain,
        fetchedAt: currentActivity.externalPreviewFetchedAt,
      };
    }

    try {
      const html = await fetchActivityPreviewHtml(externalUrl);
      const parsed = parseActivityPreviewMetadata(html, externalUrl);
      const fetchedAt =
        parsed.imageUrl || parsed.title || parsed.description ? new Date() : fallback.fetchedAt;

      return {
        imageUrl: parsed.imageUrl,
        title: parsed.title ?? fallback.title,
        description: parsed.description ?? null,
        domain: parsed.domain ?? fallback.domain,
        fetchedAt,
      };
    } catch {
      return fallback;
    }
  }
}

type ActivityPreviewSnapshot = {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
  fetchedAt: Date | null;
};

function createEmptyActivityPreview(): ActivityPreviewSnapshot {
  return {
    imageUrl: null,
    title: null,
    description: null,
    domain: null,
    fetchedAt: null,
  };
}

async function fetchActivityPreviewHtml(url: string) {
  try {
    return await fetchActivityPreviewHtmlWithFetch(url);
  } catch (error) {
    if (!requiresBrowserPreview(url, error)) {
      throw error;
    }

    return fetchActivityPreviewHtmlWithBrowser(url);
  }
}

async function fetchActivityPreviewHtmlWithFetch(url: string) {
  const normalizedUrl = normalizeActivityPreviewRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(normalizedUrl, {
      redirect: 'follow',
      signal: controller.signal,
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
      throw new Error(`preview-fetch:${response.status}:${normalizedUrl}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchActivityPreviewHtmlWithBrowser(url: string) {
  const normalizedUrl = normalizeActivityPreviewRequestUrl(url);
  const requestOrigin = new URL(normalizedUrl).origin;
  const timeout = Number.parseInt(process.env.PORTAL_BROWSER_TIMEOUT_MS ?? '25000', 10);
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      locale: 'es-AR',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 1600 },
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        Referer: `${requestOrigin}/`,
        Origin: requestOrigin,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (/mercadolibre\.com\.ar/i.test(normalizedUrl)) {
      await context.addCookies([
        {
          name: '_bm_skipml',
          value: 'true',
          domain: '.mercadolibre.com.ar',
          path: '/',
          expires: Math.floor(Date.now() / 1000) + 300,
        },
      ]);
    }

    const page = await context.newPage();
    const response = await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    if (response && !response.ok()) {
      throw new Error(`preview-browser:${response.status()}:${normalizedUrl}`);
    }

    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 10000) }).catch(() => {});
    const html = await page.content();
    await context.close();
    return html;
  } finally {
    await browser.close();
  }
}

function normalizeActivityPreviewRequestUrl(url: string) {
  return url.replace('://www.zonaprop.com.ar', '://zonaprop.com.ar');
}

function requiresBrowserPreview(url: string, error: unknown) {
  if (url.includes('zonaprop.com.ar') || url.includes('mercadolibre.com.ar')) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /preview-fetch:403:|preview-fetch:429:|preview-fetch:503:/i.test(error.message);
}
