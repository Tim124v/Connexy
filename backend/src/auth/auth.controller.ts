import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      confirmPassword?: string;
      name?: string;
    },
  ) {
    const { email, password, confirmPassword, name } = body || {};
    if (!email || !password) return { ok: false, error: 'Email and password are required' };
    const emailTrim = String(email).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) return { ok: false, error: 'Invalid email format' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
    if (confirmPassword !== undefined && confirmPassword !== password)
      return { ok: false, error: 'Passwords do not match' };
    return this.auth.register(emailTrim, password, { name });
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    const { email, code } = body || {};
    if (!email || !code) return { ok: false, error: 'Email and code are required' };
    return this.auth.verifyEmail(String(email).trim(), String(code));
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    const { email } = body || {};
    if (!email) return { ok: false, error: 'Email is required' };
    return this.auth.resendVerification(String(email).trim());
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body || {};
    if (!email || !password) return { ok: false, error: 'Email and password are required' };
    return this.auth.login(email, password);
  }
}
