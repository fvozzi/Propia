import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
import { GoogleEnabledGuard } from './google-enabled.guard';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { TeamMembership } from './team-membership.entity';
import { Team } from './team.entity';
import { UserWorkspaceService } from './user-workspace.service';
import { User } from './user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, GoogleCalendarConnection, Team, TeamMembership]),
    PassportModule,
    CalendarModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController, AdminUsersController],
  providers: [
    AuthService,
    AdminUsersService,
    UserWorkspaceService,
    JwtStrategy,
    GoogleStrategy,
    GoogleEnabledGuard,
    AdminGuard,
  ],
  exports: [AuthService, UserWorkspaceService],
})
export class AuthModule {}
