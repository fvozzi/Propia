export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';
export const GOOGLE_CONTACTS_READONLY_SCOPE =
  'https://www.googleapis.com/auth/contacts.readonly';

export const GOOGLE_LOGIN_SCOPES = [
  'openid',
  'profile',
  'email',
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CONTACTS_READONLY_SCOPE,
] as const;

export function hasGoogleScope(scope: string | null | undefined, expected: string) {
  if (!scope) {
    return false;
  }

  return scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(expected);
}
