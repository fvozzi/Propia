import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AppUserRole } from '../common/enums';

@Injectable()
export class BackofficeGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { appRole?: AppUserRole; backofficeAccess?: boolean }
      | undefined;

    if (user?.appRole === AppUserRole.ADMIN && user.backofficeAccess) {
      return true;
    }

    throw new ForbiddenException('Backoffice access required');
  }
}
