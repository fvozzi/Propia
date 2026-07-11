import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityType } from '../common/enums';

vi.mock('../auth/team.entity', () => ({
  Team: class Team {},
}));

vi.mock('../activities/activity.entity', () => ({
  Activity: class Activity {},
}));

vi.mock('./whatsapp-message.entity', () => ({
  WhatsappMessage: class WhatsappMessage {},
}));

describe('WhatsappService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function createService() {
    const { WhatsappService } = await import('./whatsapp.service');

    const teamsRepository = {
      findOne: vi.fn(),
    };
    const activitiesRepository = {
      findOne: vi.fn(),
      save: vi.fn(async (value) => value),
    };
    const whatsappMessagesRepository = {
      create: vi.fn((value) => value),
      save: vi.fn(async (value) => value),
    };
    const configService = {
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'WHATSAPP_GRAPH_API_VERSION') {
          return 'v25.0';
        }

        if (key === 'FRONTEND_URL') {
          return 'http://localhost:5173';
        }

        return fallback;
      }),
    };

    const service = new WhatsappService(
      teamsRepository as never,
      activitiesRepository as never,
      whatsappMessagesRepository as never,
      configService as never,
    );

    return {
      service,
      teamsRepository,
      activitiesRepository,
      whatsappMessagesRepository,
    };
  }

  it('sends Argentina sandbox numbers using the same format shown by Meta Quickstart', async () => {
    const { service, teamsRepository, activitiesRepository, whatsappMessagesRepository } =
      await createService();

    activitiesRepository.findOne
      .mockResolvedValueOnce({
        id: 9,
        teamId: 1,
        contactId: 4,
        activityType: ActivityType.APPRAISAL_REQUEST,
        title: 'Solicitud',
        externalUrl: null,
        whatsappComment: null,
        whatsappSharedAt: null,
        appraisalRequest: { publicToken: 'token-demo' },
        contact: {
          firstName: 'Susi',
          displayName: 'Susi',
          whatsapp: '+5491130276632',
          phone: null,
        },
      })
      .mockResolvedValueOnce({
        id: 9,
        teamId: 1,
        contactId: 4,
        activityType: ActivityType.APPRAISAL_REQUEST,
      });

    teamsRepository.findOne.mockResolvedValue({
      id: 1,
      whatsappEnabled: true,
      whatsappPhoneNumberId: '1139020899293300',
      whatsappAccessToken: 'token',
      whatsappTemplateLanguageCode: 'es_AR',
      whatsappPropertySearchTemplateName: 'property_share',
      whatsappAppraisalTemplateName: 'appraisal_form',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ messages: [{ id: 'wamid-1' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await service.sendActivityMessage(9, {
      sub: 1,
      activeTeamId: 1,
    } as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as { body: string }).body);

    expect(body.to).toBe('54111530276632');
    expect(whatsappMessagesRepository.save).toHaveBeenCalled();
  });

  it('retries property search templates with compact params when Meta expects 3 variables', async () => {
    const { service, teamsRepository, activitiesRepository } = await createService();

    activitiesRepository.findOne
      .mockResolvedValueOnce({
        id: 7,
        teamId: 1,
        contactId: 4,
        activityType: ActivityType.PROPERTY_SEARCH,
        title: 'Prueba',
        externalUrl: 'https://www.zonaprop.com.ar/aviso',
        whatsappComment: 'Comentario',
        whatsappSharedAt: null,
        appraisalRequest: null,
        contact: {
          firstName: 'Susi',
          displayName: 'Susi',
          whatsapp: '+5491130276632',
          phone: null,
        },
      })
      .mockResolvedValueOnce({
        id: 7,
        teamId: 1,
        contactId: 4,
        activityType: ActivityType.PROPERTY_SEARCH,
      });

    teamsRepository.findOne.mockResolvedValue({
      id: 1,
      whatsappEnabled: true,
      whatsappPhoneNumberId: '1139020899293300',
      whatsappAccessToken: 'token',
      whatsappTemplateLanguageCode: 'es_AR',
      whatsappPropertySearchTemplateName: 'property_share',
      whatsappAppraisalTemplateName: 'appraisal_form',
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            error: {
              code: 132000,
              message: '(#132000) Number of parameters does not match the expected number of params',
              error_data: {
                details:
                  'body: number of localizable_params (4) does not match the expected number of params (3)',
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ messages: [{ id: 'wamid-2' }] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await service.sendActivityMessage(7, {
      sub: 1,
      activeTeamId: 1,
    } as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as { body: string }).body);

    expect(firstBody.template.components[0].parameters).toHaveLength(4);
    expect(secondBody.template.components[0].parameters).toHaveLength(3);
    expect(secondBody.template.components[0].parameters[1].text).toBe('Prueba. Comentario');
  });

  it('uses a property-search image template when the activity has a preview image', async () => {
    const { service, teamsRepository, activitiesRepository } = await createService();

    activitiesRepository.findOne
      .mockResolvedValueOnce({
        id: 11,
        teamId: 1,
        contactId: 4,
        activityType: ActivityType.PROPERTY_SEARCH,
        title: 'Venta departamento',
        externalUrl: 'https://zonaprop.com.ar/aviso',
        externalPreviewImageUrl: 'https://img.zonapropcdn.com/preview.jpg',
        whatsappComment: 'Luminoso y bien ubicado',
        whatsappSharedAt: null,
        appraisalRequest: null,
        contact: {
          firstName: 'Susi',
          displayName: 'Susi',
          whatsapp: '+5491130276632',
          phone: null,
        },
      })
      .mockResolvedValueOnce({
        id: 11,
        teamId: 1,
        contactId: 4,
        activityType: ActivityType.PROPERTY_SEARCH,
      });

    teamsRepository.findOne.mockResolvedValue({
      id: 1,
      whatsappEnabled: true,
      whatsappPhoneNumberId: '1139020899293300',
      whatsappAccessToken: 'token',
      whatsappTemplateLanguageCode: 'es_AR',
      whatsappPropertySearchTemplateName: 'property_share',
      whatsappPropertySearchImageTemplateName: 'property_share_image',
      whatsappAppraisalTemplateName: 'appraisal_form',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ messages: [{ id: 'wamid-3' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await service.sendActivityMessage(11, {
      sub: 1,
      activeTeamId: 1,
    } as never);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.template.name).toBe('property_share_image');
    expect(body.template.components).toHaveLength(2);
    expect(body.template.components[0]).toEqual({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: {
            link: 'https://img.zonapropcdn.com/preview.jpg',
          },
        },
      ],
    });
    expect(body.template.components[1].parameters).toHaveLength(3);
    expect(body.template.components[1].parameters[1].text).toBe(
      'Venta departamento. Luminoso y bien ubicado',
    );
  });

  it('sends the full reservation treasury text including all required fields and the document link', async () => {
    const { service, teamsRepository, activitiesRepository, whatsappMessagesRepository } =
      await createService();

    activitiesRepository.findOne
      .mockResolvedValueOnce({
        id: 21,
        teamId: 1,
        contactId: null,
        activityType: ActivityType.RESERVATION,
        title: 'Reserva Caballito',
        description: '75% Lila, 25% Victoria',
        whatsappSharedAt: null,
        externalUrl: 'https://drive.google.com/file/d/reserva-caballito/view',
        reservationData: {
          agentName: 'Victoria Arque',
          operationType: 'BUY',
          operationAmount: 92000,
          operationCurrency: 'USD',
          propertyAddress: 'Av. La Plata 249 11 B',
          propertyNeighborhood: 'Caballito',
          propertyType: 'APARTMENT',
          sidesCount: 1,
          commissionPercent: 2,
          reservationAmount: 1400,
          reservationCurrency: 'USD',
          sharedWithRealEstate: true,
          conformed: false,
          credit: false,
          relocation: false,
          estimatedClosingMonth: 'Agosto',
          observations: '75% Lila, 25% Victoria',
        },
        property: {
          address: 'Av. La Plata 249 11 B',
          neighborhood: 'Caballito',
        },
      })
      .mockResolvedValueOnce({
        id: 21,
        teamId: 1,
        contactId: null,
        activityType: ActivityType.RESERVATION,
        whatsappSharedAt: new Date().toISOString(),
      });

    teamsRepository.findOne.mockResolvedValue({
      id: 1,
      whatsappEnabled: true,
      whatsappPhoneNumberId: '1139020899293300',
      whatsappAccessToken: 'token',
      whatsappTemplateLanguageCode: 'es_AR',
      whatsappTreasuryPhone: '+5491130276632',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ messages: [{ id: 'wamid-text' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await service.sendActivityMessage(21, {
      sub: 1,
      name: 'Victoria Arque',
      activeTeamId: 1,
    } as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstBody = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(firstBody.type).toBe('text');
    expect(firstBody.text.body).toBe(
      [
        '* Agente: Victoria Arque',
        '* Monto operación: U$S 92.000',
        '* Dirección: Av. La Plata 249 11 B',
        '* Barrio: Caballito',
        '* Operación: Compra',
        '* Puntas: 1',
        '* Porcentaje: 2%',
        '* Cuánto dejaron de reserva: U$S 1.400',
        '* Compartida con Inmobiliaria: Si',
        '* Conformada: No',
        '* Crédito: No',
        '* Tipo propiedad: Departamento',
        '* Reubicación: No',
        '* Mes estimado de Cierre: Agosto',
        '* Documento reserva: https://drive.google.com/file/d/reserva-caballito/view',
        '* Observaciones: 75% Lila, 25% Victoria',
      ].join('\n'),
    );
    expect(whatsappMessagesRepository.save).toHaveBeenCalledTimes(1);
  });
});
