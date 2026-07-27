type GoogleMetadataLike = {
  primary?: boolean | null;
};

type GoogleValueLike = {
  value?: string | null;
  metadata?: GoogleMetadataLike | null;
};

type GooglePhoneLike = GoogleValueLike & {
  canonicalForm?: string | null;
};

type GoogleNameLike = {
  displayName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  metadata?: GoogleMetadataLike | null;
};

type GoogleDateLike = {
  year?: number | null;
  month?: number | null;
  day?: number | null;
};

type GoogleBirthdayLike = {
  date?: GoogleDateLike | null;
  metadata?: GoogleMetadataLike | null;
};

type GoogleMembershipLike = {
  metadata?: GoogleMetadataLike | null;
  contactGroupMembership?: {
    contactGroupResourceName?: string | null;
  } | null;
};

export type GoogleContactGroupDescriptor = {
  name: string | null;
  groupType: string | null;
};

type GooglePersonLike = {
  names?: GoogleNameLike[] | null;
  phoneNumbers?: GooglePhoneLike[] | null;
  emailAddresses?: GoogleValueLike[] | null;
  biographies?: GoogleValueLike[] | null;
  birthdays?: GoogleBirthdayLike[] | null;
  memberships?: GoogleMembershipLike[] | null;
};

export type GoogleContactCandidate = {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
  birthday: string | null;
  googleTags: string[];
  normalizedPhone: string | null;
};

export function normalizeContactPhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D+/g, '');

  if (!digits) {
    return null;
  }

  return digits.startsWith('00') ? digits.slice(2) : digits;
}

export function buildContactPhoneMatchKeys(value: string | null | undefined) {
  const normalized = normalizeContactPhone(value);
  if (!normalized) {
    return [];
  }

  const keys = new Set<string>([normalized]);

  if (!normalized.startsWith('54') && normalized.length >= 10 && normalized.length <= 11) {
    keys.add(`549${normalized}`);
    keys.add(`54${normalized}`);
  }

  if (normalized.startsWith('0')) {
    const nationalNumber = normalized.slice(1);

    for (const areaCodeLength of [2, 3, 4]) {
      if (nationalNumber.slice(areaCodeLength, areaCodeLength + 2) !== '15') {
        continue;
      }

      keys.add(
        `549${nationalNumber.slice(0, areaCodeLength)}${nationalNumber.slice(areaCodeLength + 2)}`,
      );
    }
  }

  return Array.from(keys);
}

export function buildGoogleContactCandidate(
  person: GooglePersonLike,
  contactGroupsByResourceName: Map<string, GoogleContactGroupDescriptor> = new Map(),
): GoogleContactCandidate {
  const primaryName = pickPrimaryValue(person.names);
  const primaryPhone = pickPrimaryValue(person.phoneNumbers);
  const primaryEmail = pickPrimaryValue(person.emailAddresses);
  const primaryBiography = pickPrimaryValue(person.biographies);
  const primaryBirthday = pickPrimaryValue(person.birthdays);

  let displayName = primaryName?.displayName?.trim() ?? '';
  let firstName = primaryName?.givenName?.trim() ?? '';
  let lastName = primaryName?.familyName?.trim() ?? '';
  const phone = primaryPhone?.canonicalForm?.trim() || primaryPhone?.value?.trim() || null;
  const email = primaryEmail?.value?.trim() || null;
  const notes = primaryBiography?.value?.trim() || null;
  const birthday = formatGoogleBirthday(primaryBirthday?.date);
  const googleTags = extractGoogleTags(person.memberships, contactGroupsByResourceName);

  if (!displayName) {
    displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  if (!displayName) {
    displayName = email ?? phone ?? 'Contacto Google';
  }

  if (!firstName) {
    const [firstToken, ...restTokens] = displayName.split(/\s+/).filter(Boolean);
    firstName = firstToken ?? displayName;

    if (!lastName && restTokens.length > 0) {
      lastName = restTokens.join(' ');
    }
  }

  return {
    firstName,
    lastName,
    displayName,
    phone,
    whatsapp: phone,
    email,
    notes,
    birthday,
    googleTags,
    normalizedPhone: normalizeContactPhone(phone),
  };
}

function extractGoogleTags(
  memberships: GoogleMembershipLike[] | null | undefined,
  contactGroupsByResourceName: Map<string, GoogleContactGroupDescriptor>,
) {
  if (!memberships?.length) {
    return [];
  }

  return Array.from(
    new Set(
      memberships
        .map((membership) =>
          resolveGoogleContactGroupLabel(
            membership.contactGroupMembership?.contactGroupResourceName ?? null,
            contactGroupsByResourceName,
          ),
        )
        .filter((value): value is string => Boolean(value))
    ),
  );
}

function resolveGoogleContactGroupLabel(
  resourceName: string | null,
  contactGroupsByResourceName: Map<string, GoogleContactGroupDescriptor>,
) {
  if (!resourceName) {
    return null;
  }

  const descriptor = contactGroupsByResourceName.get(resourceName);
  const suffix = resourceName.split('/').pop()?.trim() ?? '';

  if (IGNORED_GOOGLE_CONTACT_GROUP_SUFFIXES.has(suffix)) {
    return null;
  }

  if (descriptor?.groupType === 'SYSTEM_CONTACT_GROUP') {
    const localizedSystemLabel = GOOGLE_SYSTEM_GROUP_LABELS[suffix];
    if (localizedSystemLabel) {
      return localizedSystemLabel;
    }
  }

  const name = descriptor?.name?.trim();
  if (name) {
    return name;
  }

  return null;
}

const IGNORED_GOOGLE_CONTACT_GROUP_SUFFIXES = new Set([
  'myContacts',
  'starred',
  'starredInAndroid',
  'blocked',
  'domainShared',
]);

const GOOGLE_SYSTEM_GROUP_LABELS: Record<string, string> = {
  coworkers: 'Trabajo',
  friends: 'Amigos',
  family: 'Familia',
};

function formatGoogleBirthday(value: GoogleDateLike | null | undefined) {
  if (!value?.month || !value?.day) {
    return null;
  }

  const month = String(value.month).padStart(2, '0');
  const day = String(value.day).padStart(2, '0');

  if (!value.year) {
    return `--${month}-${day}`;
  }

  return `${String(value.year).padStart(4, '0')}-${month}-${day}`;
}

function pickPrimaryValue<T extends { metadata?: GoogleMetadataLike | null }>(
  values: T[] | null | undefined,
) {
  if (!values?.length) {
    return null;
  }

  return values.find((value) => value.metadata?.primary) ?? values[0];
}
