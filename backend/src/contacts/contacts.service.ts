import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { requireActiveTeamId, type AuthenticatedUser } from '../auth/current-user.decorator';
import { GoogleCalendarConnection } from '../auth/google-calendar-connection.entity';
import { GOOGLE_CONTACTS_READONLY_SCOPE, hasGoogleScope } from '../auth/google-scopes';
import {
  buildContactPhoneMatchKeys,
  type GoogleContactGroupDescriptor,
  buildGoogleContactCandidate,
  normalizeContactPhone,
} from '../use-cases/google-contact-sync.use-case';
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactRole } from './contact-role.entity';
import { Contact } from './contact.entity';

@Injectable()
export class ContactsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(ContactRole)
    private readonly rolesRepository: Repository<ContactRole>,
    @InjectRepository(GoogleCalendarConnection)
    private readonly googleConnectionsRepository: Repository<GoogleCalendarConnection>,
  ) {}

  async create(dto: CreateContactDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contactFields = this.normalizeContactFields(dto);
    const contact = this.contactsRepository.create({
      ...contactFields,
      teamId,
      ownerUserId: user.sub,
      roles: (dto.roles ?? []).map((role) => this.rolesRepository.create({ role })),
    });

    return this.contactsRepository.save(contact);
  }

  async findAll(query: QueryContactsDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const now = new Date().toISOString();
    const sortBy = query.sortBy ?? 'UPDATED_AT';
    const sortDirection = query.sortDirection ?? 'DESC';
    const qb = this.contactsRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.roles', 'roles')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('MAX(activity."activityDate")')
            .from(Activity, 'activity')
            .where('activity."contactId" = contact.id'),
        'contact_lastContactAt',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('MIN(activity."nextFollowUpDate")')
            .from(Activity, 'activity')
            .where('activity."contactId" = contact.id')
            .andWhere('activity."nextFollowUpDate" IS NOT NULL'),
        'contact_nextContactAt',
      )
      .where('contact.teamId = :teamId', { teamId });

    if (query.search) {
      qb.andWhere(
        `(contact.firstName ILIKE :search
          OR contact.lastName ILIKE :search
          OR contact.displayName ILIKE :search
          OR contact."documentNumber" ILIKE :search
          OR contact.phone ILIKE :search
          OR contact.email ILIKE :search
          OR EXISTS (
            SELECT 1
            FROM unnest(contact."googleTags") AS tag
            WHERE tag ILIKE :search
          ))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.displayName) {
      qb.andWhere('contact.displayName ILIKE :displayName', {
        displayName: `%${query.displayName}%`,
      });
    }

    if (query.role) {
      qb.andWhere('roles.role = :role', { role: query.role });
    }

    if (query.birthdayMonth) {
      qb.andWhere('contact.birthday ILIKE :birthdayMonth', {
        birthdayMonth: `%-${query.birthdayMonth}-%`,
      });
    }

    if (query.tag) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM unnest(contact."googleTags") AS tag
          WHERE tag ILIKE :tag
        )`,
        { tag: `%${query.tag}%` },
      );
    }

    if (query.lastContact === 'WITH_VALUE') {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM activities activity
          WHERE activity."contactId" = contact.id
        )`,
      );
    }

    if (query.lastContact === 'WITHOUT_VALUE') {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM activities activity
          WHERE activity."contactId" = contact.id
        )`,
      );
    }

    if (query.nextContact === 'WITH_VALUE') {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM activities activity
          WHERE activity."contactId" = contact.id
            AND activity."nextFollowUpDate" IS NOT NULL
        )`,
      );
    }

    if (query.nextContact === 'WITHOUT_VALUE') {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM activities activity
          WHERE activity."contactId" = contact.id
            AND activity."nextFollowUpDate" IS NOT NULL
        )`,
      );
    }

    if (query.nextContact === 'OVERDUE') {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM activities activity
          WHERE activity."contactId" = contact.id
            AND activity."nextFollowUpDate" IS NOT NULL
            AND activity."nextFollowUpDate" < :now
        )`,
        { now },
      );
    }

    if (query.phone) {
      qb.andWhere(
        '(contact.phone ILIKE :phone OR contact.whatsapp ILIKE :phone)',
        { phone: `%${query.phone}%` },
      );
    }

    if (sortBy === 'DISPLAY_NAME') {
      qb.orderBy('contact.displayName', sortDirection).addOrderBy('contact.id', 'ASC');
    } else {
      qb.orderBy('contact.updatedAt', sortDirection).addOrderBy('contact.id', 'DESC');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = await qb.getCount();
    const { entities, raw } = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const items = entities.map((contact) => {
      const rawContact = raw.find((entry) => Number(entry.contact_id) === contact.id);

      return Object.assign(contact, {
        lastContactAt: rawContact?.contact_lastContactAt ?? null,
        nextContactAt: rawContact?.contact_nextContactAt ?? null,
      });
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findAvailableTags(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const rows = await this.contactsRepository.query(
      `SELECT DISTINCT tag
       FROM contacts contact
       CROSS JOIN LATERAL unnest(contact."googleTags") AS tag
       WHERE contact."teamId" = $1
         AND tag IS NOT NULL
         AND btrim(tag) <> ''
       ORDER BY tag ASC`,
      [teamId],
    );

    return rows.map((row: { tag: string }) => row.tag);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contact = await this.contactsRepository.findOne({
      where: { id, teamId },
      relations: {
        roles: true,
        searchRequirements: {
          property: true,
        },
        propertyCandidates: {
          property: true,
          searchRequirement: true,
        },
        activities: {
          property: true,
        },
        commercialOpportunities: {
          property: true,
          searchRequirement: true,
          appraisalRequest: true,
        },
        visits: {
          property: true,
        },
        ownedProperties: true,
      },
      order: {
        activities: {
          activityDate: 'DESC',
        },
        visits: {
          scheduledAt: 'DESC',
        },
        propertyCandidates: {
          createdAt: 'DESC',
        },
        commercialOpportunities: {
          updatedAt: 'DESC',
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    return contact;
  }

  async update(id: number, dto: UpdateContactDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contact = await this.contactsRepository.findOne({
      where: { id, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    const { roles, ...rest } = dto;
    const contactFields = this.normalizeContactFields({
      firstName: rest.firstName ?? contact.firstName,
      lastName: rest.lastName ?? contact.lastName,
      displayName: rest.displayName ?? contact.displayName,
      phone: rest.phone ?? contact.phone ?? undefined,
      whatsapp: rest.whatsapp ?? contact.whatsapp ?? undefined,
      email: rest.email ?? contact.email ?? undefined,
      documentNumber: rest.documentNumber ?? contact.documentNumber ?? undefined,
      birthday: rest.birthday ?? contact.birthday ?? undefined,
      googleTags: rest.googleTags ?? contact.googleTags ?? [],
      source: rest.source ?? contact.source ?? undefined,
      notes: rest.notes ?? contact.notes ?? undefined,
    });
    Object.assign(contact, contactFields);
    const saved = await this.contactsRepository.save(contact);

    if (roles) {
      await this.rolesRepository
        .createQueryBuilder()
        .delete()
        .from(ContactRole)
        .where('"contactId" = :id', { id })
        .execute();

      if (roles.length > 0) {
        await this.rolesRepository.save(
          roles.map((role) => this.rolesRepository.create({ role, contact: saved })),
        );
      }
    }

    return this.findOne(id, user);
  }

  async syncGoogleContacts(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const connection = await this.googleConnectionsRepository.findOne({
      where: {
        userId: user.sub,
        isActive: true,
      },
    });

    if (!connection) {
      throw new BadRequestException(
        'Tu cuenta Google no esta conectada. Volve a ingresar con Google para sincronizar contactos.',
      );
    }

    if (!hasGoogleScope(connection.scope, GOOGLE_CONTACTS_READONLY_SCOPE)) {
      throw new BadRequestException(
        'Tu cuenta Google no tiene permisos sobre Google Contacts. Volve a ingresar con Google para actualizar permisos.',
      );
    }

    const people = await this.createGooglePeopleClient(connection);
    const contactGroupsByResourceName = await this.loadGoogleContactGroups(people);
    const existingContacts = await this.contactsRepository.find({
      where: { teamId },
    });
    const contactsByPhone = new Map<string, Contact | null>();
    const contactsByEmail = new Map<string, Contact | null>();
    const processedPhones = new Set<string>();

    for (const contact of existingContacts) {
      this.indexContactByLookupValue(
        contactsByPhone,
        buildContactPhoneMatchKeys(contact.phone),
        contact,
      );
      this.indexContactByLookupValue(
        contactsByPhone,
        buildContactPhoneMatchKeys(contact.whatsapp),
        contact,
      );
      this.indexContactByLookupValue(
        contactsByEmail,
        [this.normalizeContactEmail(contact.email)].filter((value): value is string => Boolean(value)),
        contact,
      );
    }

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let pageToken: string | undefined;

    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,phoneNumbers,biographies,birthdays,memberships',
        sortOrder: 'FIRST_NAME_ASCENDING',
        pageToken,
      });

      for (const person of response.data.connections ?? []) {
        processedCount += 1;
        const candidate = buildGoogleContactCandidate(person, contactGroupsByResourceName);

        if (!candidate.normalizedPhone) {
          skippedCount += 1;
          continue;
        }

        if (processedPhones.has(candidate.normalizedPhone)) {
          skippedCount += 1;
          continue;
        }

        processedPhones.add(candidate.normalizedPhone);
        const existingContact =
          this.findUniqueContactByLookupValue(contactsByPhone, [
            ...buildContactPhoneMatchKeys(candidate.phone),
            ...buildContactPhoneMatchKeys(candidate.whatsapp),
          ]) ??
          this.findUniqueContactByLookupValue(contactsByEmail, [
            this.normalizeContactEmail(candidate.email),
          ]);

        if (existingContact) {
          const nextFields = this.normalizeContactFields({
            firstName: candidate.firstName || existingContact.firstName,
            lastName: candidate.lastName || existingContact.lastName,
            displayName: candidate.displayName || existingContact.displayName,
            phone: candidate.phone ?? existingContact.phone ?? undefined,
            whatsapp: candidate.whatsapp ?? existingContact.whatsapp ?? undefined,
            email: candidate.email ?? existingContact.email ?? undefined,
            documentNumber: existingContact.documentNumber ?? undefined,
            birthday: candidate.birthday ?? existingContact.birthday ?? undefined,
            googleTags:
              candidate.googleTags.length > 0
                ? candidate.googleTags
                : existingContact.googleTags ?? [],
            source: this.mergeContactSource(existingContact.source, 'GOOGLE_CONTACTS'),
            notes: existingContact.notes ?? candidate.notes ?? undefined,
          });

          Object.assign(existingContact, nextFields);
          await this.contactsRepository.save(existingContact);
          updatedCount += 1;
          continue;
        }

        const createdContact = this.contactsRepository.create({
          ...this.normalizeContactFields({
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            displayName: candidate.displayName,
            phone: candidate.phone ?? undefined,
            whatsapp: candidate.whatsapp ?? undefined,
            email: candidate.email ?? undefined,
            birthday: candidate.birthday ?? undefined,
            googleTags: candidate.googleTags,
            source: 'GOOGLE_CONTACTS',
            notes: candidate.notes ?? undefined,
          }),
          teamId,
          ownerUserId: user.sub,
        });

        const savedContact = await this.contactsRepository.save(createdContact);
        this.indexContactByLookupValue(
          contactsByPhone,
          buildContactPhoneMatchKeys(savedContact.phone),
          savedContact,
        );
        this.indexContactByLookupValue(
          contactsByPhone,
          buildContactPhoneMatchKeys(savedContact.whatsapp),
          savedContact,
        );
        this.indexContactByLookupValue(
          contactsByEmail,
          [this.normalizeContactEmail(savedContact.email)].filter((value): value is string => Boolean(value)),
          savedContact,
        );
        createdCount += 1;
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return {
      connected: true,
      email: connection.email,
      processedCount,
      createdCount,
      updatedCount,
      skippedCount,
    };
  }

  async remove(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const contact = await this.contactsRepository.findOne({
      where: { id, teamId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.contactsRepository.remove(contact);
    return { success: true };
  }

  private async createGooglePeopleClient(connection: GoogleCalendarConnection) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken ?? undefined,
      refresh_token: connection.refreshToken ?? undefined,
      expiry_date: connection.expiryDate ?? undefined,
      scope: connection.scope ?? undefined,
      token_type: connection.tokenType ?? undefined,
    });

    oauth2Client.on('tokens', async (tokens) => {
      connection.accessToken = tokens.access_token ?? connection.accessToken;
      connection.refreshToken = tokens.refresh_token ?? connection.refreshToken;
      connection.expiryDate = tokens.expiry_date ?? connection.expiryDate;
      connection.scope = tokens.scope ?? connection.scope;
      connection.tokenType = tokens.token_type ?? connection.tokenType;
      await this.googleConnectionsRepository.save(connection);
    });

    return google.people({
      version: 'v1',
      auth: oauth2Client,
    });
  }

  private async loadGoogleContactGroups(people: ReturnType<typeof google.people>) {
    const groups = new Map<string, GoogleContactGroupDescriptor>();
    let pageToken: string | undefined;

    do {
      const response = await people.contactGroups.list({
        pageSize: 1000,
        pageToken,
        groupFields: 'name,groupType',
      });

      for (const group of response.data.contactGroups ?? []) {
        if (!group.resourceName) {
          continue;
        }

        groups.set(group.resourceName, {
          name: group.name ?? null,
          groupType: group.groupType ?? null,
        });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return groups;
  }

  private mergeContactSource(
    currentSource: string | null | undefined,
    nextSource: string,
  ) {
    if (!currentSource) {
      return nextSource;
    }

    if (currentSource.includes(nextSource)) {
      return currentSource;
    }

    return `${currentSource}, ${nextSource}`;
  }

  private normalizeContactEmail(value: string | null | undefined) {
    const normalized = value?.trim().toLowerCase();
    return normalized || null;
  }

  private indexContactByLookupValue(
    lookup: Map<string, Contact | null>,
    values: string[],
    contact: Contact,
  ) {
    values.forEach((value) => {
      const existing = lookup.get(value);

      if (!existing) {
        lookup.set(value, contact);
        return;
      }

      if (existing.id !== contact.id) {
        lookup.set(value, null);
      }
    });
  }

  private findUniqueContactByLookupValue(
    lookup: Map<string, Contact | null>,
    values: Array<string | null | undefined>,
  ) {
    const matches = new Map<number, Contact>();

    values
      .filter((value): value is string => Boolean(value))
      .forEach((value) => {
        const match = lookup.get(value);

        if (match) {
          matches.set(match.id, match);
        }
      });

    if (matches.size !== 1) {
      return null;
    }

    return Array.from(matches.values())[0];
  }

  private normalizeContactFields(dto: Pick<
    CreateContactDto,
    | 'firstName'
    | 'lastName'
    | 'displayName'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'documentNumber'
    | 'birthday'
    | 'googleTags'
    | 'source'
    | 'notes'
  >) {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName?.trim() ?? '';
    const displayName = dto.displayName?.trim() || [firstName, lastName].filter(Boolean).join(' ');

    return {
      firstName,
      lastName,
      displayName,
      phone: dto.phone ?? null,
      whatsapp: dto.whatsapp ?? null,
      email: dto.email ?? null,
      documentNumber: dto.documentNumber ?? null,
      birthday: dto.birthday ?? null,
      googleTags: dto.googleTags ?? [],
      source: dto.source ?? null,
      notes: dto.notes ?? null,
    };
  }
}
