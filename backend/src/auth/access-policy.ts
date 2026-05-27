import { AccountStatus, UserStatus } from '../common/enums';

export function getUserAccessDenialMessage(status: UserStatus) {
  if (status === UserStatus.PENDING) {
    return 'Usuario pendiente de validacion';
  }

  if (status === UserStatus.DISABLED) {
    return 'Usuario deshabilitado';
  }

  return null;
}

export function getAccountAccessDenialMessage(status: AccountStatus | null | undefined) {
  if (status === AccountStatus.SUSPENDED) {
    return 'Cuenta suspendida';
  }

  if (status === AccountStatus.CANCELLED) {
    return 'Cuenta cancelada';
  }

  return null;
}

export function getAccessDenialMessage(params: {
  userStatus: UserStatus;
  accountStatus?: AccountStatus | null;
}) {
  return (
    getUserAccessDenialMessage(params.userStatus) ??
    getAccountAccessDenialMessage(params.accountStatus)
  );
}
