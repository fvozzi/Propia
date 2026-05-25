import { OperationType, VisitStatus } from '../common/enums';

export type PropertyMapCategory = 'SALE' | 'VISITED';

type PropertyMapPropertyInput = {
  id: number;
  title: string;
  address: string;
  city: string;
  neighborhood: string | null;
  operationType: OperationType;
  propertyType: string;
  status: string;
  price: number | null;
  currency: string;
};

type PropertyMapVisitInput = {
  propertyId: number;
  scheduledAt: Date | string;
  status: VisitStatus;
};

export type PropertyMapItem = {
  propertyId: number;
  title: string;
  address: string;
  city: string;
  neighborhood: string | null;
  operationType: OperationType;
  propertyType: string;
  status: string;
  price: number | null;
  currency: string;
  categories: PropertyMapCategory[];
  visitCount: number;
  lastVisitedAt: string | null;
};

export function buildPropertyMapItems(
  properties: PropertyMapPropertyInput[],
  visits: PropertyMapVisitInput[],
): PropertyMapItem[] {
  const doneVisitsByPropertyId = new Map<number, PropertyMapVisitInput[]>();

  visits
    .filter((visit) => visit.status === VisitStatus.DONE)
    .forEach((visit) => {
      const current = doneVisitsByPropertyId.get(visit.propertyId) ?? [];
      current.push(visit);
      doneVisitsByPropertyId.set(visit.propertyId, current);
    });

  return properties
    .map((property) => {
      const doneVisits = doneVisitsByPropertyId.get(property.id) ?? [];
      const categories: PropertyMapCategory[] = [];

      if (property.operationType === OperationType.SALE) {
        categories.push('SALE');
      }

      if (doneVisits.length > 0) {
        categories.push('VISITED');
      }

      if (categories.length === 0) {
        return null;
      }

      const lastVisitedAt =
        doneVisits.length > 0
          ? new Date(
              Math.max(
                ...doneVisits.map((visit) => new Date(visit.scheduledAt).getTime()),
              ),
            ).toISOString()
          : null;

      return {
        propertyId: property.id,
        title: property.title,
        address: property.address,
        city: property.city,
        neighborhood: property.neighborhood,
        operationType: property.operationType,
        propertyType: property.propertyType,
        status: property.status,
        price: property.price,
        currency: property.currency,
        categories,
        visitCount: doneVisits.length,
        lastVisitedAt,
      };
    })
    .filter((item): item is PropertyMapItem => Boolean(item))
    .sort((left, right) => left.title.localeCompare(right.title, 'es'));
}
