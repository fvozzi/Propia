import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Profile } from 'passport-google-oauth20';
import { Repository } from 'typeorm';
import { AppUserRole } from '../common/enums';
import { UserStatus } from '../common/enums';
import { getAccessDenialMessage } from './access-policy';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
import { LoginEvent, type LoginMethod } from './login-event.entity';
import { UserWorkspaceService } from './user-workspace.service';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(GoogleCalendarConnection)
    private readonly googleConnectionsRepository: Repository<GoogleCalendarConnection>,
    @InjectRepository(LoginEvent)
    private readonly loginEventsRepository: Repository<LoginEvent>,
    private readonly jwtService: JwtService,
    private readonly userWorkspaceService: UserWorkspaceService,
  ) {}

  async login(
    email: string,
    password: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const normalizedEmail = normalizeEmail(email);
    let user = await this.usersRepository.findOne({ where: { email: normalizedEmail } });

    if (!user || !user.passwordHash) {
      await this.recordLoginEvent({
        email: normalizedEmail,
        success: false,
        authMethod: 'PASSWORD',
        failureReason: 'INVALID_CREDENTIALS',
        ...context,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      await this.recordLoginEvent({
        email: normalizedEmail,
        userId: user.id,
        teamId: user.activeTeamId,
        success: false,
        authMethod: 'PASSWORD',
        failureReason: 'INVALID_CREDENTIALS',
        ...context,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    user = await this.userWorkspaceService.ensurePersonalTeam(user);
    const response = await this.buildAuthResponse(user);
    await this.recordSuccessfulLogin(user, 'PASSWORD', context);
    return response;
  }

  async loginWithGoogle(
    params: {
      accessToken: string;
      refreshToken?: string;
      profile: Profile;
    },
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const primaryEmail = params.profile.emails?.[0]?.value
      ? normalizeEmail(params.profile.emails[0].value)
      : null;

    if (!primaryEmail) {
      throw new UnauthorizedException('Google account has no email');
    }

    let user = await this.usersRepository.findOne({
      where: { email: primaryEmail },
    });

    if (!user) {
      user = await this.usersRepository.save(
        this.usersRepository.create({
          email: primaryEmail,
          name: params.profile.displayName || primaryEmail,
          passwordHash: null,
          backofficeAccess: false,
          status: UserStatus.ACTIVE,
        }),
      );
    } else if (params.profile.displayName && user.name !== params.profile.displayName) {
      user.name = params.profile.displayName;
      user = await this.usersRepository.save(user);
    }

    user = await this.userWorkspaceService.ensurePersonalTeam(user);

    const existingConnection = await this.googleConnectionsRepository.findOne({
      where: { userId: user.id },
    });

    const connection = existingConnection
      ? Object.assign(existingConnection, {
          googleSub: params.profile.id,
          email: primaryEmail,
          accessToken: params.accessToken,
          refreshToken: params.refreshToken || existingConnection.refreshToken,
          scope: 'openid profile email https://www.googleapis.com/auth/calendar.events',
          tokenType: 'Bearer',
          isActive: true,
        })
      : this.googleConnectionsRepository.create({
          userId: user.id,
          googleSub: params.profile.id,
          email: primaryEmail,
          calendarId: 'primary',
          isActive: true,
          accessToken: params.accessToken,
          refreshToken: params.refreshToken ?? null,
          scope: 'openid profile email https://www.googleapis.com/auth/calendar.events',
          tokenType: 'Bearer',
        });

    await this.googleConnectionsRepository.save(connection);

    const response = await this.buildAuthResponse(user);
    await this.recordSuccessfulLogin(user, 'GOOGLE', context);
    return response;
  }

  async getGoogleConnectionStatus(userId: number) {
    const connection = await this.googleConnectionsRepository.findOne({
      where: {
        userId,
        isActive: true,
      },
    });

    return {
      connected: Boolean(connection),
      calendarId: connection?.calendarId ?? null,
      email: connection?.email ?? null,
    };
  }

  async switchActiveTeam(userId: number, teamId: number) {
    await this.userWorkspaceService.setActiveTeam(userId, teamId);
    const user = await this.usersRepository.findOneOrFail({ where: { id: userId } });
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const [hydratedUser, googleConnection] = await Promise.all([
      this.userWorkspaceService.loadUserWithWorkspace(user.id),
      this.googleConnectionsRepository.findOne({
        where: { userId: user.id, isActive: true },
      }),
    ]);

    const denialMessage = getAccessDenialMessage({
      userStatus: hydratedUser.status ?? UserStatus.ACTIVE,
      accountStatus: hydratedUser.activeTeam?.status ?? null,
    });
    if (denialMessage) {
      throw new UnauthorizedException(denialMessage);
    }

    const appRole = hydratedUser.appRole ?? AppUserRole.USER;

    return {
      accessToken: await this.jwtService.signAsync({
        sub: hydratedUser.id,
        email: hydratedUser.email,
        appRole,
        backofficeAccess: Boolean(hydratedUser.backofficeAccess),
        activeTeamId: hydratedUser.activeTeamId,
      }),
      user: {
        id: hydratedUser.id,
        email: hydratedUser.email,
        name: hydratedUser.name,
        appRole,
        backofficeAccess: Boolean(hydratedUser.backofficeAccess),
        status: hydratedUser.status ?? UserStatus.ACTIVE,
        activeTeamId: hydratedUser.activeTeamId,
        activeTeamName: hydratedUser.activeTeam?.name ?? null,
        activeTeamWhatsappTreasuryPhone:
          hydratedUser.activeTeam?.whatsappTreasuryPhone ?? null,
        googleCalendarConnected: Boolean(googleConnection),
        teams: (hydratedUser.memberships ?? []).map((membership) => ({
          id: membership.team.id,
          name: membership.team.name,
          membershipRole: membership.role,
        })),
      },
    };
  }

  private async recordSuccessfulLogin(
    user: User,
    authMethod: LoginMethod,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount ?? 0) + 1;
    await this.usersRepository.save(user);

    await this.recordLoginEvent({
      email: user.email,
      userId: user.id,
      teamId: user.activeTeamId,
      success: true,
      authMethod,
      ...context,
    });
  }

  private async recordLoginEvent(params: {
    email: string;
    userId?: number | null;
    teamId?: number | null;
    success: boolean;
    authMethod: LoginMethod;
    ipAddress?: string | null;
    userAgent?: string | null;
    failureReason?: string | null;
  }) {
    await this.loginEventsRepository.save(
      this.loginEventsRepository.create({
        email: params.email,
        userId: params.userId ?? null,
        teamId: params.teamId ?? null,
        success: params.success,
        authMethod: params.authMethod,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        failureReason: params.failureReason ?? null,
      }),
    );
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
