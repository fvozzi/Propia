import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Profile } from 'passport-google-oauth20';
import { Repository } from 'typeorm';
import { AppUserRole } from '../common/enums';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
import { UserWorkspaceService } from './user-workspace.service';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(GoogleCalendarConnection)
    private readonly googleConnectionsRepository: Repository<GoogleCalendarConnection>,
    private readonly jwtService: JwtService,
    private readonly userWorkspaceService: UserWorkspaceService,
  ) {}

  async login(email: string, password: string) {
    let user = await this.usersRepository.findOne({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user = await this.userWorkspaceService.ensurePersonalTeam(user);
    return this.buildAuthResponse(user);
  }

  async loginWithGoogle(params: {
    accessToken: string;
    refreshToken?: string;
    profile: Profile;
  }) {
    const primaryEmail = params.profile.emails?.[0]?.value;

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

    return this.buildAuthResponse(user);
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

    const appRole = hydratedUser.appRole ?? AppUserRole.USER;

    return {
      accessToken: await this.jwtService.signAsync({
        sub: hydratedUser.id,
        email: hydratedUser.email,
        appRole,
        activeTeamId: hydratedUser.activeTeamId,
      }),
      user: {
        id: hydratedUser.id,
        email: hydratedUser.email,
        name: hydratedUser.name,
        appRole,
        activeTeamId: hydratedUser.activeTeamId,
        activeTeamName: hydratedUser.activeTeam?.name ?? null,
        googleCalendarConnected: Boolean(googleConnection),
        teams: (hydratedUser.memberships ?? []).map((membership) => ({
          id: membership.team.id,
          name: membership.team.name,
          membershipRole: membership.role,
        })),
      },
    };
  }
}
