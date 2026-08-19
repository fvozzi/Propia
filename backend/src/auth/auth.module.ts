import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { PortalSourceConfig } from '../external-search/portal-source-config.entity';
import { BackofficeAdminController } from './backoffice-admin.controller';
import { BackofficeGuard } from './backoffice.guard';
import { BackofficeAdminService } from './backoffice-admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseBackup } from './database-backup.entity';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
import { GoogleEnabledGuard } from './google-enabled.guard';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { LoginEvent } from './login-event.entity';
import { SystemBackupConfig } from './system-backup-config.entity';
import { TeamMembership } from './team-membership.entity';
import { Team } from './team.entity';
import { UserWorkspaceService } from './user-workspace.service';
import { User } from './user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      GoogleCalendarConnection,
      Team,
      TeamMembership,
      LoginEvent,
      PortalSourceConfig,
      SystemBackupConfig,
      DatabaseBackup,
    ]),
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
  controllers: [AuthController, AdminUsersController, BackofficeAdminController],
  providers: [
    AuthService,
    AdminUsersService,
    BackofficeAdminService,
    UserWorkspaceService,
    JwtStrategy,
    {
      provide: GoogleStrategy,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
        const callbackUrl = configService.get<string>('GOOGLE_CALLBACK_URL');

        if (!clientId || !clientSecret || !callbackUrl) {
          return null;
        }

        return new GoogleStrategy(configService);
      },
    },
    GoogleEnabledGuard,
    AdminGuard,
    BackofficeGuard,
  ],
  exports: [AuthService, UserWorkspaceService],
})
export class AuthModule {}
