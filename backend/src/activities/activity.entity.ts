import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityType } from '../common/enums';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import {
  CurrencyType,
  OperationType,
  PropertyType,
} from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';

export type ReservationActivityData = {
  agentName: string | null;
  operationType: OperationType | null;
  operationAmount: number | null;
  operationCurrency: CurrencyType | null;
  propertyAddress: string | null;
  propertyNeighborhood: string | null;
  propertyType: PropertyType | null;
  sidesCount: number | null;
  commissionPercent: number | null;
  reservationAmount: number | null;
  reservationCurrency: CurrencyType | null;
  sharedWithRealEstate: boolean | null;
  conformed: boolean | null;
  credit: boolean | null;
  relocation: boolean | null;
  estimatedClosingMonth: string | null;
  observations: string | null;
};

export type ChecklistAnswer = 'YES' | 'NO' | 'NOT_APPLICABLE';

export type ExpenseChecklistPartyData = {
  name: string | null;
  document: string | null;
  taxId: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
};

export type ExpenseBreakdownChecklistData = {
  reportDate: string | null;
  agentName: string | null;
  listingCommissionPercent: number | null;
  purchaseCommissionPercent: number | null;
  propertyStatus: string | null;
  creditAnswer: ChecklistAnswer | null;
  creditBank: string | null;
  sharedOperationAnswer: ChecklistAnswer | null;
  counterpartyRealEstateAgency: string | null;
  counterpartyAgentName: string | null;
  propertyReference: string | null;
  listingPrice: number | null;
  reservationDate: string | null;
  reservationAmount: number | null;
  reservationHeldBy: string | null;
  reservationConformedAnswer: ChecklistAnswer | null;
  reportsRequestedAnswer: ChecklistAnswer | null;
  reportsHandledBy: string | null;
  reportsDate: string | null;
  reinforcementDate: string | null;
  reinforcementAmount: number | null;
  totalDeliveredAmount: number | null;
  allMoneyHeldBy: string | null;
  paymentMethod: string | null;
  originalReservationInOfficeAnswer: ChecklistAnswer | null;
  notaryName: string | null;
  notaryEmail: string | null;
  notaryAddress: string | null;
  notaryPhone: string | null;
  owners: ExpenseChecklistPartyData[];
  buyers: ExpenseChecklistPartyData[];
  purchaseAgreementAnswer: ChecklistAnswer | null;
  originalsDeliveredForAgreementAnswer: ChecklistAnswer | null;
  agreementDate: string | null;
  agreementTime: string | null;
  agreementAddress: string | null;
  agreementDraftedAnswer: ChecklistAnswer | null;
  agreementReviewedByOfficeAnswer: ChecklistAnswer | null;
  agreementReviewedByPartiesAnswer: ChecklistAnswer | null;
  agreementPrintedAnswer: ChecklistAnswer | null;
  roomReservedAnswer: ChecklistAnswer | null;
  refundRequiredAtAgreementAnswer: ChecklistAnswer | null;
  refundFormAtAgreementAnswer: ChecklistAnswer | null;
  vatInvoicedAtAgreementAnswer: ChecklistAnswer | null;
  invoicesRequestedAtAgreementAnswer: ChecklistAnswer | null;
  pepUifFormsAtAgreementAnswer: ChecklistAnswer | null;
  sharedOperationFormAtAgreementAnswer: ChecklistAnswer | null;
  notaryContactedAnswer: ChecklistAnswer | null;
  originalsDeliveredForDeedAnswer: ChecklistAnswer | null;
  deedValue: number | null;
  deedDate: string | null;
  deedTime: string | null;
  deedAddress: string | null;
  commodatumRequiredAnswer: ChecklistAnswer | null;
  commodatumDraftedAnswer: ChecklistAnswer | null;
  commodatumReviewedAnswer: ChecklistAnswer | null;
  refundRequiredAtDeedAnswer: ChecklistAnswer | null;
  refundFormAtDeedAnswer: ChecklistAnswer | null;
  vatInvoicedAtDeedAnswer: ChecklistAnswer | null;
  invoicesRequestedAtDeedAnswer: ChecklistAnswer | null;
  pepUifFormsAtDeedAnswer: ChecklistAnswer | null;
  sharedOperationFormAtDeedAnswer: ChecklistAnswer | null;
  keysReadyAnswer: ChecklistAnswer | null;
  originalReservationAndAgreementReadyAnswer: ChecklistAnswer | null;
  sellerGift: string | null;
  buyerGift: string | null;
  notaryGift: string | null;
  otherAgentGift: string | null;
  extra: string | null;
  kitRubberBandsAnswer: ChecklistAnswer | null;
  kitPensAnswer: ChecklistAnswer | null;
  kitUsdChangeAnswer: ChecklistAnswer | null;
  kitArsChangeAnswer: ChecklistAnswer | null;
  kitAmountLabelsAnswer: ChecklistAnswer | null;
  kitIdsAnswer: ChecklistAnswer | null;
  kitInvoicesAndFormsAnswer: ChecklistAnswer | null;
  kitFolderAnswer: ChecklistAnswer | null;
  kitFoodAnswer: ChecklistAnswer | null;
  kitGiftsAnswer: ChecklistAnswer | null;
  kitPhotosAnswer: ChecklistAnswer | null;
  kitBusinessCardsAnswer: ChecklistAnswer | null;
};

export type ExpenseBreakdownActivityData = {
  operationType: OperationType.SALE | OperationType.BUY;
  operationAmount: number | null;
  operationCurrency: CurrencyType;
  propertyAddress: string | null;
  commissionPercent: number | null;
  vatPercent: number | null;
  invoicedVatAmount: number | null;
  amountAlreadyPaid: number | null;
  notaryExpenses: string | null;
  observations: string | null;
  checklist?: ExpenseBreakdownChecklistData;
};

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Contact, (contact) => contact.activities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ type: 'integer', nullable: true })
  contactId: number | null;

  @ManyToOne(() => Property, (property) => property.activities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column({ type: 'integer', nullable: true })
  propertyId: number | null;

  @ManyToOne(() => AppraisalRequest, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'appraisalRequestId' })
  appraisalRequest: AppraisalRequest | null;

  @Column({ type: 'integer', nullable: true })
  appraisalRequestId: number | null;

  @ManyToOne(
    () => CommercialOpportunity,
    (commercialOpportunity) => commercialOpportunity.activities,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'commercialOpportunityId' })
  commercialOpportunity: CommercialOpportunity | null;

  @Column({ type: 'integer', nullable: true })
  commercialOpportunityId: number | null;

  @Column({ type: 'enum', enum: ActivityType, enumName: 'activity_type' })
  activityType: ActivityType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPreviewImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPreviewTitle: string | null;

  @Column({ type: 'text', nullable: true })
  externalPreviewDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPreviewDomain: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  externalPreviewFetchedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  whatsappComment: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  whatsappSharedAt: Date | null;

  @Column({ type: 'boolean', nullable: true })
  propertySearchLiked: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  reservationData: ReservationActivityData | null;

  @Column({ type: 'jsonb', nullable: true })
  expenseBreakdownData: ExpenseBreakdownActivityData | null;

  @Column({ type: 'varchar', nullable: true })
  googleEventId: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  googleSyncStatus: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  googleSyncError: string | null;

  @Column({ type: 'timestamp with time zone' })
  activityDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  nextFollowUpDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
