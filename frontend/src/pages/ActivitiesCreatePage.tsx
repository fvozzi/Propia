import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { SearchableCombobox } from '../components/SearchableCombobox';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  buildExpenseBreakdownWhatsappMessage,
  buildPropertySearchMessage,
  buildReservationTreasuryWhatsappMessage,
  buildVisitWhatsappMessage,
  buildWhatsAppShareUrl,
  calculateExpenseBreakdown,
  getContactWhatsappPhone,
  openWhatsAppShareUrl,
} from '../lib/whatsapp';
import { activityTypeOptions, useI18n } from '../lib/i18n';
import type {
  Activity,
  ActivityType,
  BuyerPropertyCandidate,
  CommercialOpportunity,
  Contact,
  CurrencyType,
  ExpenseBreakdownActivityData,
  ExpenseBreakdownChecklistData,
  ExpenseChecklistPartyData,
  OperationType,
  Paginated,
  Property,
  PropertyType,
  ReservationActivityData,
  SearchRequirement,
  Visit,
  VisitStatus,
} from '../types';

type PropertySearchFeedback = '' | 'LIKED' | 'DISLIKED';

type ActivityFormState = {
  activityType: ActivityType | 'EXTERNAL_VISIT';
  contactId: string;
  propertyId: string;
  activityDate: string;
  nextFollowUpDate: string;
  title: string;
  description: string;
  appraisalPropertyAddress: string;
  externalUrl: string;
  whatsappComment: string;
  markShared: boolean;
  propertySearchFeedback: PropertySearchFeedback;
  commercialOpportunityId: string;
  reservationAgentName: string;
  reservationOperationType: '' | OperationType;
  reservationOperationAmount: string;
  reservationOperationCurrency: CurrencyType;
  reservationPropertyAddress: string;
  reservationPropertyNeighborhood: string;
  reservationPropertyType: '' | PropertyType;
  reservationSidesCount: string;
  reservationCommissionPercent: string;
  reservationAmount: string;
  reservationCurrency: CurrencyType;
  reservationSharedWithRealEstate: boolean;
  reservationConformed: boolean;
  reservationCredit: boolean;
  reservationRelocation: boolean;
  reservationEstimatedClosingMonth: string;
  reservationObservations: string;
  expenseOperationAmount: string;
  expenseOperationCurrency: CurrencyType;
  expensePropertyAddress: string;
  expenseCommissionPercent: string;
  expenseVatPercent: string;
  expenseInvoicedVatAmount: string;
  expenseAmountAlreadyPaid: string;
  expenseNotaryExpenses: string;
  expenseObservations: string;
  expenseChecklist: ExpenseBreakdownChecklistData;
  visitSearchRequirementId: string;
  visitCandidateId: string;
  visitColleagueContactId: string;
  visitColleagueName: string;
  visitColleagueWhatsapp: string;
  visitStatus: VisitStatus;
  visitExternalPropertyTitle: string;
  visitExternalPropertyAddress: string;
};

const emptyChecklistParty = (): ExpenseChecklistPartyData => ({
  name: null,
  document: null,
  taxId: null,
  birthDate: null,
  phone: null,
  email: null,
});

const createEmptyExpenseChecklist = (): ExpenseBreakdownChecklistData => ({
  reportDate: null,
  agentName: null,
  listingCommissionPercent: null,
  purchaseCommissionPercent: null,
  propertyStatus: null,
  creditAnswer: null,
  creditBank: null,
  sharedOperationAnswer: null,
  counterpartyRealEstateAgency: null,
  counterpartyAgentName: null,
  propertyReference: null,
  listingPrice: null,
  reservationDate: null,
  reservationAmount: null,
  reservationHeldBy: null,
  reservationConformedAnswer: null,
  reportsRequestedAnswer: null,
  reportsHandledBy: null,
  reportsDate: null,
  reinforcementDate: null,
  reinforcementAmount: null,
  totalDeliveredAmount: null,
  allMoneyHeldBy: null,
  paymentMethod: null,
  originalReservationInOfficeAnswer: null,
  notaryName: null,
  notaryEmail: null,
  notaryAddress: null,
  notaryPhone: null,
  owners: [emptyChecklistParty(), emptyChecklistParty()],
  buyers: [emptyChecklistParty(), emptyChecklistParty()],
  purchaseAgreementAnswer: null,
  originalsDeliveredForAgreementAnswer: null,
  agreementDate: null,
  agreementTime: null,
  agreementAddress: null,
  agreementDraftedAnswer: null,
  agreementReviewedByOfficeAnswer: null,
  agreementReviewedByPartiesAnswer: null,
  agreementPrintedAnswer: null,
  roomReservedAnswer: null,
  refundRequiredAtAgreementAnswer: null,
  refundFormAtAgreementAnswer: null,
  vatInvoicedAtAgreementAnswer: null,
  invoicesRequestedAtAgreementAnswer: null,
  pepUifFormsAtAgreementAnswer: null,
  sharedOperationFormAtAgreementAnswer: null,
  notaryContactedAnswer: null,
  originalsDeliveredForDeedAnswer: null,
  deedValue: null,
  deedDate: null,
  deedTime: null,
  deedAddress: null,
  commodatumRequiredAnswer: null,
  commodatumDraftedAnswer: null,
  commodatumReviewedAnswer: null,
  refundRequiredAtDeedAnswer: null,
  refundFormAtDeedAnswer: null,
  vatInvoicedAtDeedAnswer: null,
  invoicesRequestedAtDeedAnswer: null,
  pepUifFormsAtDeedAnswer: null,
  sharedOperationFormAtDeedAnswer: null,
  keysReadyAnswer: null,
  originalReservationAndAgreementReadyAnswer: null,
  sellerGift: null,
  buyerGift: null,
  notaryGift: null,
  otherAgentGift: null,
  extra: null,
  kitRubberBandsAnswer: null,
  kitPensAnswer: null,
  kitUsdChangeAnswer: null,
  kitArsChangeAnswer: null,
  kitAmountLabelsAnswer: null,
  kitIdsAnswer: null,
  kitInvoicesAndFormsAnswer: null,
  kitFolderAnswer: null,
  kitFoodAnswer: null,
  kitGiftsAnswer: null,
  kitPhotosAnswer: null,
  kitBusinessCardsAnswer: null,
});

const initialForm: ActivityFormState = {
  activityType: 'CALL',
  contactId: '',
  propertyId: '',
  activityDate: '',
  nextFollowUpDate: '',
  title: '',
  description: '',
  appraisalPropertyAddress: '',
  externalUrl: '',
  whatsappComment: '',
  markShared: false,
  propertySearchFeedback: '',
  commercialOpportunityId: '',
  reservationAgentName: '',
  reservationOperationType: '',
  reservationOperationAmount: '',
  reservationOperationCurrency: 'USD',
  reservationPropertyAddress: '',
  reservationPropertyNeighborhood: '',
  reservationPropertyType: '',
  reservationSidesCount: '',
  reservationCommissionPercent: '',
  reservationAmount: '',
  reservationCurrency: 'USD',
  reservationSharedWithRealEstate: false,
  reservationConformed: false,
  reservationCredit: false,
  reservationRelocation: false,
  reservationEstimatedClosingMonth: '',
  reservationObservations: '',
  expenseOperationAmount: '',
  expenseOperationCurrency: 'USD',
  expensePropertyAddress: '',
  expenseCommissionPercent: '',
  expenseVatPercent: '21',
  expenseInvoicedVatAmount: '',
  expenseAmountAlreadyPaid: '',
  expenseNotaryExpenses: '',
  expenseObservations: '',
  expenseChecklist: createEmptyExpenseChecklist(),
  visitSearchRequirementId: '',
  visitCandidateId: '',
  visitColleagueContactId: '',
  visitColleagueName: '',
  visitColleagueWhatsapp: '',
  visitStatus: 'SCHEDULED',
  visitExternalPropertyTitle: '',
  visitExternalPropertyAddress: '',
};

type ExpenseChecklistScalarKey = Exclude<
  keyof ExpenseBreakdownChecklistData,
  'owners' | 'buyers'
>;

type ExpenseChecklistFieldDefinition = {
  key: ExpenseChecklistScalarKey;
  label: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'email' | 'tel' | 'answer';
  fullSpan?: boolean;
};

const expenseGeneralFields: ExpenseChecklistFieldDefinition[] = [
  { key: 'reportDate', label: 'Fecha del reporte', type: 'date' },
  { key: 'agentName', label: 'Agente' },
  { key: 'listingCommissionPercent', label: 'Comisión de captación (%)', type: 'number' },
  { key: 'purchaseCommissionPercent', label: 'Comisión de compra (%)', type: 'number' },
  { key: 'propertyStatus', label: 'Estado Century' },
  { key: 'creditAnswer', label: '¿La reserva es con crédito?', type: 'answer' },
  { key: 'creditBank', label: '¿De qué banco?' },
  { key: 'sharedOperationAnswer', label: '¿Es una operación compartida?', type: 'answer' },
  { key: 'counterpartyRealEstateAgency', label: 'Inmobiliaria contraparte' },
  { key: 'counterpartyAgentName', label: 'Agente de la otra inmobiliaria' },
  { key: 'propertyReference', label: 'ID / link de la propiedad', fullSpan: true },
  { key: 'listingPrice', label: 'Precio de publicación', type: 'number' },
];

const expenseMoneyFields: ExpenseChecklistFieldDefinition[] = [
  { key: 'reservationDate', label: 'Fecha de reserva', type: 'date' },
  { key: 'reservationAmount', label: 'Monto de reserva', type: 'number' },
  { key: 'reservationHeldBy', label: '¿Dónde está la reserva?' },
  { key: 'reservationConformedAnswer', label: '¿La reserva fue conformada?', type: 'answer' },
  { key: 'reportsRequestedAnswer', label: '¿Se pidieron informes de dominio e inhibición?', type: 'answer' },
  { key: 'reportsHandledBy', label: 'Registro / gestor de informes' },
  { key: 'reportsDate', label: 'Fecha de pedido / recepción de informes', type: 'date' },
  { key: 'reinforcementDate', label: 'Fecha de refuerzo', type: 'date' },
  { key: 'reinforcementAmount', label: 'Monto de refuerzo', type: 'number' },
  { key: 'totalDeliveredAmount', label: 'Total de dinero entregado por el cliente', type: 'number' },
  { key: 'allMoneyHeldBy', label: '¿Dónde está todo el dinero?' },
  { key: 'paymentMethod', label: 'Forma de pago', fullSpan: true },
  { key: 'originalReservationInOfficeAnswer', label: '¿Está la reserva original en la oficina?', type: 'answer' },
  { key: 'notaryName', label: 'Escribanía interviniente' },
  { key: 'notaryEmail', label: 'Email de escribanía', type: 'email' },
  { key: 'notaryAddress', label: 'Dirección de escribanía' },
  { key: 'notaryPhone', label: 'Teléfono de escribanía', type: 'tel' },
];

const expenseAgreementFields: ExpenseChecklistFieldDefinition[] = [
  { key: 'purchaseAgreementAnswer', label: '¿Se realiza boleto de compraventa?', type: 'answer' },
  { key: 'originalsDeliveredForAgreementAnswer', label: '¿Se entregó documentación original a escribanía?', type: 'answer' },
  { key: 'agreementDate', label: 'Fecha de firma del boleto', type: 'date' },
  { key: 'agreementTime', label: 'Horario', type: 'time' },
  { key: 'agreementAddress', label: 'Dirección de firma', fullSpan: true },
  { key: 'agreementDraftedAnswer', label: '¿Se redactó el boleto?', type: 'answer' },
  { key: 'agreementReviewedByOfficeAnswer', label: '¿El boleto fue revisado por la oficina?', type: 'answer' },
  { key: 'agreementReviewedByPartiesAnswer', label: '¿Fue revisado por vendedor y comprador?', type: 'answer' },
  { key: 'agreementPrintedAnswer', label: '¿Se imprimió el boleto revisado?', type: 'answer' },
  { key: 'roomReservedAnswer', label: '¿Se reservó sala?', type: 'answer' },
  { key: 'refundRequiredAtAgreementAnswer', label: '¿Hay que hacer reintegro?', type: 'answer' },
  { key: 'refundFormAtAgreementAnswer', label: '¿Se imprimió formulario de reintegro?', type: 'answer' },
  { key: 'vatInvoicedAtAgreementAnswer', label: '¿Se facturó IVA?', type: 'answer' },
  { key: 'invoicesRequestedAtAgreementAnswer', label: '¿Se solicitaron facturas?', type: 'answer' },
  { key: 'pepUifFormsAtAgreementAnswer', label: '¿Están formularios PEP / UIF?', type: 'answer' },
  { key: 'sharedOperationFormAtAgreementAnswer', label: '¿Está el formulario de operación compartida?', type: 'answer' },
];

const expenseDeedFields: ExpenseChecklistFieldDefinition[] = [
  { key: 'notaryContactedAnswer', label: '¿Se contactó a la escribanía?', type: 'answer' },
  { key: 'originalsDeliveredForDeedAnswer', label: '¿Se entregó documentación original?', type: 'answer' },
  { key: 'deedValue', label: 'Valor de escritura', type: 'number' },
  { key: 'deedDate', label: 'Fecha de escritura', type: 'date' },
  { key: 'deedTime', label: 'Horario de escritura', type: 'time' },
  { key: 'deedAddress', label: 'Dirección de escritura', fullSpan: true },
  { key: 'commodatumRequiredAnswer', label: '¿Se requiere comodato?', type: 'answer' },
  { key: 'commodatumDraftedAnswer', label: '¿Se redactó el comodato?', type: 'answer' },
  { key: 'commodatumReviewedAnswer', label: '¿Se revisó el comodato?', type: 'answer' },
  { key: 'refundRequiredAtDeedAnswer', label: '¿Hay que hacer reintegro?', type: 'answer' },
  { key: 'refundFormAtDeedAnswer', label: '¿Se imprimió formulario de reintegro?', type: 'answer' },
  { key: 'vatInvoicedAtDeedAnswer', label: '¿Se facturó IVA?', type: 'answer' },
  { key: 'invoicesRequestedAtDeedAnswer', label: '¿Se solicitaron facturas?', type: 'answer' },
  { key: 'pepUifFormsAtDeedAnswer', label: '¿Están formularios PEP / UIF?', type: 'answer' },
  { key: 'sharedOperationFormAtDeedAnswer', label: '¿Está el formulario de operación compartida?', type: 'answer' },
  { key: 'keysReadyAnswer', label: '¿Están las llaves?', type: 'answer' },
  { key: 'originalReservationAndAgreementReadyAnswer', label: '¿Están los originales de reserva y boleto?', type: 'answer' },
  { key: 'sellerGift', label: 'Regalo vendedor' },
  { key: 'buyerGift', label: 'Regalo comprador' },
  { key: 'notaryGift', label: 'Regalo escribanía' },
  { key: 'otherAgentGift', label: 'Regalo otro agente' },
  { key: 'extra', label: 'Extra', fullSpan: true },
];

const expenseKitFields: ExpenseChecklistFieldDefinition[] = [
  { key: 'kitRubberBandsAnswer', label: 'Banditas elásticas', type: 'answer' },
  { key: 'kitPensAnswer', label: 'Lapiceras', type: 'answer' },
  { key: 'kitUsdChangeAnswer', label: 'Cambio USD', type: 'answer' },
  { key: 'kitArsChangeAnswer', label: 'Cambio ARS', type: 'answer' },
  { key: 'kitAmountLabelsAnswer', label: 'Carteles con montos', type: 'answer' },
  { key: 'kitIdsAnswer', label: 'DNI de las partes', type: 'answer' },
  { key: 'kitInvoicesAndFormsAnswer', label: 'Facturas, recibos y formularios', type: 'answer' },
  { key: 'kitFolderAnswer', label: 'Carpeta', type: 'answer' },
  { key: 'kitFoodAnswer', label: 'Comida / bebida', type: 'answer' },
  { key: 'kitGiftsAnswer', label: 'Regalos y tarjeta', type: 'answer' },
  { key: 'kitPhotosAnswer', label: 'Fotos', type: 'answer' },
  { key: 'kitBusinessCardsAnswer', label: 'Tarjetas personales', type: 'answer' },
];

export function ActivitiesCreatePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, translateEnum } = useI18n();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [visitColleagueSearch, setVisitColleagueSearch] = useState('');
  const [contactMatches, setContactMatches] = useState<Contact[] | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<CommercialOpportunity[]>([]);
  const [searchRequirements, setSearchRequirements] = useState<SearchRequirement[]>([]);
  const [visitCandidates, setVisitCandidates] = useState<BuyerPropertyCandidate[]>([]);
  const [visitCandidatesLoading, setVisitCandidatesLoading] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [linkProperty, setLinkProperty] = useState(false);
  const [savingAndSharing, setSavingAndSharing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ActivityFormState>(initialForm);
  const formRef = useRef<HTMLFormElement | null>(null);

  const activityId = id ? Number(id) : null;
  const isEditing = Boolean(activityId);
  const isPropertySearch = form.activityType === 'PROPERTY_SEARCH';
  const isAppraisalRequest = form.activityType === 'APPRAISAL_REQUEST';
  const isReservation = form.activityType === 'RESERVATION';
  const isExpenseBreakdown = form.activityType === 'EXPENSE_BREAKDOWN';
  const isExternalVisit = form.activityType === 'EXTERNAL_VISIT';
  const contactSearchTerm = contactSearch.trim();
  const activityContact =
    activity?.contact && String(activity.contact.id) === form.contactId ? activity.contact : null;
  const selectedContact =
    contactMatches?.find((contact) => String(contact.id) === form.contactId) ??
    contacts.find((contact) => String(contact.id) === form.contactId) ??
    activityContact ??
    null;
  const visibleContacts = mergeContacts(
    contactSearchTerm ? contactMatches ?? [] : contacts,
    selectedContact ? [selectedContact] : [],
  );
  const selectedProperty = properties.find((property) => String(property.id) === form.propertyId) ?? null;
  const selectedOpportunity =
    opportunities.find(
      (opportunity) => String(opportunity.id) === form.commercialOpportunityId,
    ) ??
    (activity?.commercialOpportunity &&
    String(activity.commercialOpportunity.id) === form.commercialOpportunityId
      ? activity.commercialOpportunity
      : null);
  const visitRequirements = searchRequirements.filter(
    (requirement) => String(requirement.contactId) === form.contactId,
  );
  const visibleVisitCandidates = form.visitSearchRequirementId
    ? visitCandidates.filter(
        (candidate) =>
          String(candidate.searchRequirementId) === form.visitSearchRequirementId,
      )
    : visitCandidates;
  const expenseBreakdownData = isExpenseBreakdown
    ? buildExpenseBreakdownDataPayload(form, selectedOpportunity?.operationType)
    : null;
  const expenseCalculation = expenseBreakdownData
    ? calculateExpenseBreakdown(expenseBreakdownData)
    : null;
  const expenseWhatsappMessage = expenseBreakdownData
    ? buildExpenseBreakdownWhatsappMessage({
        expenseBreakdownData,
        description: form.description || null,
        contact: selectedContact,
        property: selectedProperty,
      })
    : '';
  const showSavedPreview =
    isPropertySearch &&
    activity &&
    form.externalUrl.trim() === (activity.externalUrl ?? '').trim() &&
    Boolean(
      activity.externalPreviewImageUrl ||
        activity.externalPreviewTitle ||
        activity.externalPreviewDescription ||
        activity.externalPreviewDomain,
    );
  const canShareNow = Boolean(
    isPropertySearch &&
      selectedContact &&
      getContactWhatsappPhone(selectedContact) &&
      form.externalUrl.trim(),
  );
  const canShareExpense = Boolean(
    isExpenseBreakdown &&
      selectedOpportunity &&
      selectedContact &&
      getContactWhatsappPhone(selectedContact) &&
      expenseBreakdownData?.operationAmount,
  );
  const externalVisitPreview = isExternalVisit
    ? buildVisitWhatsappMessage({
        scheduledAt: form.activityDate || new Date().toISOString(),
        status: form.visitStatus,
        notes: form.description || null,
        externalUrl: form.externalUrl || null,
        externalPropertyTitle: form.visitExternalPropertyTitle || null,
        externalPropertyAddress: form.visitExternalPropertyAddress || null,
        colleagueName: form.visitColleagueName || null,
        colleagueWhatsapp: form.visitColleagueWhatsapp || null,
        property: selectedProperty,
      })
    : '';
  const canShareExternalVisit = Boolean(
    isExternalVisit &&
      selectedContact &&
      getContactWhatsappPhone(selectedContact) &&
      form.activityDate &&
      (form.propertyId || form.visitExternalPropertyTitle.trim()),
  );

  useEffect(() => {
    async function loadDependencies() {
      const [
        contactsData,
        propertiesData,
        opportunitiesData,
        requirementsData,
        activityData,
      ] = await Promise.all([
        apiRequest<Paginated<Contact>>('/contacts?page=1&limit=100&sortBy=DISPLAY_NAME&sortDirection=ASC'),
        apiRequest<Paginated<Property>>('/properties?page=1&limit=100'),
        apiRequest<Paginated<CommercialOpportunity>>(
          '/commercial-opportunities?page=1&limit=100',
        ),
        apiRequest<Paginated<SearchRequirement>>(
          '/search-requirements?page=1&limit=100',
        ),
        isEditing && activityId
          ? apiRequest<Activity>(`/activities/${activityId}`)
          : Promise.resolve(null),
      ]);

      setContacts(
        mergeContacts(
          contactsData.items,
          activityData?.contact ? [activityData.contact] : [],
          opportunitiesData.items
            .map((opportunity) => opportunity.contact)
            .filter((contact): contact is Contact => Boolean(contact)),
        ),
      );
      setProperties(propertiesData.items);
      setSearchRequirements(requirementsData.items);
      setOpportunities(
        opportunitiesData.items.filter(
          (opportunity) =>
            opportunity.operationType === 'SALE' || opportunity.operationType === 'BUY',
        ),
      );

      if (activityData) {
        setActivity(activityData);
        setLinkProperty(Boolean(activityData.propertyId));
        setForm({
          activityType: activityData.activityType,
          contactId: activityData.contactId ? String(activityData.contactId) : '',
          propertyId: activityData.propertyId ? String(activityData.propertyId) : '',
          activityDate: toDateTimeLocalValue(activityData.activityDate),
          nextFollowUpDate: toDateTimeLocalValue(activityData.nextFollowUpDate),
          title: activityData.title,
          description: activityData.description ?? '',
          appraisalPropertyAddress: activityData.appraisalRequest?.propertyAddress ?? '',
          externalUrl: activityData.externalUrl ?? '',
          whatsappComment: activityData.whatsappComment ?? '',
          markShared: Boolean(activityData.whatsappSharedAt),
          propertySearchFeedback:
            activityData.propertySearchLiked === true
              ? 'LIKED'
              : activityData.propertySearchLiked === false
                ? 'DISLIKED'
                : '',
          commercialOpportunityId: activityData.commercialOpportunityId
            ? String(activityData.commercialOpportunityId)
            : '',
          reservationAgentName:
            activityData.reservationData?.agentName ?? user?.name ?? '',
          reservationOperationType:
            activityData.reservationData?.operationType ?? '',
          reservationOperationAmount: toInputNumberValue(
            activityData.reservationData?.operationAmount,
          ),
          reservationOperationCurrency:
            activityData.reservationData?.operationCurrency ?? 'USD',
          reservationPropertyAddress:
            activityData.reservationData?.propertyAddress ??
            activityData.property?.address ??
            '',
          reservationPropertyNeighborhood:
            activityData.reservationData?.propertyNeighborhood ??
            activityData.property?.neighborhood ??
            '',
          reservationPropertyType:
            activityData.reservationData?.propertyType ??
            activityData.property?.propertyType ??
            '',
          reservationSidesCount: toInputNumberValue(
            activityData.reservationData?.sidesCount,
          ),
          reservationCommissionPercent: toInputNumberValue(
            activityData.reservationData?.commissionPercent,
          ),
          reservationAmount: toInputNumberValue(
            activityData.reservationData?.reservationAmount,
          ),
          reservationCurrency:
            activityData.reservationData?.reservationCurrency ?? 'USD',
          reservationSharedWithRealEstate:
            activityData.reservationData?.sharedWithRealEstate ?? false,
          reservationConformed:
            activityData.reservationData?.conformed ?? false,
          reservationCredit: activityData.reservationData?.credit ?? false,
          reservationRelocation:
            activityData.reservationData?.relocation ?? false,
          reservationEstimatedClosingMonth:
            activityData.reservationData?.estimatedClosingMonth ?? '',
          reservationObservations:
            activityData.reservationData?.observations ?? '',
          expenseOperationAmount: toInputNumberValue(
            activityData.expenseBreakdownData?.operationAmount,
          ),
          expenseOperationCurrency:
            activityData.expenseBreakdownData?.operationCurrency ?? 'USD',
          expensePropertyAddress:
            activityData.expenseBreakdownData?.propertyAddress ??
            activityData.property?.address ??
            '',
          expenseCommissionPercent: toInputNumberValue(
            activityData.expenseBreakdownData?.commissionPercent,
          ),
          expenseVatPercent: toInputNumberValue(
            activityData.expenseBreakdownData?.vatPercent ?? 21,
          ),
          expenseInvoicedVatAmount: toInputNumberValue(
            activityData.expenseBreakdownData?.invoicedVatAmount,
          ),
          expenseAmountAlreadyPaid: toInputNumberValue(
            activityData.expenseBreakdownData?.amountAlreadyPaid,
          ),
          expenseNotaryExpenses:
            activityData.expenseBreakdownData?.notaryExpenses ?? '',
          expenseObservations:
            activityData.expenseBreakdownData?.observations ?? '',
          expenseChecklist: normalizeExpenseChecklist(
            activityData.expenseBreakdownData?.checklist,
            activityData.expenseBreakdownData?.amountAlreadyPaid,
          ),
          visitSearchRequirementId: '',
          visitCandidateId: '',
          visitColleagueContactId: '',
          visitColleagueName: '',
          visitColleagueWhatsapp: '',
          visitStatus: 'SCHEDULED',
          visitExternalPropertyTitle: '',
          visitExternalPropertyAddress: '',
        });
      } else if (searchParams.get('activityType') === 'EXPENSE_BREAKDOWN') {
        const opportunityId = searchParams.get('opportunityId') ?? '';
        const requestedOpportunity = opportunitiesData.items.find(
          (opportunity) => String(opportunity.id) === opportunityId,
        );

        setForm((current) => ({
          ...current,
          activityType: 'EXPENSE_BREAKDOWN',
          commercialOpportunityId: requestedOpportunity ? opportunityId : '',
          contactId: requestedOpportunity
            ? String(requestedOpportunity.contactId)
            : '',
          propertyId: requestedOpportunity?.propertyId
            ? String(requestedOpportunity.propertyId)
            : '',
          expenseOperationAmount: toInputNumberValue(
            requestedOpportunity?.property?.price,
          ),
          expenseOperationCurrency:
            requestedOpportunity?.property?.currency ?? 'USD',
          expensePropertyAddress:
            requestedOpportunity?.property?.address ?? '',
          expenseCommissionPercent:
            requestedOpportunity?.operationType === 'SALE'
              ? '3'
              : requestedOpportunity?.operationType === 'BUY'
                ? '4'
                : '',
          expenseChecklist: requestedOpportunity
            ? prefillExpenseChecklist(
                createEmptyExpenseChecklist(),
                requestedOpportunity,
                user?.name ?? null,
              )
            : createEmptyExpenseChecklist(),
        }));
      } else if (searchParams.get('activityType') === 'EXTERNAL_VISIT') {
        const contactId = searchParams.get('contactId') ?? '';
        setForm((current) => ({
          ...current,
          activityType: 'EXTERNAL_VISIT',
          contactId,
          activityDate: current.activityDate || toDateTimeLocalValue(new Date().toISOString()),
        }));
      }

      setLoading(false);
    }

    void loadDependencies();
  }, [activityId, isEditing, searchParams, user?.name]);

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

  useEffect(() => {
    if (!isExternalVisit || !form.contactId) {
      setVisitCandidates([]);
      setVisitCandidatesLoading(false);
      return;
    }

    const matchingRequirements = searchRequirements.filter(
      (requirement) => String(requirement.contactId) === form.contactId,
    );
    if (matchingRequirements.length === 0) {
      setVisitCandidates([]);
      return;
    }

    let cancelled = false;
    setVisitCandidatesLoading(true);
    void Promise.all(
      matchingRequirements.map((requirement) =>
        apiRequest<SearchRequirement>(`/search-requirements/${requirement.id}`),
      ),
    )
      .then((requirements) => {
        if (cancelled) return;
        setVisitCandidates(
          requirements.flatMap((requirement) =>
            (requirement.propertyCandidates ?? []).map((candidate) => ({
              ...candidate,
              searchRequirementId:
                candidate.searchRequirementId ?? requirement.id,
            })),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setVisitCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setVisitCandidatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.contactId, isExternalVisit, searchRequirements]);

  useEffect(() => {
    if (!isReservation || !selectedProperty) {
      return;
    }

    setForm((current) => ({
      ...current,
      reservationPropertyAddress:
        current.reservationPropertyAddress || selectedProperty.address || '',
      reservationPropertyNeighborhood:
        current.reservationPropertyNeighborhood || selectedProperty.neighborhood || '',
      reservationPropertyType:
        current.reservationPropertyType || selectedProperty.propertyType || '',
      reservationOperationType:
        current.reservationOperationType || selectedProperty.operationType || '',
    }));
  }, [isReservation, selectedProperty]);

  useEffect(() => {
    if (!isExpenseBreakdown || !selectedOpportunity) {
      return;
    }

    const opportunityProperty = selectedOpportunity.property ?? null;
    setLinkProperty(Boolean(opportunityProperty));
    setForm((current) => ({
      ...current,
      contactId: String(selectedOpportunity.contactId),
      propertyId: opportunityProperty ? String(opportunityProperty.id) : '',
      expenseOperationAmount:
        current.expenseOperationAmount || toInputNumberValue(opportunityProperty?.price),
      expenseOperationCurrency:
        current.expenseOperationAmount
          ? current.expenseOperationCurrency
          : opportunityProperty?.currency ?? current.expenseOperationCurrency,
      expensePropertyAddress:
        current.expensePropertyAddress || opportunityProperty?.address || '',
      expenseCommissionPercent:
        current.expenseCommissionPercent ||
        (selectedOpportunity.operationType === 'SALE' ? '3' : '4'),
      expenseChecklist: prefillExpenseChecklist(
        current.expenseChecklist,
        selectedOpportunity,
        user?.name ?? null,
      ),
    }));
  }, [isExpenseBreakdown, selectedOpportunity, user?.name]);

  function handleVisitCandidateChange(candidateId: string) {
    const candidate =
      visitCandidates.find((item) => String(item.id) === candidateId) ?? null;
    const colleague = candidate
      ? findMatchingVisitColleague(
          contacts,
          candidate.agentName,
          candidate.agentWhatsapp,
        )
      : null;
    setForm((current) => ({
      ...current,
      visitCandidateId: candidateId,
      visitSearchRequirementId: candidate?.searchRequirementId
        ? String(candidate.searchRequirementId)
        : '',
      propertyId: candidate?.propertyId ? String(candidate.propertyId) : '',
      visitExternalPropertyTitle:
        candidate?.property?.title ?? candidate?.title ?? '',
      visitExternalPropertyAddress: candidate
        ? resolveVisitCandidateAddress(candidate)
        : '',
      externalUrl: candidate?.url ?? '',
      visitColleagueContactId: colleague ? String(colleague.id) : '',
      visitColleagueName: colleague?.displayName ?? candidate?.agentName ?? '',
      visitColleagueWhatsapp:
        resolveVisitColleagueWhatsapp(colleague) ??
        candidate?.agentWhatsapp ??
        '',
      activityDate:
        candidate?.scheduledVisitAt
          ? toDateTimeLocalValue(candidate.scheduledVisitAt)
          : current.activityDate,
    }));
  }

  function handleVisitColleagueChange(contactId: string) {
    const colleague =
      contacts.find((contact) => String(contact.id) === contactId) ?? null;
    setForm((current) => ({
      ...current,
      visitColleagueContactId: contactId,
      visitColleagueName: colleague?.displayName ?? '',
      visitColleagueWhatsapp: resolveVisitColleagueWhatsapp(colleague) ?? '',
    }));
  }

  async function saveExternalVisit(shareNow: boolean) {
    const saved = await apiRequest<Visit>('/visits', {
      method: 'POST',
      body: JSON.stringify({
        contactId: Number(form.contactId),
        propertyId: form.propertyId ? Number(form.propertyId) : null,
        colleagueContactId: form.visitColleagueContactId
          ? Number(form.visitColleagueContactId)
          : null,
        colleagueName: form.visitColleagueName.trim() || undefined,
        colleagueWhatsapp: form.visitColleagueWhatsapp.trim() || undefined,
        searchRequirementId: form.visitSearchRequirementId
          ? Number(form.visitSearchRequirementId)
          : null,
        buyerPropertyCandidateId: form.visitCandidateId
          ? Number(form.visitCandidateId)
          : null,
        scheduledAt: new Date(form.activityDate).toISOString(),
        status: form.visitStatus,
        externalPropertyTitle:
          form.visitExternalPropertyTitle.trim() || undefined,
        externalPropertyAddress:
          form.visitExternalPropertyAddress.trim() || undefined,
        externalUrl: form.externalUrl.trim() || undefined,
        notes: form.description.trim() || undefined,
      }),
    });

    if (shareNow) {
      if (!saved.contact || !getContactWhatsappPhone(saved.contact)) {
        throw new Error('El contacto no tiene WhatsApp configurado');
      }
      openWhatsAppShareUrl(
        buildWhatsAppShareUrl(saved.contact, buildVisitWhatsappMessage(saved)),
      );
      window.alert(t('common.whatsappSent'));
    }

    return saved;
  }

  async function saveActivity(shareNow: boolean) {
    const checklistAgency = form.expenseChecklist.counterpartyRealEstateAgency?.trim();
    if (
      isExpenseBreakdown &&
      selectedOpportunity &&
      checklistAgency !== (selectedOpportunity.counterpartyRealEstateAgency ?? '')
    ) {
      const updatedOpportunity = await apiRequest<CommercialOpportunity>(
        `/commercial-opportunities/${selectedOpportunity.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            counterpartyRealEstateAgency: checklistAgency || '',
          }),
        },
      );
      setOpportunities((current) =>
        current.map((opportunity) =>
          opportunity.id === updatedOpportunity.id ? updatedOpportunity : opportunity,
        ),
      );
    }

    const saved = await apiRequest<Activity>(
      isEditing && activityId ? `/activities/${activityId}` : '/activities',
      {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(
          buildActivityPayload(form, linkProperty, activity, selectedOpportunity),
        ),
      },
    );

    const nextActivity = saved;
    setActivity(nextActivity);

    if (shareNow && isReservation) {
      const treasuryPhone = user?.activeTeamWhatsappTreasuryPhone?.trim() || '';
      if (!treasuryPhone) {
        throw new Error('Falta configurar el numero de WhatsApp de tesoreria para este equipo');
      }

      const message = buildReservationTreasuryWhatsappMessage(
        nextActivity,
        user?.name ?? null,
      );
      openWhatsAppShareUrl(
        buildWhatsAppShareUrl(
          { whatsapp: treasuryPhone, phone: null },
          message,
        ),
      );
      const shared = await apiRequest<Activity>(`/activities/${nextActivity.id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      window.alert(t('common.whatsappSent'));
      setActivity(shared);
      return shared;
    }

    if (shareNow && isExpenseBreakdown) {
      if (!nextActivity.contact || !getContactWhatsappPhone(nextActivity.contact)) {
        throw new Error('El contacto de la oportunidad no tiene WhatsApp configurado');
      }

      const message = buildExpenseBreakdownWhatsappMessage(nextActivity);
      openWhatsAppShareUrl(buildWhatsAppShareUrl(nextActivity.contact, message));
      const shared = await apiRequest<Activity>(`/activities/${nextActivity.id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      window.alert(t('common.whatsappSent'));
      setActivity(shared);
      return shared;
    }

    if (shareNow && isPropertySearch && selectedContact) {
      const message = buildPropertySearchMessage(nextActivity);
      openWhatsAppShareUrl(buildWhatsAppShareUrl(selectedContact, message));
      const shared = await apiRequest<Activity>(`/activities/${nextActivity.id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({
          whatsappComment: nextActivity.whatsappComment ?? undefined,
        }),
      });
      window.alert(t('common.whatsappSent'));
      setActivity(shared);
      return shared;
    }

    return nextActivity;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      if (isExternalVisit) {
        await saveExternalVisit(false);
        navigate('/activities');
        return;
      }
      const saved = await saveActivity(false);
      if (saved.activityType === 'APPRAISAL_REQUEST' && saved.appraisalRequestId) {
        navigate(`/appraisals/${saved.appraisalRequestId}/edit`);
        return;
      }

      navigate('/activities');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la actividad');
    }
  }

  async function handleSaveAndShare() {
    if (
      !canShareNow &&
      !canShareExpense &&
      !canShareExternalVisit &&
      !isReservation
    ) return;
    if (!formRef.current?.reportValidity()) return;

    setSavingAndSharing(true);
    setError('');

    try {
      if (isExternalVisit) {
        await saveExternalVisit(true);
        navigate('/activities');
        return;
      }
      await saveActivity(true);
      navigate('/activities');
    } catch (shareError) {
      setError(
        shareError instanceof Error
          ? shareError.message
          : 'No se pudo guardar y enviar el mensaje por WhatsApp',
      );
    } finally {
      setSavingAndSharing(false);
    }
  }

  async function handleCopyExpenseMessage() {
    if (!expenseWhatsappMessage) return;
    await navigator.clipboard.writeText(expenseWhatsappMessage);
    window.alert(t('activities.expenseMessageCopied'));
  }

  async function handleCopyExternalVisitMessage() {
    if (!externalVisitPreview) return;
    await navigator.clipboard.writeText(externalVisitPreview);
    window.alert(t('activities.expenseMessageCopied'));
  }

  function updateExpenseChecklist(
    key: ExpenseChecklistScalarKey,
    value: string | number | null,
  ) {
    setForm((current) => ({
      ...current,
      expenseCommissionPercent:
        (selectedOpportunity?.operationType === 'SALE' &&
          key === 'listingCommissionPercent') ||
        (selectedOpportunity?.operationType === 'BUY' &&
          key === 'purchaseCommissionPercent')
          ? value === null
            ? ''
            : String(value)
          : current.expenseCommissionPercent,
      expenseChecklist: {
        ...current.expenseChecklist,
        [key]: value,
        ...(key === 'counterpartyRealEstateAgency' &&
        selectedOpportunity?.operationType === 'BUY'
          ? {
              reservationHeldBy:
                current.expenseChecklist.reservationHeldBy ??
                (typeof value === 'string' ? value : null),
              allMoneyHeldBy:
                current.expenseChecklist.allMoneyHeldBy ??
                (typeof value === 'string' ? value : null),
            }
          : {}),
      },
    }));
  }

  function updateExpenseParty(
    group: 'owners' | 'buyers',
    index: number,
    key: keyof ExpenseChecklistPartyData,
    value: string | null,
  ) {
    setForm((current) => {
      const parties = [...current.expenseChecklist[group]];
      parties[index] = {
        ...(parties[index] ?? emptyChecklistParty()),
        [key]: value,
      };
      return {
        ...current,
        expenseChecklist: {
          ...current.expenseChecklist,
          [group]: parties,
        },
      };
    });
  }

  if (loading) {
    return (
      <div className="page-stack">
        <ResourcePageHeader
          eyebrow={t('activities.eyebrow')}
          title={isEditing ? t('activities.editActivity') : t('activities.newActivity')}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('activities.eyebrow')}
        title={isEditing ? t('activities.editActivity') : t('activities.newActivity')}
        actions={
          <Link to="/activities" className="ghost-button button-link">
            {t('activities.backToList')}
          </Link>
        }
      />

      {error ? <div className="card">{error}</div> : null}

      <section className="card">
        <form ref={formRef} className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('common.type')}
            <select
              value={form.activityType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  activityType: event.target.value as ActivityFormState['activityType'],
                  propertySearchFeedback:
                    event.target.value === 'PROPERTY_SEARCH'
                      ? current.propertySearchFeedback
                      : '',
                  markShared:
                    event.target.value === 'PROPERTY_SEARCH' ? current.markShared : false,
                  externalUrl:
                    event.target.value === 'PROPERTY_SEARCH' ||
                    event.target.value === 'RESERVATION' ||
                    event.target.value === 'EXTERNAL_VISIT'
                      ? current.externalUrl
                      : '',
                  whatsappComment:
                    event.target.value === 'PROPERTY_SEARCH' ? current.whatsappComment : '',
                  reservationAgentName:
                    event.target.value === 'RESERVATION'
                      ? current.reservationAgentName || user?.name || ''
                      : current.reservationAgentName,
                  commercialOpportunityId:
                    event.target.value === 'EXPENSE_BREAKDOWN'
                      ? current.commercialOpportunityId
                      : '',
                }))
              }
              disabled={isEditing && activity?.activityType === 'APPRAISAL_REQUEST'}
            >
              {activityTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {translateEnum('activityType', option)}
                </option>
              ))}
              <option value="EXTERNAL_VISIT" disabled={isEditing}>
                {t('calendar.externalVisitType')}
              </option>
            </select>
          </label>
          {isExpenseBreakdown ? (
            <label className="full-span">
              {t('activities.expenseOpportunity')}
              <select
                value={form.commercialOpportunityId}
                onChange={(event) => {
                  const nextOpportunity = opportunities.find(
                    (opportunity) => String(opportunity.id) === event.target.value,
                  );
                  setForm((current) => ({
                    ...current,
                    commercialOpportunityId: event.target.value,
                    contactId: nextOpportunity ? String(nextOpportunity.contactId) : '',
                    propertyId: nextOpportunity?.propertyId
                      ? String(nextOpportunity.propertyId)
                      : '',
                    expenseOperationAmount: toInputNumberValue(
                      nextOpportunity?.property?.price,
                    ),
                    expenseOperationCurrency:
                      nextOpportunity?.property?.currency ?? 'USD',
                    expensePropertyAddress:
                      nextOpportunity?.property?.address ?? '',
                    expenseCommissionPercent:
                      nextOpportunity?.operationType === 'SALE'
                        ? '3'
                        : nextOpportunity?.operationType === 'BUY'
                          ? '4'
                          : '',
                    expenseChecklist: nextOpportunity
                      ? prefillExpenseChecklist(
                          createEmptyExpenseChecklist(),
                          nextOpportunity,
                          user?.name ?? null,
                        )
                      : createEmptyExpenseChecklist(),
                  }));
                }}
                required
              >
                <option value="">{t('common.unassigned')}</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {translateEnum('operationType', opportunity.operationType)} -{' '}
                    {opportunity.title}
                  </option>
                ))}
              </select>
              <p className="muted">{t('activities.expenseOpportunityHint')}</p>
            </label>
          ) : null}
          <label>
            {form.activityType === 'VISIT'
              ? t('activities.visitContactOptional')
              : t('common.contact')}
            <SearchableCombobox
              value={form.contactId}
              options={visibleContacts.map((contact) => ({
                value: String(contact.id),
                label: contact.displayName,
              }))}
              searchValue={contactSearch}
              onSearchValueChange={setContactSearch}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  contactId: value,
                  ...(isExternalVisit && value !== current.contactId
                    ? {
                        visitSearchRequirementId: '',
                        visitCandidateId: '',
                        propertyId: '',
                        visitExternalPropertyTitle: '',
                        visitExternalPropertyAddress: '',
                        externalUrl: '',
                        visitColleagueContactId: '',
                        visitColleagueName: '',
                        visitColleagueWhatsapp: '',
                      }
                    : {}),
                }))
              }
              placeholder={t('common.search')}
              emptyLabel={t('activities.withoutContact')}
              loadingLabel={t('common.loading')}
              noResultsLabel={t('common.noData')}
              required={isPropertySearch || isAppraisalRequest || isExternalVisit}
              disabled={isExpenseBreakdown}
              loading={contactsLoading}
            />
          </label>
          {isAppraisalRequest ? (
            <label>
              {t('appraisals.propertyAddress')}
              <input
                value={form.appraisalPropertyAddress}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    appraisalPropertyAddress: event.target.value,
                  }))
                }
                required
              />
            </label>
          ) : (
            <>
              <label>
                {t('activities.activityDate')}
                <input
                  type="datetime-local"
                  value={form.activityDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, activityDate: event.target.value }))
                  }
                  required
                />
              </label>
              {!isExternalVisit ? (
                <label>
                  {t('activities.nextFollowUp')}
                  <input
                    type="datetime-local"
                    value={form.nextFollowUpDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nextFollowUpDate: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}
            </>
          )}
          {!isAppraisalRequest && !isExpenseBreakdown && !isExternalVisit ? (
            <div className="full-span stack-gap">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={linkProperty}
                  onChange={(event) => setLinkProperty(event.target.checked)}
                />
                <span>{t('activities.linkProperty')}</span>
              </label>
              {linkProperty ? (
                <label>
                  {t('activities.linkedProperty')}
                  <select
                    value={form.propertyId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, propertyId: event.target.value }))
                    }
                  >
                    <option value="">{t('activities.withoutProperty')}</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {formatPropertyOptionLabel(property, translateEnum, t)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {isAppraisalRequest ? (
            <p className="muted full-span">{t('activities.appraisalRequestHint')}</p>
          ) : null}
          {isExternalVisit ? (
            <>
              <div className="full-span stack-gap">
                <strong>Visita a propiedad de colega</strong>
                <p className="muted">
                  Elegí una propiedad de la búsqueda del contacto para completar los datos automáticamente, o cargalos manualmente.
                </p>
              </div>
              <label className="full-span">
                Búsqueda de propiedad del contacto
                <select
                  value={form.visitSearchRequirementId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visitSearchRequirementId: event.target.value,
                      visitCandidateId: '',
                      propertyId: '',
                      visitExternalPropertyTitle: '',
                      visitExternalPropertyAddress: '',
                      externalUrl: '',
                      visitColleagueContactId: '',
                      visitColleagueName: '',
                      visitColleagueWhatsapp: '',
                    }))
                  }
                  disabled={!form.contactId}
                >
                  <option value="">Todas / carga manual</option>
                  {visitRequirements.map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>
                      #{requirement.id} — {translateEnum('operationType', requirement.operationType)} —{' '}
                      {requirement.neighborhoods.join(', ') || requirement.propertyType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-span">
                Propiedad de la búsqueda
                <select
                  value={form.visitCandidateId}
                  onChange={(event) => handleVisitCandidateChange(event.target.value)}
                  disabled={!form.contactId || visitCandidatesLoading}
                >
                  <option value="">
                    {visitCandidatesLoading
                      ? t('common.loading')
                      : 'Carga manual / sin propiedad guardada'}
                  </option>
                  {visibleVisitCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title}
                      {candidate.agentName ? ` — ${candidate.agentName}` : ''}
                    </option>
                  ))}
                </select>
                {form.contactId &&
                !visitCandidatesLoading &&
                visibleVisitCandidates.length === 0 ? (
                  <p className="muted">El contacto no tiene propiedades guardadas en sus búsquedas.</p>
                ) : null}
              </label>
              {form.visitSearchRequirementId ? (
                <div className="full-span calendar-related-actions">
                  <Link
                    to={`/requirements/${form.visitSearchRequirementId}/manage`}
                    className="ghost-button button-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('requirements.manageRequirement')}
                  </Link>
                </div>
              ) : null}
              <label>
                Propiedad del CRM (opcional)
                <select
                  value={form.propertyId}
                  onChange={(event) => {
                    const property = properties.find(
                      (item) => String(item.id) === event.target.value,
                    );
                    setForm((current) => ({
                      ...current,
                      propertyId: event.target.value,
                      visitExternalPropertyTitle:
                        property?.title ?? current.visitExternalPropertyTitle,
                      visitExternalPropertyAddress:
                        property
                          ? [property.address, property.city].filter(Boolean).join(', ')
                          : current.visitExternalPropertyAddress,
                      externalUrl:
                        property?.publicationUrl ?? current.externalUrl,
                    }));
                  }}
                >
                  <option value="">Sin propiedad del CRM</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {formatPropertyOptionLabel(property, translateEnum, t)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('common.status')}
                <select
                  value={form.visitStatus}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visitStatus: event.target.value as VisitStatus,
                    }))
                  }
                >
                  <option value="SCHEDULED">Programada</option>
                  <option value="DONE">Realizada</option>
                  <option value="CANCELLED">Cancelada</option>
                  <option value="RESCHEDULED">Reprogramada</option>
                </select>
              </label>
              <label className="full-span">
                Título de la propiedad
                <input
                  value={form.visitExternalPropertyTitle}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visitExternalPropertyTitle: event.target.value,
                    }))
                  }
                  required={!form.propertyId}
                />
              </label>
              <label className="full-span">
                Dirección de la propiedad
                <input
                  value={form.visitExternalPropertyAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visitExternalPropertyAddress: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="full-span">
                Link de la propiedad
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      externalUrl: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Colega
                <SearchableCombobox
                  value={form.visitColleagueContactId}
                  options={contacts.map((contact) => ({
                    value: String(contact.id),
                    label: contact.displayName,
                  }))}
                  searchValue={visitColleagueSearch}
                  onSearchValueChange={setVisitColleagueSearch}
                  onChange={handleVisitColleagueChange}
                  placeholder="Buscar contacto"
                  emptyLabel={t('common.select')}
                  loadingLabel={t('common.loading')}
                  noResultsLabel={t('common.noData')}
                />
              </label>
              <label>
                WhatsApp del colega
                <input
                  value={form.visitColleagueWhatsapp}
                  readOnly
                  placeholder="Se completa desde el contacto"
                />
              </label>
              <label className="full-span">
                Nombre del colega
                <input
                  value={form.visitColleagueName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visitColleagueName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                {t('common.notes')}
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span expense-message-preview">
                Mensaje de WhatsApp
                <textarea value={externalVisitPreview} rows={12} readOnly />
              </label>
              <div className="full-span calendar-related-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleCopyExternalVisitMessage()}
                  disabled={!externalVisitPreview}
                >
                  {t('activities.expenseCopyMessage')}
                </button>
              </div>
            </>
          ) : isPropertySearch ? (
            <>
              <label className="full-span">
                {t('activities.listingUrl')}
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, externalUrl: event.target.value }))
                  }
                  required
                />
              </label>
              {showSavedPreview ? (
                <div className="full-span">
                  <ActivityPreviewCard activity={activity} title={t('activities.listingPreview')} />
                </div>
              ) : null}
              <label className="full-span">
                {t('activities.buyerFeedback')}
                <select
                  value={form.propertySearchFeedback}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      propertySearchFeedback: event.target.value as PropertySearchFeedback,
                    }))
                  }
                >
                  <option value="">{t('activities.noFeedback')}</option>
                  <option value="LIKED">{t('activities.likedProperty')}</option>
                  <option value="DISLIKED">{t('activities.dislikedProperty')}</option>
                </select>
              </label>
              <label className="full-span">
                {t('activities.whatsappComment')}
                <textarea
                  rows={3}
                  value={form.whatsappComment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      whatsappComment: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="checkbox-item full-span">
                <input
                  type="checkbox"
                  checked={form.markShared}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, markShared: event.target.checked }))
                  }
                />
                <span>{t('activities.markShared')}</span>
              </label>
              <label className="full-span">
                {t('activities.internalNotes')}
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
            </>
          ) : isReservation ? (
            <>
              <div className="full-span stack-gap">
                <strong>{t('activities.reservationDataTitle')}</strong>
              </div>
              <label>
                {t('activities.reservationAgentName')}
                <input
                  value={form.reservationAgentName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationAgentName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.reservationOperationType')}
                <select
                  value={form.reservationOperationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationOperationType: event.target.value as '' | OperationType,
                    }))
                  }
                  required
                >
                  <option value="">{t('common.unassigned')}</option>
                  <option value="SALE">{translateEnum('operationType', 'SALE')}</option>
                  <option value="BUY">{translateEnum('operationType', 'BUY')}</option>
                  <option value="RENT">{translateEnum('operationType', 'RENT')}</option>
                </select>
              </label>
              <label>
                {t('activities.reservationOperationAmount')}
                <input
                  type="number"
                  step="0.01"
                  value={form.reservationOperationAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationOperationAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationOperationCurrency')}
                <select
                  value={form.reservationOperationCurrency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationOperationCurrency: event.target.value as CurrencyType,
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label>
                {t('activities.reservationPropertyAddress')}
                <input
                  value={form.reservationPropertyAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationPropertyAddress: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationPropertyNeighborhood')}
                <input
                  value={form.reservationPropertyNeighborhood}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationPropertyNeighborhood: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationPropertyType')}
                <select
                  value={form.reservationPropertyType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationPropertyType: event.target.value as '' | PropertyType,
                    }))
                  }
                >
                  <option value="">{t('common.unassigned')}</option>
                  {propertyTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateEnum('propertyType', option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('activities.reservationSidesCount')}
                <input
                  type="number"
                  min="0"
                  value={form.reservationSidesCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationSidesCount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationCommissionPercent')}
                <input
                  type="number"
                  step="0.01"
                  value={form.reservationCommissionPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationCommissionPercent: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationAmount')}
                <input
                  type="number"
                  step="0.01"
                  value={form.reservationAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t('activities.reservationCurrency')}
                <select
                  value={form.reservationCurrency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationCurrency: event.target.value as CurrencyType,
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationSharedWithRealEstate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationSharedWithRealEstate: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationSharedWithRealEstate')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationConformed}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationConformed: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationConformed')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationCredit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationCredit: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationCredit')}</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.reservationRelocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationRelocation: event.target.checked,
                    }))
                  }
                />
                <span>{t('activities.reservationRelocation')}</span>
              </label>
              <label>
                {t('activities.reservationEstimatedClosingMonth')}
                <input
                  value={form.reservationEstimatedClosingMonth}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationEstimatedClosingMonth: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                {t('activities.reservationObservations')}
                <textarea
                  rows={4}
                  value={form.reservationObservations}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reservationObservations: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                {t('activities.reservationDocument')}
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      externalUrl: event.target.value,
                    }))
                  }
                  placeholder="https://drive.google.com/..."
                />
                <p className="muted">{t('activities.reservationDocumentHint')}</p>
                {activity?.externalUrl ? (
                  <p className="muted">
                    {t('activities.reservationDocumentCurrent')}:{' '}
                    <a
                      href={activity.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="agenda-link"
                    >
                      {activity.externalUrl}
                    </a>
                  </p>
                ) : null}
              </label>
              <label className="full-span">
                {t('common.description')}
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={3}
                />
              </label>
            </>
          ) : isExpenseBreakdown ? (
            <>
              <div className="full-span stack-gap">
                <strong>
                  {selectedOpportunity?.operationType === 'SALE'
                    ? t('activities.expenseSaleTitle')
                    : t('activities.expensePurchaseTitle')}
                </strong>
                <p className="muted">{t('activities.expensePrefillHint')}</p>
              </div>
              <label>
                {t('activities.expenseOperationAmount')}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.expenseOperationAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseOperationAmount: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.expenseCurrency')}
                <select
                  value={form.expenseOperationCurrency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseOperationCurrency: event.target.value as CurrencyType,
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label className="full-span">
                {t('activities.expensePropertyAddress')}
                <input
                  value={form.expensePropertyAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expensePropertyAddress: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.expenseCommissionPercent')}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.expenseCommissionPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseCommissionPercent: event.target.value,
                      expenseChecklist: {
                        ...current.expenseChecklist,
                        ...(selectedOpportunity?.operationType === 'SALE'
                          ? {
                              listingCommissionPercent: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }
                          : {
                              purchaseCommissionPercent: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }),
                      },
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.expenseVatPercent')}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.expenseVatPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseVatPercent: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t('activities.expenseInvoicedVatAmount')}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.expenseInvoicedVatAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseInvoicedVatAmount: event.target.value,
                    }))
                  }
                  placeholder={
                    expenseCalculation
                      ? formatExpenseAmount(
                          expenseCalculation.standardVatAmount,
                          form.expenseOperationCurrency,
                        )
                      : undefined
                  }
                />
                <p className="muted">{t('activities.expenseInvoicedVatHint')}</p>
              </label>
              <ExpenseChecklistSection
                title="Datos generales de la operación"
                fields={expenseGeneralFields}
                values={form.expenseChecklist}
                onChange={updateExpenseChecklist}
                open
              />
              <ExpenseChecklistSection
                title="Reserva, refuerzo y dinero entregado"
                fields={expenseMoneyFields}
                values={form.expenseChecklist}
                onChange={updateExpenseChecklist}
                open
              />
              <ExpensePartiesSection
                title="Datos de propietarios / vendedores"
                group="owners"
                parties={form.expenseChecklist.owners}
                onChange={updateExpenseParty}
              />
              <ExpensePartiesSection
                title="Datos de compradores"
                group="buyers"
                parties={form.expenseChecklist.buyers}
                onChange={updateExpenseParty}
              />
              <ExpenseChecklistSection
                title="Boleto de compraventa"
                fields={expenseAgreementFields}
                values={form.expenseChecklist}
                onChange={updateExpenseChecklist}
              />
              <ExpenseChecklistSection
                title="Escritura"
                fields={expenseDeedFields}
                values={form.expenseChecklist}
                onChange={updateExpenseChecklist}
              />
              <ExpenseChecklistSection
                title="Kit para la firma"
                fields={expenseKitFields}
                values={form.expenseChecklist}
                onChange={updateExpenseChecklist}
              />
              <label className="full-span">
                {t('activities.expenseNotaryExpenses')}
                <textarea
                  rows={2}
                  value={form.expenseNotaryExpenses}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseNotaryExpenses: event.target.value,
                    }))
                  }
                  placeholder={t('activities.expenseNotaryExpensesPlaceholder')}
                />
              </label>
              <label className="full-span">
                {t('activities.expenseObservations')}
                <textarea
                  rows={3}
                  value={form.expenseObservations}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expenseObservations: event.target.value,
                    }))
                  }
                />
              </label>
              {expenseCalculation && expenseBreakdownData ? (
                <section className="expense-breakdown-summary full-span">
                  <div>
                    <span>{t('activities.expenseCommissionAmount')}</span>
                    <strong>
                      {formatExpenseAmount(
                        expenseCalculation.commissionAmount,
                        expenseBreakdownData.operationCurrency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>{t('activities.expenseVatAmount')}</span>
                    <strong>
                      {formatExpenseAmount(
                        expenseCalculation.vatAmount,
                        expenseBreakdownData.operationCurrency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>{t('activities.expenseTotal')}</span>
                    <strong>
                      {formatExpenseAmount(
                        expenseCalculation.total,
                        expenseBreakdownData.operationCurrency,
                      )}
                    </strong>
                  </div>
                  {selectedOpportunity?.operationType === 'BUY' &&
                  expenseBreakdownData.amountAlreadyPaid !== null ? (
                    <div>
                      <span>{t('activities.expenseBalance')}</span>
                      <strong>
                        {formatExpenseAmount(
                          expenseCalculation.balance,
                          expenseBreakdownData.operationCurrency,
                        )}
                      </strong>
                    </div>
                  ) : null}
                </section>
              ) : null}
              <label className="full-span expense-message-preview">
                {t('activities.expenseMessagePreview')}
                <textarea value={expenseWhatsappMessage} rows={16} readOnly />
              </label>
              <div className="full-span calendar-related-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleCopyExpenseMessage()}
                  disabled={!expenseWhatsappMessage}
                >
                  {t('activities.expenseCopyMessage')}
                </button>
              </div>
            </>
          ) : (
            <label className="full-span">
              {t('common.description')}
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
              />
            </label>
          )}
          <div className="full-span calendar-related-actions">
            <button type="submit">{isEditing ? t('common.update') : t('activities.save')}</button>
            {selectedContact && !isExternalVisit
              ? visitRequirements.map((requirement) => (
                  <Link
                    key={requirement.id}
                    to={`/requirements/${requirement.id}/manage`}
                    target="_blank"
                    rel="noreferrer"
                    className="ghost-button button-link"
                  >
                    {t('requirements.manageRequirement')}
                    {visitRequirements.length > 1 ? ` #${requirement.id}` : ''}
                  </Link>
                ))
              : null}
            {form.activityType === 'CALL' && selectedContact ? (
              <Link
                to={buildRequirementCreateLink(selectedContact.id)}
                target="_blank"
                rel="noreferrer"
                className="ghost-button button-link"
              >
                {t('requirements.newRequirement')}
              </Link>
            ) : null}
            {isAppraisalRequest && activity?.appraisalRequestId ? (
              <Link
                to={`/appraisals/${activity.appraisalRequestId}/edit`}
                className="ghost-button button-link"
              >
                {t('activities.openAppraisalRequest')}
              </Link>
            ) : null}
            {isPropertySearch ? (
              <button
                type="button"
                className="ghost-button"
                disabled={!canShareNow || savingAndSharing}
                onClick={handleSaveAndShare}
              >
                {savingAndSharing ? t('common.loading') : t('activities.saveAndShare')}
              </button>
            ) : null}
            {isReservation ? (
              <button
                type="button"
                className="ghost-button"
                disabled={savingAndSharing}
                onClick={handleSaveAndShare}
              >
                {savingAndSharing
                  ? t('common.loading')
                  : t('activities.reservationSaveAndSend')}
              </button>
            ) : null}
            {isExpenseBreakdown ? (
              <button
                type="button"
                className="ghost-button"
                disabled={!canShareExpense || savingAndSharing}
                onClick={handleSaveAndShare}
              >
                {savingAndSharing
                  ? t('common.loading')
                  : t('activities.expenseSaveAndShare')}
              </button>
            ) : null}
            {isExternalVisit ? (
              <button
                type="button"
                className="ghost-button"
                disabled={!canShareExternalVisit || savingAndSharing}
                onClick={handleSaveAndShare}
              >
                {savingAndSharing
                  ? t('common.loading')
                  : 'Guardar y enviar por WhatsApp'}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function ExpenseChecklistSection({
  title,
  fields,
  values,
  onChange,
  open = false,
}: {
  title: string;
  fields: ExpenseChecklistFieldDefinition[];
  values: ExpenseBreakdownChecklistData;
  onChange: (
    key: ExpenseChecklistScalarKey,
    value: string | number | null,
  ) => void;
  open?: boolean;
}) {
  return (
    <details className="expense-checklist-section full-span" open={open}>
      <summary>{title}</summary>
      <div className="expense-checklist-grid">
        {fields.map((field) => {
          const value = values[field.key];
          return (
            <label key={field.key} className={field.fullSpan ? 'full-span' : undefined}>
              {field.label}
              {field.type === 'answer' ? (
                <select
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => onChange(field.key, event.target.value || null)}
                >
                  <option value="">Sin completar</option>
                  <option value="YES">Sí</option>
                  <option value="NO">No</option>
                  <option value="NOT_APPLICABLE">No aplica</option>
                </select>
              ) : (
                <input
                  type={field.type ?? 'text'}
                  min={field.type === 'number' ? '0' : undefined}
                  step={field.type === 'number' ? '0.01' : undefined}
                  value={value ?? ''}
                  onChange={(event) =>
                    onChange(
                      field.key,
                      field.type === 'number'
                        ? event.target.value
                          ? Number(event.target.value)
                          : null
                        : event.target.value || null,
                    )
                  }
                />
              )}
            </label>
          );
        })}
      </div>
    </details>
  );
}

function ExpensePartiesSection({
  title,
  group,
  parties,
  onChange,
}: {
  title: string;
  group: 'owners' | 'buyers';
  parties: ExpenseChecklistPartyData[];
  onChange: (
    group: 'owners' | 'buyers',
    index: number,
    key: keyof ExpenseChecklistPartyData,
    value: string | null,
  ) => void;
}) {
  const normalizedParties = [0, 1].map(
    (index) => parties[index] ?? emptyChecklistParty(),
  );

  return (
    <details className="expense-checklist-section full-span">
      <summary>{title}</summary>
      <div className="expense-party-list">
        {normalizedParties.map((party, index) => (
          <fieldset key={index} className="expense-party-card">
            <legend>{index === 0 ? 'Persona 1' : 'Persona 2 (opcional)'}</legend>
            <div className="expense-checklist-grid">
              <label>
                Nombre y apellido
                <input
                  value={party.name ?? ''}
                  onChange={(event) =>
                    onChange(group, index, 'name', event.target.value || null)
                  }
                />
              </label>
              <label>
                DNI
                <input
                  value={party.document ?? ''}
                  onChange={(event) =>
                    onChange(group, index, 'document', event.target.value || null)
                  }
                />
              </label>
              <label>
                CUIT / CUIL
                <input
                  value={party.taxId ?? ''}
                  onChange={(event) =>
                    onChange(group, index, 'taxId', event.target.value || null)
                  }
                />
              </label>
              <label>
                Fecha de nacimiento
                <input
                  type="date"
                  value={party.birthDate ?? ''}
                  onChange={(event) =>
                    onChange(group, index, 'birthDate', event.target.value || null)
                  }
                />
              </label>
              <label>
                Teléfono
                <input
                  type="tel"
                  value={party.phone ?? ''}
                  onChange={(event) =>
                    onChange(group, index, 'phone', event.target.value || null)
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={party.email ?? ''}
                  onChange={(event) =>
                    onChange(group, index, 'email', event.target.value || null)
                  }
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>
    </details>
  );
}

function normalizeExpenseChecklist(
  value: ExpenseBreakdownChecklistData | null | undefined,
  legacyTotalDeliveredAmount: number | null = null,
) {
  const empty = createEmptyExpenseChecklist();
  if (!value) {
    return empty;
  }

  return {
    ...empty,
    ...value,
    totalDeliveredAmount:
      value.totalDeliveredAmount ?? legacyTotalDeliveredAmount,
    owners: [0, 1].map((index) => ({
      ...emptyChecklistParty(),
      ...(value.owners?.[index] ?? {}),
    })),
    buyers: [0, 1].map((index) => ({
      ...emptyChecklistParty(),
      ...(value.buyers?.[index] ?? {}),
    })),
  };
}

function prefillExpenseChecklist(
  current: ExpenseBreakdownChecklistData,
  opportunity: CommercialOpportunity,
  fallbackAgentName: string | null,
) {
  const reservation = opportunity.sourceActivity?.reservationData;
  const contact = opportunity.contact;
  const property = opportunity.property;
  const normalized = normalizeExpenseChecklist(current);
  const isSale = opportunity.operationType === 'SALE';
  const primaryParty: ExpenseChecklistPartyData = {
    name: contact?.displayName ?? null,
    document: contact?.documentNumber ?? null,
    taxId: null,
    birthDate: contact?.birthday
      ? toDateInputValue(new Date(contact.birthday))
      : null,
    phone: contact?.phone ?? contact?.whatsapp ?? null,
    email: contact?.email ?? null,
  };
  const reservationAmount =
    normalized.reservationAmount ?? reservation?.reservationAmount ?? null;
  const counterpartyAgency =
    normalized.counterpartyRealEstateAgency ??
    opportunity.counterpartyRealEstateAgency;

  return {
    ...normalized,
    reportDate: normalized.reportDate ?? toDateInputValue(new Date()),
    agentName:
      normalized.agentName ?? reservation?.agentName ?? fallbackAgentName,
    listingCommissionPercent:
      normalized.listingCommissionPercent ??
      (isSale ? reservation?.commissionPercent ?? 3 : null),
    purchaseCommissionPercent:
      normalized.purchaseCommissionPercent ??
      (!isSale ? reservation?.commissionPercent ?? 4 : null),
    propertyStatus:
      normalized.propertyStatus ?? formatOpportunityStageForChecklist(opportunity.stage),
    creditAnswer:
      normalized.creditAnswer ?? booleanToChecklistAnswer(reservation?.credit),
    sharedOperationAnswer:
      normalized.sharedOperationAnswer ??
      booleanToChecklistAnswer(reservation?.sharedWithRealEstate),
    counterpartyRealEstateAgency:
      counterpartyAgency,
    propertyReference:
      normalized.propertyReference ??
      (property ? String(property.id) : null),
    listingPrice: normalized.listingPrice ?? property?.price ?? null,
    reservationDate:
      normalized.reservationDate ??
      (opportunity.sourceActivity?.activityType === 'RESERVATION' &&
      opportunity.sourceActivity.activityDate
        ? toDateInputValue(new Date(opportunity.sourceActivity.activityDate))
        : null),
    reservationAmount,
    reservationHeldBy:
      normalized.reservationHeldBy ?? (!isSale ? counterpartyAgency : null),
    totalDeliveredAmount:
      normalized.totalDeliveredAmount ?? reservationAmount,
    allMoneyHeldBy:
      normalized.allMoneyHeldBy ?? (!isSale ? counterpartyAgency : null),
    owners: isSale
      ? mergePrimaryChecklistParty(normalized.owners, primaryParty)
      : normalized.owners,
    buyers: isSale
      ? normalized.buyers
      : mergePrimaryChecklistParty(normalized.buyers, primaryParty),
  };
}

function mergePrimaryChecklistParty(
  parties: ExpenseChecklistPartyData[],
  primary: ExpenseChecklistPartyData,
) {
  const first = parties[0] ?? emptyChecklistParty();
  return [
    {
      ...first,
      name: first.name ?? primary.name,
      document: first.document ?? primary.document,
      birthDate: first.birthDate ?? primary.birthDate,
      phone: first.phone ?? primary.phone,
      email: first.email ?? primary.email,
    },
    parties[1] ?? emptyChecklistParty(),
  ];
}

function booleanToChecklistAnswer(value: boolean | null | undefined) {
  return value === true ? ('YES' as const) : value === false ? ('NO' as const) : null;
}

function formatOpportunityStageForChecklist(stage: CommercialOpportunity['stage']) {
  const labels: Record<CommercialOpportunity['stage'], string> = {
    NEW: 'Nueva',
    QUALIFYING: 'En calificación',
    SEARCHING: 'En búsqueda',
    PRELISTING_SENT: 'Prelisting enviado',
    PRELISTING_COMPLETED: 'Prelisting completo',
    PROPERTY_READY: 'Propiedad lista',
    VISITING: 'En visitas',
    NEGOTIATING: 'En negociación',
    RESERVED: 'Reservado',
    CLOSED_WON: 'Cerrada ganada',
    CLOSED_LOST: 'Cerrada perdida',
  };
  return labels[stage];
}

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function buildActivityPayload(
  form: ActivityFormState,
  linkProperty: boolean,
  activity: Activity | null,
  selectedOpportunity: CommercialOpportunity | null,
) {
  const isPropertySearch = form.activityType === 'PROPERTY_SEARCH';
  const isAppraisalRequest = form.activityType === 'APPRAISAL_REQUEST';
  const isReservation = form.activityType === 'RESERVATION';
  const isExpenseBreakdown = form.activityType === 'EXPENSE_BREAKDOWN';
  const activityDate = isAppraisalRequest
    ? activity?.activityDate ?? new Date().toISOString()
    : form.activityDate;

  return {
    contactId: form.contactId ? Number(form.contactId) : null,
    propertyId:
      !isAppraisalRequest && linkProperty && form.propertyId ? Number(form.propertyId) : null,
    commercialOpportunityId:
      isExpenseBreakdown && form.commercialOpportunityId
        ? Number(form.commercialOpportunityId)
        : null,
    activityType: form.activityType,
    title: isAppraisalRequest ? 'Prelisting' : form.title.trim() || undefined,
    description: isAppraisalRequest ? null : form.description || null,
    appraisalPropertyAddress: isAppraisalRequest ? form.appraisalPropertyAddress || null : null,
    externalUrl:
      isPropertySearch || isReservation ? form.externalUrl || null : null,
    whatsappComment: isPropertySearch ? form.whatsappComment || null : null,
    whatsappSharedAt:
      !isPropertySearch
        ? null
        : form.markShared
          ? activity?.whatsappSharedAt ?? new Date().toISOString()
          : null,
    propertySearchLiked:
      !isPropertySearch
        ? null
        : form.propertySearchFeedback === 'LIKED'
          ? true
          : form.propertySearchFeedback === 'DISLIKED'
            ? false
            : null,
    reservationData: isReservation ? buildReservationDataPayload(form) : null,
    expenseBreakdownData: isExpenseBreakdown
      ? buildExpenseBreakdownDataPayload(
          form,
          selectedOpportunity?.operationType ??
            activity?.commercialOpportunity?.operationType,
        )
      : null,
    activityDate,
    nextFollowUpDate: isAppraisalRequest ? null : form.nextFollowUpDate || null,
  };
}

function buildExpenseBreakdownDataPayload(
  form: ActivityFormState,
  operationType: OperationType | null | undefined,
): ExpenseBreakdownActivityData | null {
  if (operationType !== 'SALE' && operationType !== 'BUY') {
    return null;
  }

  return {
    operationType,
    operationAmount: parseOptionalNumber(form.expenseOperationAmount),
    operationCurrency: form.expenseOperationCurrency,
    propertyAddress: form.expensePropertyAddress.trim() || null,
    commissionPercent: parseOptionalNumber(form.expenseCommissionPercent),
    vatPercent: parseOptionalNumber(form.expenseVatPercent),
    invoicedVatAmount: parseOptionalNumber(form.expenseInvoicedVatAmount),
    amountAlreadyPaid:
      operationType === 'BUY'
        ? form.expenseChecklist.totalDeliveredAmount ??
          parseOptionalNumber(form.expenseAmountAlreadyPaid)
        : null,
    notaryExpenses: form.expenseNotaryExpenses.trim() || null,
    observations: form.expenseObservations.trim() || null,
    checklist: form.expenseChecklist,
  };
}

function buildReservationDataPayload(
  form: ActivityFormState,
): ReservationActivityData {
  return {
    agentName: form.reservationAgentName.trim() || null,
    operationType: form.reservationOperationType || null,
    operationAmount: parseOptionalNumber(form.reservationOperationAmount),
    operationCurrency: form.reservationOperationCurrency,
    propertyAddress: form.reservationPropertyAddress.trim() || null,
    propertyNeighborhood: form.reservationPropertyNeighborhood.trim() || null,
    propertyType: form.reservationPropertyType || null,
    sidesCount: parseOptionalNumber(form.reservationSidesCount),
    commissionPercent: parseOptionalNumber(form.reservationCommissionPercent),
    reservationAmount: parseOptionalNumber(form.reservationAmount),
    reservationCurrency: form.reservationCurrency,
    sharedWithRealEstate: form.reservationSharedWithRealEstate,
    conformed: form.reservationConformed,
    credit: form.reservationCredit,
    relocation: form.reservationRelocation,
    estimatedClosingMonth: form.reservationEstimatedClosingMonth.trim() || null,
    observations: form.reservationObservations.trim() || null,
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toInputNumberValue(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function formatExpenseAmount(value: number, currency: CurrencyType) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const propertyTypeOptions: PropertyType[] = [
  'HOUSE',
  'APARTMENT',
  'PH',
  'LAND',
  'OFFICE',
  'COMMERCIAL',
  'OTHER',
];

function toDateTimeLocalValue(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
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

function resolveVisitColleagueWhatsapp(contact: Contact | null) {
  return contact?.whatsapp?.trim() || contact?.phone?.trim() || null;
}

function findMatchingVisitColleague(
  contacts: Contact[],
  name: string | null | undefined,
  whatsapp: string | null | undefined,
) {
  const normalizedPhone = whatsapp?.replace(/\D/g, '') ?? '';
  if (normalizedPhone) {
    const byPhone = contacts.find((contact) =>
      [contact.whatsapp, contact.phone]
        .filter(Boolean)
        .some((value) => value?.replace(/\D/g, '') === normalizedPhone),
    );
    if (byPhone) return byPhone;
  }

  const normalizedName = name?.trim().toLocaleLowerCase('es') ?? '';
  return normalizedName
    ? contacts.find(
        (contact) =>
          contact.displayName.trim().toLocaleLowerCase('es') === normalizedName,
      ) ?? null
    : null;
}

function resolveVisitCandidateAddress(candidate: BuyerPropertyCandidate) {
  return candidate.property?.address
    ? [candidate.property.address, candidate.property.city]
        .filter(Boolean)
        .join(', ')
    : candidate.title;
}

function formatPropertyOptionLabel(
  property: Property,
  translateEnum: (group: 'propertyStatus', value: string) => string,
  t: (path: string) => string,
) {
  const details = [property.neighborhood];

  if (property.price) {
    details.push(`${property.currency} ${property.price}`);
  } else {
    details.push(t('properties.noPrice'));
  }

  details.push(translateEnum('propertyStatus', property.status));

  return `${property.title} - ${details.filter(Boolean).join(' - ')}`;
}

function buildRequirementCreateLink(contactId: number) {
  const params = new URLSearchParams({
    contactId: String(contactId),
  });

  return `/requirements/new?${params.toString()}`;
}

function ActivityPreviewCard({
  activity,
  title,
}: {
  activity: Activity;
  title: string;
}) {
  const previewTitle = activity.externalPreviewTitle ?? activity.title;
  const previewDescription = activity.externalPreviewDescription;
  const previewDomain = activity.externalPreviewDomain;
  const previewImageUrl = activity.externalPreviewImageUrl;

  if (!previewTitle && !previewDescription && !previewImageUrl && !previewDomain) {
    return null;
  }

  return (
    <div className="activity-preview-card">
      {previewImageUrl ? (
        <img src={previewImageUrl} alt={previewTitle ?? title} className="activity-preview-image" />
      ) : null}
      <div className="activity-preview-copy">
        <p className="eyebrow activity-preview-eyebrow">{title}</p>
        {previewTitle ? <strong>{previewTitle}</strong> : null}
        {previewDescription ? <p className="muted">{previewDescription}</p> : null}
        {previewDomain ? <p className="muted">{previewDomain}</p> : null}
      </div>
    </div>
  );
}
