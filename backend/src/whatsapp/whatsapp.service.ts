import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../auth/team.entity';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Activity } from '../activities/activity.entity';
import {
  ActivityType,
  WhatsappMessageDirection,
  WhatsappMessageStatus,
} from '../common/enums';
import { WhatsappMessage } from './whatsapp-message.entity';

@Injectable()
export class WhatsappService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(WhatsappMessage)
    private readonly whatsappMessagesRepository: Repository<WhatsappMessage>,
    private readonly configService: ConfigService,
  ) {}

  async sendActivityMessage(activityId: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id: activityId, teamId },
      relations: {
        contact: true,
        appraisalRequest: true,
      },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (
      activity.activityType !== ActivityType.PROPERTY_SEARCH &&
      activity.activityType !== ActivityType.APPRAISAL_REQUEST
    ) {
      throw new BadRequestException(
        'Solo las actividades de busqueda de propiedad y prelistings se pueden enviar por WhatsApp',
      );
    }

    if (!activity.contact) {
      throw new BadRequestException('La actividad necesita un contacto para enviar WhatsApp');
    }

    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    this.assertTeamWhatsappConfiguration(team, activity);

    const toPhone = normalizePhone(activity.contact.whatsapp || activity.contact.phone || '');
    if (!toPhone) {
      throw new BadRequestException('El contacto no tiene un numero de WhatsApp valido');
    }

    let templatePayload = this.buildTemplatePayload(team, activity, toPhone);
    let response: Response;

    try {
      response = await this.sendTemplateRequest(team, templatePayload);
    } catch {
      await this.registerFailedMessage({
        activity,
        team,
        toPhone,
        templatePayload,
        errorMessage: 'No se pudo conectar con WhatsApp Business',
        statusPayload: null,
      });
      throw new InternalServerErrorException('No se pudo conectar con WhatsApp Business');
    }

    let data = (await safeJson(response)) as Record<string, unknown> | null;
    if (
      !response.ok &&
      shouldRetryPropertySearchWithCompactParams(activity, templatePayload, data)
    ) {
      templatePayload = this.buildTemplatePayload(team, activity, toPhone, {
        propertySearchMode: 'compact',
      });

      try {
        response = await this.sendTemplateRequest(team, templatePayload);
        data = (await safeJson(response)) as Record<string, unknown> | null;
      } catch {
        await this.registerFailedMessage({
          activity,
          team,
          toPhone,
          templatePayload,
          errorMessage: 'No se pudo conectar con WhatsApp Business',
          statusPayload: null,
        });
        throw new InternalServerErrorException('No se pudo conectar con WhatsApp Business');
      }
    }

    if (!response.ok) {
      const errorMessage = extractMetaErrorMessage(data) ?? 'No se pudo enviar el mensaje de WhatsApp';
      await this.registerFailedMessage({
        activity,
        team,
        toPhone,
        templatePayload,
        errorMessage,
        statusPayload: data,
      });
      throw new BadRequestException(errorMessage);
    }

    const waMessageId = getNestedString(data, ['messages', '0', 'id']);
    const now = new Date();

    await this.whatsappMessagesRepository.save(
      this.whatsappMessagesRepository.create({
        teamId: activity.teamId,
        contactId: activity.contactId,
        activityId: activity.id,
        direction: WhatsappMessageDirection.OUTBOUND,
        messageType: 'TEMPLATE',
        templateName: getPayloadTemplateName(templatePayload),
        templateLanguage: team.whatsappTemplateLanguageCode ?? defaultTemplateLanguage,
        toPhone,
        waMessageId,
        status: WhatsappMessageStatus.SENT,
        payload: templatePayload,
        statusPayload: data,
        sentAt: now,
        errorMessage: null,
      }),
    );

    activity.whatsappSharedAt = now;
    await this.activitiesRepository.save(activity);

    return this.activitiesRepository.findOne({
      where: { id: activity.id, teamId },
      relations: {
        contact: true,
        property: true,
        appraisalRequest: true,
      },
    });
  }

  async processWebhook(payload: Record<string, unknown>) {
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
        ? ((entry as { changes?: unknown[] }).changes as unknown[])
        : [];

      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> }).value;
        if (!value) {
          continue;
        }

        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const status of statuses) {
          await this.applyStatusUpdate(status as Record<string, unknown>);
        }
      }
    }

    return { received: true };
  }

  private async applyStatusUpdate(statusPayload: Record<string, unknown>) {
    const waMessageId = getScalarString(statusPayload.id);
    if (!waMessageId) {
      return;
    }

    const message = await this.whatsappMessagesRepository.findOne({
      where: { waMessageId },
    });

    if (!message) {
      return;
    }

    const nextStatus = mapWhatsappStatus(getScalarString(statusPayload.status));
    const eventAt = parseMetaTimestamp(getScalarString(statusPayload.timestamp));

    message.status = nextStatus;
    message.statusPayload = statusPayload;

    if (nextStatus === WhatsappMessageStatus.SENT) {
      message.sentAt = eventAt;
    }

    if (nextStatus === WhatsappMessageStatus.DELIVERED) {
      message.deliveredAt = eventAt;
    }

    if (nextStatus === WhatsappMessageStatus.READ) {
      message.readAt = eventAt;
    }

    if (nextStatus === WhatsappMessageStatus.FAILED) {
      message.failedAt = eventAt;
      message.errorMessage =
        getNestedString(statusPayload, ['errors', '0', 'title']) ??
        getNestedString(statusPayload, ['errors', '0', 'message']) ??
        'Envio fallido en WhatsApp';
    }

    await this.whatsappMessagesRepository.save(message);
  }

  private assertTeamWhatsappConfiguration(team: Team, activity: Activity) {
    if (!team.whatsappEnabled) {
      throw new BadRequestException('WhatsApp Business no esta habilitado para este equipo');
    }

    if (!team.whatsappPhoneNumberId || !team.whatsappAccessToken) {
      throw new BadRequestException('Falta configurar Phone Number ID o Access Token de WhatsApp');
    }

    if (
      activity.activityType === ActivityType.PROPERTY_SEARCH &&
      !team.whatsappPropertySearchTemplateName &&
      !team.whatsappPropertySearchImageTemplateName
    ) {
      throw new BadRequestException(
        'Falta configurar la plantilla de WhatsApp para busqueda de propiedad',
      );
    }

    if (
      activity.activityType === ActivityType.PROPERTY_SEARCH &&
      !team.whatsappPropertySearchTemplateName &&
      team.whatsappPropertySearchImageTemplateName &&
      !activity.externalPreviewImageUrl?.trim()
    ) {
      throw new BadRequestException(
        'La actividad no tiene imagen de preview para usar la plantilla de WhatsApp con imagen',
      );
    }

    if (
      activity.activityType === ActivityType.APPRAISAL_REQUEST &&
      !team.whatsappAppraisalTemplateName
    ) {
      throw new BadRequestException(
        'Falta configurar la plantilla de WhatsApp para prelisting',
      );
    }
  }

  private buildTemplatePayload(
    team: Team,
    activity: Activity,
    toPhone: string,
    options: { propertySearchMode?: 'default' | 'compact' } = {},
  ) {
    const propertySearchVariant = resolvePropertySearchTemplateVariant(team, activity, options);
    const templateName = getTemplateName(team, activity, propertySearchVariant);
    const components =
      activity.activityType === ActivityType.PROPERTY_SEARCH
        ? buildPropertySearchComponents(activity, propertySearchVariant)
        : [
            {
              type: 'body',
              parameters: [
                activity.contact?.firstName || activity.contact?.displayName || 'cliente',
                buildPublicAppraisalUrl(
                  this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
                  activity.appraisalRequest?.publicToken ?? '',
                ),
              ].map((value) => ({
                type: 'text',
                text: value,
              })),
            },
          ];

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: team.whatsappTemplateLanguageCode ?? defaultTemplateLanguage,
        },
        components,
      },
    };
  }

  private getGraphApiVersion() {
    return this.configService.get<string>('WHATSAPP_GRAPH_API_VERSION', 'v23.0');
  }

  private async sendTemplateRequest(team: Team, templatePayload: Record<string, unknown>) {
    return fetch(
      `https://graph.facebook.com/${this.getGraphApiVersion()}/${team.whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${team.whatsappAccessToken}`,
        },
        body: JSON.stringify(templatePayload),
      },
    );
  }

  private async registerFailedMessage(input: {
    activity: Activity;
    team: Team;
    toPhone: string;
    templatePayload: Record<string, unknown>;
    errorMessage: string;
    statusPayload: Record<string, unknown> | null;
  }) {
    const now = new Date();

    await this.whatsappMessagesRepository.save(
      this.whatsappMessagesRepository.create({
        teamId: input.activity.teamId,
        contactId: input.activity.contactId,
        activityId: input.activity.id,
        direction: WhatsappMessageDirection.OUTBOUND,
        messageType: 'TEMPLATE',
        templateName: getPayloadTemplateName(input.templatePayload),
        templateLanguage: input.team.whatsappTemplateLanguageCode ?? defaultTemplateLanguage,
        toPhone: input.toPhone,
        waMessageId: null,
        status: WhatsappMessageStatus.FAILED,
        payload: input.templatePayload,
        statusPayload: input.statusPayload,
        failedAt: now,
        errorMessage: input.errorMessage,
      }),
    );
  }
}

const defaultTemplateLanguage = 'es_AR';

type PropertySearchTemplateVariant = 'text-default' | 'text-compact' | 'image';

function getTemplateName(
  team: Team,
  activity: Activity,
  propertySearchVariant: PropertySearchTemplateVariant = 'text-default',
) {
  if (activity.activityType === ActivityType.APPRAISAL_REQUEST) {
    return team.whatsappAppraisalTemplateName ?? '';
  }

  if (propertySearchVariant === 'image') {
    return team.whatsappPropertySearchImageTemplateName ?? '';
  }

  return team.whatsappPropertySearchTemplateName ?? '';
}

function buildPublicAppraisalUrl(frontendUrl: string, token: string) {
  return new URL(`/prelisting/${token}`, frontendUrl).toString();
}

function buildPropertySearchComponents(
  activity: Activity,
  propertySearchVariant: PropertySearchTemplateVariant,
) {
  const contactName = activity.contact?.firstName || activity.contact?.displayName || 'cliente';
  const title = activity.title?.trim() || 'Propiedad';
  const comment = activity.whatsappComment?.trim();
  const externalUrl = activity.externalUrl?.trim() || '-';
  const summary = comment ? `${title}. ${comment}` : title;
  const bodyParameters =
    propertySearchVariant === 'text-default'
      ? [contactName, title, comment || '-', externalUrl]
      : [contactName, summary, externalUrl];

  if (propertySearchVariant === 'image') {
    return [
      {
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              link: activity.externalPreviewImageUrl?.trim() || externalUrl,
            },
          },
        ],
      },
      {
        type: 'body',
        parameters: bodyParameters.map((value) => ({
          type: 'text',
          text: value,
        })),
      },
    ];
  }

  return [
    {
      type: 'body',
      parameters: bodyParameters.map((value) => ({
        type: 'text',
        text: value,
      })),
    },
  ];
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');

  // In the WhatsApp Cloud API sandbox, Argentina mobile recipients are
  // accepted in the same format exposed by Meta Quickstart:
  // 54 + area code + 15 + local number.
  if (digits.startsWith('54911') && digits.length === 13) {
    return `541115${digits.slice(5)}`;
  }

  // Fallback for generic Argentina mobile formatting that usually comes as
  // +54 9 <area><number>. For now we support the common CABA/GBA shape above
  // explicitly and otherwise just remove the visual 9.
  if (digits.startsWith('549')) {
    return `54${digits.slice(3)}`;
  }

  return digits;
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new InternalServerErrorException('Respuesta invalida de WhatsApp');
  }
}

function extractMetaErrorMessage(data: Record<string, unknown> | null) {
  if (!data) {
    return null;
  }

  const error = data.error as { message?: string; error_user_msg?: string } | undefined;
  const details =
    typeof (error as { error_data?: { details?: unknown } } | undefined)?.error_data?.details ===
    'string'
      ? (error as { error_data?: { details?: string } }).error_data?.details
      : null;
  const baseMessage = error?.error_user_msg ?? error?.message ?? null;

  if (!baseMessage) {
    return details ?? null;
  }

  if (/authentication error/i.test(baseMessage)) {
    return 'Authentication Error. Revisa o regenera el Access Token de WhatsApp Business.';
  }

  if (details && !baseMessage.includes(details)) {
    return `${baseMessage} (${details})`;
  }

  return baseMessage;
}

function shouldRetryPropertySearchWithCompactParams(
  activity: Activity,
  templatePayload: Record<string, unknown>,
  data: Record<string, unknown> | null,
) {
  if (activity.activityType !== ActivityType.PROPERTY_SEARCH) {
    return false;
  }

  const components = ((templatePayload.template as { components?: unknown[] } | undefined)?.components ??
    []) as Array<{ parameters?: unknown[] }>;
  const parameterCount = components[0]?.parameters?.length ?? 0;
  if (parameterCount !== 4) {
    return false;
  }

  if (hasHeaderComponent(templatePayload)) {
    return false;
  }

  const details =
    ((data?.error as { error_data?: { details?: unknown } } | undefined)?.error_data?.details as
      | string
      | undefined) ?? '';

  return /expected number of params \(3\)/i.test(details);
}

function resolvePropertySearchTemplateVariant(
  team: Team,
  activity: Activity,
  options: { propertySearchMode?: 'default' | 'compact' } = {},
): PropertySearchTemplateVariant {
  if (
    options.propertySearchMode !== 'compact' &&
    team.whatsappPropertySearchImageTemplateName &&
    activity.externalPreviewImageUrl?.trim()
  ) {
    return 'image';
  }

  if (options.propertySearchMode === 'compact') {
    return 'text-compact';
  }

  return 'text-default';
}

function getPayloadTemplateName(templatePayload: Record<string, unknown>) {
  return getNestedString(templatePayload, ['template', 'name']) ?? '';
}

function hasHeaderComponent(templatePayload: Record<string, unknown>) {
  const components = ((templatePayload.template as { components?: unknown[] } | undefined)?.components ??
    []) as Array<{ type?: unknown }>;
  return components.some((component) => component?.type === 'header');
}

function getNestedString(source: Record<string, unknown> | null, path: string[]) {
  if (!source) {
    return null;
  }

  let current: unknown = source;
  for (const key of path) {
    if (Array.isArray(current)) {
      current = current[Number(key)];
      continue;
    }

    if (!current || typeof current !== 'object') {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return getScalarString(current);
}

function getScalarString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseMetaTimestamp(value: string | null) {
  if (!value) {
    return new Date();
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return new Date();
  }

  return new Date(numeric * 1000);
}

function mapWhatsappStatus(value: string | null) {
  switch (value) {
    case 'delivered':
      return WhatsappMessageStatus.DELIVERED;
    case 'read':
      return WhatsappMessageStatus.READ;
    case 'failed':
      return WhatsappMessageStatus.FAILED;
    case 'sent':
    default:
      return WhatsappMessageStatus.SENT;
  }
}
