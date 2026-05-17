import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GoogleEnabledGuard } from './google-enabled.guard';

describe('GoogleEnabledGuard', () => {
  it('allows access when google oauth is configured', () => {
    const configService = {
      get: vi.fn((key: string) => {
        const values: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'client-id',
          GOOGLE_CLIENT_SECRET: 'client-secret',
          GOOGLE_CALLBACK_URL: 'https://app.propiacrm.ar/api/auth/google/callback',
        };
        return values[key];
      }),
    };

    const guard = new GoogleEnabledGuard(configService as never);

    expect(guard.canActivate({} as never)).toBe(true);
  });

  it('rejects access when any google oauth value is missing', () => {
    const configService = {
      get: vi.fn((key: string) => {
        const values: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'client-id',
          GOOGLE_CLIENT_SECRET: '',
          GOOGLE_CALLBACK_URL: 'https://app.propiacrm.ar/api/auth/google/callback',
        };
        return values[key];
      }),
    };

    const guard = new GoogleEnabledGuard(configService as never);

    expect(() => guard.canActivate({} as never)).toThrow(ServiceUnavailableException);
  });
});
