import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AppUserRole } from '../common/enums';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { appRole?: AppUserRole } | undefined;

    if (user?.appRole === AppUserRole.ADMIN) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
