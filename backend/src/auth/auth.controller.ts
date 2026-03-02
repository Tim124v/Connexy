import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    const { email, password, name } = body || {};
    if (!email || !password) return { ok: false, error: 'Нужны email и пароль' };
    return this.auth.register(email, password, name);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body || {};
    if (!email || !password) return { ok: false, error: 'Нужны email и пароль' };
    return this.auth.login(email, password);
  }
}
