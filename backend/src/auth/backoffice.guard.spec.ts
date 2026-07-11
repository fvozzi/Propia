import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppUserRole } from '../common/enums';
import { BackofficeGuard } from './backoffice.guard';

describe('BackofficeGuard', () => {
  function buildContext(user?: { appRole?: AppUserRole; backofficeAccess?: boolean }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  it('allows access only for admins with explicit backoffice permission', () => {
    const guard = new BackofficeGuard();

    expect(
      guard.canActivate(
        buildContext({
          appRole: AppUserRole.ADMIN,
          backofficeAccess: true,
        }),
      ),
    ).toBe(true);
  });

  it('rejects admin users without backoffice permission', () => {
    const guard = new BackofficeGuard();

    expect(() =>
      guard.canActivate(
        buildContext({
          appRole: AppUserRole.ADMIN,
          backofficeAccess: false,
        }),
      ),
    ).toThrow(new ForbiddenException('Backoffice access required'));
  });

  it('rejects regular users even if they somehow carry the flag', () => {
    const guard = new BackofficeGuard();

    expect(() =>
      guard.canActivate(
        buildContext({
          appRole: AppUserRole.USER,
          backofficeAccess: true,
        }),
      ),
    ).toThrow(new ForbiddenException('Backoffice access required'));
  });
});
