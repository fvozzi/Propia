import { UnauthorizedException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: number;
  email: string;
  appRole: 'ADMIN' | 'USER';
  activeTeamId: number | null;
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
