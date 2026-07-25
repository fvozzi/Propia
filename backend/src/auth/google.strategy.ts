import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GOOGLE_LOGIN_SCOPES } from './google-scopes';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', 'missing-google-client-id'),
      clientSecret: configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
        'missing-google-client-secret',
      ),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3000/api/auth/google/callback',
      ),
      scope: [...GOOGLE_LOGIN_SCOPES],
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    done(null, {
      accessToken,
      refreshToken,
      profile,
    });
  }
}
