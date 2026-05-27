import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';
import { GoogleEnabledGuard } from './google-enabled.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SwitchActiveTeamDto } from './dto/switch-active-team.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto.email, dto.password, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }

  @Get('google')
  @UseGuards(GoogleEnabledGuard, GoogleAuthGuard)
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleEnabledGuard, GoogleAuthGuard)
  async googleAuthCallback(@Req() request: Request, @Res() response: Response) {
    const payload = request.user as {
      accessToken: string;
      refreshToken?: string;
      profile: import('passport-google-oauth20').Profile;
    };

    const authResult = await this.authService.loginWithGoogle(payload, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const redirectUrl = new URL('/auth/callback', frontendUrl);
    redirectUrl.searchParams.set('token', authResult.accessToken);
    redirectUrl.searchParams.set('user', JSON.stringify(authResult.user));
    response.redirect(redirectUrl.toString());
  }

  @Get('google/status')
  @UseGuards(JwtAuthGuard)
  googleStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getGoogleConnectionStatus(user.sub);
  }

  @Patch('active-team')
  @UseGuards(JwtAuthGuard)
  switchActiveTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchActiveTeamDto,
  ) {
    return this.authService.switchActiveTeam(user.sub, dto.teamId);
  }
}
