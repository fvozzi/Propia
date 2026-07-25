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

type GooglePersonLike = {
  names?: GoogleNameLike[] | null;
  phoneNumbers?: GooglePhoneLike[] | null;
  emailAddresses?: GoogleValueLike[] | null;
  biographies?: GoogleValueLike[] | null;
};

export type GoogleContactCandidate = {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
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

export function buildGoogleContactCandidate(
  person: GooglePersonLike,
): GoogleContactCandidate {
  const primaryName = pickPrimaryValue(person.names);
  const primaryPhone = pickPrimaryValue(person.phoneNumbers);
  const primaryEmail = pickPrimaryValue(person.emailAddresses);
  const primaryBiography = pickPrimaryValue(person.biographies);

  let displayName = primaryName?.displayName?.trim() ?? '';
  let firstName = primaryName?.givenName?.trim() ?? '';
  let lastName = primaryName?.familyName?.trim() ?? '';
  const phone = primaryPhone?.canonicalForm?.trim() || primaryPhone?.value?.trim() || null;
  const email = primaryEmail?.value?.trim() || null;
  const notes = primaryBiography?.value?.trim() || null;

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
    normalizedPhone: normalizeContactPhone(phone),
  };
}

function pickPrimaryValue<T extends { metadata?: GoogleMetadataLike | null }>(
  values: T[] | null | undefined,
) {
  if (!values?.length) {
    return null;
  }

  return values.find((value) => value.metadata?.primary) ?? values[0];
}
