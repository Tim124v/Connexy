import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { hash, compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const emailNorm = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) return { ok: false, error: 'Email уже занят' };
    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email: emailNorm, passwordHash, name: name?.trim() || null },
      select: { id: true, email: true, name: true },
    });
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return { ok: true, user, accessToken };
  }

  async login(email: string, password: string) {
    const emailNorm = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user || !(await compare(password, user.passwordHash)))
      return { ok: false, error: 'Неверный email или пароль' };
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    };
  }
}
