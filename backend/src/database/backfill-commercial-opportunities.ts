import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import {
  ActivityType,
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
  PropertyType,
} from '../common/enums';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Contact } from '../contacts/contact.entity';
import { FinancialEntry } from '../finances/financial-entry.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { buildStandaloneDataSourceOptions } from './typeorm.config';

async function run() {
  const dataSource = new DataSource(buildStandaloneDataSourceOptions());
  await dataSource.initialize();

  const contactsRepository = dataSource.getRepository(Contact);
  const requirementsRepository = dataSource.getRepository(SearchRequirement);
  const appraisalsRepository = dataSource.getRepository(AppraisalRequest);
  const propertiesRepository = dataSource.getRepository(Property);
  const activitiesRepository = dataSource.getRepository(Activity);
  const financialEntriesRepository = dataSource.getRepository(FinancialEntry);
  const opportunitiesRepository = dataSource.getRepository(CommercialOpportunity);

  const counters = {
    created: 0,
    updated: 0,
    linkedActivities: 0,
    linkedFinancialEntries: 0,
  };

  const contacts = await contactsRepository.find({
    select: { id: true, displayName: true, teamId: true },
  });
  const contactNames = new Map(contacts.map((contact) => [contact.id, contact.displayName]));

  const requirements = await requirementsRepository.find({
    order: { createdAt: 'ASC' },
  });

  for (const requirement of requirements) {
    let opportunity = await opportunitiesRepository.findOne({
      where: { teamId: requirement.teamId, searchRequirementId: requirement.id },
    });

    const fallbackTitle = buildRequirementOpportunityTitle(
      contactNames.get(requirement.contactId) ?? `Contacto #${requirement.contactId}`,
      requirement.operationType,
      requirement.propertyType,
    );

    if (!opportunity) {
      opportunity = opportunitiesRepository.create({
        teamId: requirement.teamId,
        ownerUserId: requirement.ownerUserId,
        contactId: requirement.contactId,
        operationType: requirement.operationType,
        stage: stageFromRequirement(requirement.operationType, requirement.propertyId),
        status: CommercialOpportunityStatus.OPEN,
        sourceActivityId: null,
        searchRequirementId: requirement.id,
        appraisalRequestId: null,
        propertyId: requirement.propertyId ?? null,
        title: fallbackTitle,
        summary: requirement.notes?.trim() || null,
        lostReason: null,
        closedAt: null,
      });
      await opportunitiesRepository.save(opportunity);
      counters.created += 1;
      continue;
    }

    let dirty = false;
    if (!opportunity.title?.trim()) {
      opportunity.title = fallbackTitle;
      dirty = true;
    }
    if (!opportunity.propertyId && requirement.propertyId) {
      opportunity.propertyId = requirement.propertyId;
      dirty = true;
    }
    if (!opportunity.summary && requirement.notes?.trim()) {
      opportunity.summary = requirement.notes.trim();
      dirty = true;
    }

    if (dirty) {
      await opportunitiesRepository.save(opportunity);
      counters.updated += 1;
    }
  }

  const appraisals = await appraisalsRepository.find({
    relations: { properties: true },
    order: { createdAt: 'ASC' },
  });

  for (const appraisal of appraisals) {
    const linkedPropertyId = appraisal.properties[0]?.id ?? null;
    const sourceActivity = await activitiesRepository.findOne({
      where: { teamId: appraisal.teamId, appraisalRequestId: appraisal.id },
      order: { activityDate: 'ASC' },
    });

    let opportunity = await opportunitiesRepository.findOne({
      where: { teamId: appraisal.teamId, appraisalRequestId: appraisal.id },
    });

    const nextStage = linkedPropertyId
      ? CommercialOpportunityStage.PROPERTY_READY
      : appraisal.submittedAt
        ? CommercialOpportunityStage.PRELISTING_COMPLETED
        : CommercialOpportunityStage.PRELISTING_SENT;
    const nextTitle = appraisal.propertyAddress?.trim()
      ? `Venta - ${appraisal.propertyAddress.trim()}`
      : 'Venta - Prelisting';

    if (!opportunity) {
      opportunity = opportunitiesRepository.create({
        teamId: appraisal.teamId,
        ownerUserId: appraisal.ownerUserId,
        contactId: appraisal.contactId,
        operationType: appraisal.operationType ?? OperationType.SALE,
        stage: nextStage,
        status: CommercialOpportunityStatus.OPEN,
        sourceActivityId: sourceActivity?.id ?? null,
        searchRequirementId: null,
        appraisalRequestId: appraisal.id,
        propertyId: linkedPropertyId,
        title: nextTitle,
        summary: appraisal.additionalNotes?.trim() || null,
        lostReason: null,
        closedAt: null,
      });
      await opportunitiesRepository.save(opportunity);
      counters.created += 1;
      continue;
    }

    let dirty = false;
    if (opportunity.stage !== nextStage) {
      opportunity.stage = nextStage;
      dirty = true;
    }
    if (!opportunity.propertyId && linkedPropertyId) {
      opportunity.propertyId = linkedPropertyId;
      dirty = true;
    }
    if (!opportunity.sourceActivityId && sourceActivity?.id) {
      opportunity.sourceActivityId = sourceActivity.id;
      dirty = true;
    }
    if (!opportunity.title?.trim()) {
      opportunity.title = nextTitle;
      dirty = true;
    }
    if (!opportunity.summary && appraisal.additionalNotes?.trim()) {
      opportunity.summary = appraisal.additionalNotes.trim();
      dirty = true;
    }

    if (dirty) {
      await opportunitiesRepository.save(opportunity);
      counters.updated += 1;
    }
  }

  const properties = await propertiesRepository.find({
    where: { operationType: OperationType.SALE },
    order: { createdAt: 'ASC' },
  });

  for (const property of properties) {
    if (!property.ownerContactId) {
      continue;
    }

    const linkedRequirement = await requirementsRepository.findOne({
      where: {
        teamId: property.teamId,
        propertyId: property.id,
        operationType: OperationType.SALE,
      },
      order: { createdAt: 'ASC' },
    });

    let opportunity =
      (property.appraisalRequestId
        ? await opportunitiesRepository.findOne({
            where: {
              teamId: property.teamId,
              appraisalRequestId: property.appraisalRequestId,
            },
          })
        : null) ??
      (linkedRequirement
        ? await opportunitiesRepository.findOne({
            where: {
              teamId: property.teamId,
              searchRequirementId: linkedRequirement.id,
            },
          })
        : null) ??
      (await opportunitiesRepository.findOne({
        where: {
          teamId: property.teamId,
          propertyId: property.id,
        },
      }));

    const nextTitle = property.title?.trim()
      ? `Venta - ${property.title.trim()}`
      : `Venta - ${property.address}`;

    if (!opportunity) {
      opportunity = opportunitiesRepository.create({
        teamId: property.teamId,
        ownerUserId: property.ownerUserId,
        contactId: property.ownerContactId,
        operationType: OperationType.SALE,
        stage: CommercialOpportunityStage.PROPERTY_READY,
        status: CommercialOpportunityStatus.OPEN,
        sourceActivityId: null,
        searchRequirementId: linkedRequirement?.id ?? null,
        appraisalRequestId: property.appraisalRequestId ?? null,
        propertyId: property.id,
        title: nextTitle,
        summary: property.privateNotes?.trim() || null,
        lostReason: null,
        closedAt: null,
      });
      await opportunitiesRepository.save(opportunity);
      counters.created += 1;
      continue;
    }

    let dirty = false;
    if (!opportunity.propertyId) {
      opportunity.propertyId = property.id;
      dirty = true;
    }
    if (!opportunity.searchRequirementId && linkedRequirement?.id) {
      opportunity.searchRequirementId = linkedRequirement.id;
      dirty = true;
    }
    if (opportunity.stage !== CommercialOpportunityStage.PROPERTY_READY) {
      opportunity.stage = CommercialOpportunityStage.PROPERTY_READY;
      dirty = true;
    }
    if (!opportunity.title?.trim()) {
      opportunity.title = nextTitle;
      dirty = true;
    }

    if (dirty) {
      await opportunitiesRepository.save(opportunity);
      counters.updated += 1;
    }
  }

  const activities = await activitiesRepository.find({
    order: { createdAt: 'ASC' },
  });

  for (const activity of activities) {
    if (activity.commercialOpportunityId) {
      continue;
    }

    const opportunity = await resolveOpportunityForActivity(
      activity,
      opportunitiesRepository,
    );

    if (!opportunity) {
      continue;
    }

    activity.commercialOpportunityId = opportunity.id;
    await activitiesRepository.save(activity);
    counters.linkedActivities += 1;
  }

  const financialEntries = await financialEntriesRepository.find({
    order: { createdAt: 'ASC' },
  });

  for (const entry of financialEntries) {
    if (entry.commercialOpportunityId) {
      continue;
    }

    let opportunityId: number | null = null;

    if (entry.activityId) {
      const activity = await activitiesRepository.findOne({
        where: { id: entry.activityId, teamId: entry.teamId },
      });
      opportunityId = activity?.commercialOpportunityId ?? null;
    }

    if (!opportunityId && entry.searchRequirementId) {
      const opportunity = await opportunitiesRepository.findOne({
        where: {
          teamId: entry.teamId,
          searchRequirementId: entry.searchRequirementId,
        },
      });
      opportunityId = opportunity?.id ?? null;
    }

    if (!opportunityId) {
      continue;
    }

    entry.commercialOpportunityId = opportunityId;
    await financialEntriesRepository.save(entry);
    counters.linkedFinancialEntries += 1;
  }

  console.log('Backfill commercial opportunities complete');
  console.log(JSON.stringify(counters, null, 2));

  await dataSource.destroy();
}

function stageFromRequirement(
  operationType: OperationType,
  propertyId: number | null,
) {
  if (operationType === OperationType.SALE) {
    return propertyId
      ? CommercialOpportunityStage.PROPERTY_READY
      : CommercialOpportunityStage.QUALIFYING;
  }

  if (operationType === OperationType.BUY || operationType === OperationType.RENT) {
    return CommercialOpportunityStage.SEARCHING;
  }

  return CommercialOpportunityStage.NEW;
}

function buildRequirementOpportunityTitle(
  contactName: string,
  operationType: OperationType,
  propertyType: PropertyType,
) {
  const prefix =
    operationType === OperationType.BUY
      ? 'Compra'
      : operationType === OperationType.SALE
        ? 'Venta'
        : 'Alquiler';

  return `${prefix} - ${contactName} - ${propertyType}`;
}

async function resolveOpportunityForActivity(
  activity: Activity,
  opportunitiesRepository: Repository<CommercialOpportunity>,
) {
  if (activity.appraisalRequestId) {
    return opportunitiesRepository.findOne({
      where: {
        teamId: activity.teamId,
        appraisalRequestId: activity.appraisalRequestId,
      },
    });
  }

  if (activity.propertyId) {
    return opportunitiesRepository.findOne({
      where: {
        teamId: activity.teamId,
        propertyId: activity.propertyId,
      },
      order: { updatedAt: 'DESC' },
    });
  }

  if (
    activity.contactId &&
    (activity.activityType === ActivityType.SALE_DEED ||
      activity.activityType === ActivityType.PURCHASE_DEED)
  ) {
    return opportunitiesRepository.findOne({
      where: {
        teamId: activity.teamId,
        contactId: activity.contactId,
        operationType:
          activity.activityType === ActivityType.SALE_DEED
            ? OperationType.SALE
            : OperationType.BUY,
      },
      order: { updatedAt: 'DESC' },
    });
  }

  return null;
}

void run().catch((error) => {
  console.error('Commercial opportunities backfill failed');
  console.error(error);
  process.exitCode = 1;
});
