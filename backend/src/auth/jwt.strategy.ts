import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AppUserRole, UserStatus } from '../common/enums';
import { getAccessDenialMessage } from './access-policy';
import { User } from './user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    appRole: 'ADMIN' | 'USER';
    backofficeAccess?: boolean;
    activeTeamId: number | null;
  }) {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: {
        activeTeam: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const denialMessage = getAccessDenialMessage({
      userStatus: user.status ?? UserStatus.ACTIVE,
      accountStatus: user.activeTeam?.status ?? null,
    });
    if (denialMessage) {
      throw new ForbiddenException(denialMessage);
    }

    return {
      sub: user.id,
      email: user.email,
      appRole: user.appRole ?? AppUserRole.USER,
      backofficeAccess: Boolean(user.backofficeAccess),
      activeTeamId: user.activeTeamId,
      userStatus: user.status ?? UserStatus.ACTIVE,
      activeTeamStatus: user.activeTeam?.status ?? null,
    };
  }
}
