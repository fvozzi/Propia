import { UnauthorizedException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: number;
  email: string;
  name?: string;
  appRole: 'ADMIN' | 'USER';
  backofficeAccess?: boolean;
  activeTeamId: number | null;
  impersonatedByUserId?: number | null;
  impersonatedByEmail?: string | null;
  impersonatedByName?: string | null;
  userStatus?: 'ACTIVE' | 'PENDING' | 'DISABLED';
  activeTeamStatus?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);

export function requireActiveTeamId(user: AuthenticatedUser) {
  if (!user.activeTeamId) {
    throw new UnauthorizedException('No active team selected for this session.');
  }

  return user.activeTeamId;
}
