import 'dotenv/config';
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { User } from '../auth/user.entity';
import {
  ActivityType,
  ContactRoleType,
  CurrencyType,
  OperationType,
  PropertyStatus,
  PropertyType,
  SearchRequirementStatus,
  VisitStatus,
} from '../common/enums';
import { ContactRole } from '../contacts/contact-role.entity';
import { Contact } from '../contacts/contact.entity';
import { PropertyPhoto } from '../properties/property-photo.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { Visit } from '../visits/visit.entity';
import { buildStandaloneDataSourceOptions } from './typeorm.config';

async function run() {
  const dataSource = new DataSource(buildStandaloneDataSourceOptions());
  await dataSource.initialize();

  const usersRepository = dataSource.getRepository(User);
  const contactsRepository = dataSource.getRepository(Contact);
  const requirementsRepository = dataSource.getRepository(SearchRequirement);
  const propertiesRepository = dataSource.getRepository(Property);
  const activitiesRepository = dataSource.getRepository(Activity);
  const visitsRepository = dataSource.getRepository(Visit);

  const existingUser = await usersRepository.findOne({
    where: { email: 'agent@inmoflow.local' },
  });

  const demoPasswordHash = await bcrypt.hash('inmoflow123', 10);

  if (!existingUser) {
    await usersRepository.save(
      usersRepository.create({
        email: 'agent@inmoflow.local',
        passwordHash: demoPasswordHash,
        name: 'Agente Demo',
      }),
    );
  } else if (!existingUser.passwordHash) {
    existingUser.passwordHash = demoPasswordHash;
    if (!existingUser.name) {
      existingUser.name = 'Agente Demo';
    }
    await usersRepository.save(existingUser);
  }

  const contactCount = await contactsRepository.count();
  if (contactCount > 0) {
    await dataSource.destroy();
    return;
  }

  const owner = await contactsRepository.save(
    contactsRepository.create({
      firstName: 'Marta',
      lastName: 'Suarez',
      displayName: 'Marta Suarez',
      phone: '+54 11 4000 1111',
      whatsapp: '+541140001111',
      email: 'marta@demo.com',
      source: 'Referido',
      notes: 'Propietaria predispuesta a visitas por la tarde.',
      roles: [
        dataSource.getRepository(ContactRole).create({ role: ContactRoleType.OWNER }),
        dataSource.getRepository(ContactRole).create({ role: ContactRoleType.REFERRER }),
      ],
    }),
  );

  const buyer = await contactsRepository.save(
    contactsRepository.create({
      firstName: 'Luciano',
      lastName: 'Perez',
      displayName: 'Luciano Perez',
      phone: '+54 11 4000 2222',
      whatsapp: '+541140002222',
      email: 'luciano@demo.com',
      source: 'Instagram',
      notes: 'Busca 3 ambientes con balcón y cochera.',
      roles: [dataSource.getRepository(ContactRole).create({ role: ContactRoleType.BUYER })],
    }),
  );

  const investor = await contactsRepository.save(
    contactsRepository.create({
      firstName: 'Sofia',
      lastName: 'Lopez',
      displayName: 'Sofia Lopez',
      phone: '+54 11 4000 3333',
      whatsapp: '+541140003333',
      email: 'sofia@demo.com',
      source: 'Evento',
      notes: 'Evalúa unidades chicas para renta.',
      roles: [dataSource.getRepository(ContactRole).create({ role: ContactRoleType.INVESTOR })],
    }),
  );

  const properties = await propertiesRepository.save([
    propertiesRepository.create({
      title: 'PH reciclado con patio',
      description: 'PH de 3 ambientes reciclado a nuevo.',
      address: 'Av. Directorio 1200',
      city: 'Buenos Aires',
      neighborhood: 'Caballito',
      operationType: OperationType.SALE,
      propertyType: PropertyType.PH,
      status: PropertyStatus.ACTIVE,
      price: 128000,
      currency: CurrencyType.USD,
      expenses: 25000,
      bedrooms: 2,
      bathrooms: 1,
      rooms: 3,
      coveredArea: 74,
      totalArea: 92,
      ownerContactId: owner.id,
      privateNotes: 'Hay margen para negociar un 5%.',
      photos: [
        dataSource.getRepository(PropertyPhoto).create({
          url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0',
          thumbnailUrl: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400',
          caption: 'Living comedor',
          orderIndex: 0,
        }),
      ],
    }),
    propertiesRepository.create({
      title: 'Departamento apto profesional',
      description: '2 ambientes luminosos cerca del subte.',
      address: 'Uriarte 900',
      city: 'Buenos Aires',
      neighborhood: 'Palermo',
      operationType: OperationType.RENT,
      propertyType: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      price: 850000,
      currency: CurrencyType.ARS,
      expenses: 120000,
      bedrooms: 1,
      bathrooms: 1,
      rooms: 2,
      coveredArea: 46,
      totalArea: 50,
      ownerContactId: owner.id,
      privateNotes: 'Ideal para captar consultas nuevas.',
      photos: [
        dataSource.getRepository(PropertyPhoto).create({
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
          thumbnailUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
          caption: 'Vista del living',
          orderIndex: 0,
        }),
      ],
    }),
    propertiesRepository.create({
      title: 'Lote con salida a dos calles',
      description: 'Terreno ideal desarrollo de unidades.',
      address: 'Los Aromos 450',
      city: 'Ituzaingo',
      neighborhood: 'Parque Leloir',
      operationType: OperationType.SALE,
      propertyType: PropertyType.LAND,
      status: PropertyStatus.CAPTURED,
      price: 210000,
      currency: CurrencyType.USD,
      expenses: 0,
      bedrooms: null,
      bathrooms: null,
      rooms: null,
      coveredArea: null,
      totalArea: 780,
      ownerContactId: investor.id,
      privateNotes: 'Falta confirmar normativa municipal.',
      photos: [
        dataSource.getRepository(PropertyPhoto).create({
          url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
          thumbnailUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
          caption: 'Vista del lote',
          orderIndex: 0,
        }),
      ],
    }),
  ]);

  await requirementsRepository.save([
    requirementsRepository.create({
      contactId: buyer.id,
      operationType: OperationType.SALE,
      propertyType: PropertyType.APARTMENT,
      neighborhoods: ['Caballito', 'Almagro'],
      minPrice: 90000,
      maxPrice: 150000,
      currency: CurrencyType.USD,
      minRooms: 3,
      minBedrooms: 2,
      notes: 'Prioriza balcón y buena luz.',
      status: SearchRequirementStatus.ACTIVE,
    }),
    requirementsRepository.create({
      contactId: investor.id,
      operationType: OperationType.SALE,
      propertyType: PropertyType.LAND,
      neighborhoods: ['Parque Leloir', 'Castelar Norte'],
      minPrice: 150000,
      maxPrice: 260000,
      currency: CurrencyType.USD,
      minRooms: null,
      minBedrooms: null,
      notes: 'Busca oportunidad para desarrollo chico.',
      status: SearchRequirementStatus.ACTIVE,
    }),
  ]);

  const todayMorning = new Date();
  todayMorning.setHours(10, 0, 0, 0);
  const todayAfternoon = new Date();
  todayAfternoon.setHours(16, 30, 0, 0);
  const overdueDate = new Date(todayMorning);
  overdueDate.setDate(overdueDate.getDate() - 1);
  const tomorrow = new Date(todayMorning);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await activitiesRepository.save([
    activitiesRepository.create({
      contactId: buyer.id,
      propertyId: properties[0].id,
      activityType: ActivityType.WHATSAPP,
      title: 'Seguimiento por PH en Caballito',
      description: 'Se envió ficha y pidió coordinar visita.',
      activityDate: new Date(),
      nextFollowUpDate: todayMorning,
    }),
    activitiesRepository.create({
      contactId: investor.id,
      propertyId: properties[2].id,
      activityType: ActivityType.CALL,
      title: 'Llamado por lote en Parque Leloir',
      description: 'Quedó pendiente reenviar métricas de FOT/FOS.',
      activityDate: overdueDate,
      nextFollowUpDate: overdueDate,
    }),
    activitiesRepository.create({
      contactId: owner.id,
      propertyId: properties[1].id,
      activityType: ActivityType.NOTE,
      title: 'Ajuste de precio sugerido',
      description: 'Evaluar ajuste según feedback de mercado.',
      activityDate: new Date(),
      nextFollowUpDate: null,
    }),
  ]);

  await visitsRepository.save([
    visitsRepository.create({
      propertyId: properties[0].id,
      contactId: buyer.id,
      scheduledAt: todayAfternoon,
      status: VisitStatus.SCHEDULED,
      notes: 'Confirmar media hora antes.',
    }),
    visitsRepository.create({
      propertyId: properties[1].id,
      contactId: investor.id,
      scheduledAt: tomorrow,
      status: VisitStatus.RESCHEDULED,
      notes: 'La clienta pidió moverla para mañana.',
    }),
  ]);

  await dataSource.destroy();
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
