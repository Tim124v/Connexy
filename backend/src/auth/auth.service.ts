import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { hash, compare } from 'bcrypt';
import { createTransport } from 'nodemailer';
import { randomInt } from 'crypto';

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_ATTEMPTS_WINDOW_MS = 10 * 60 * 1000; // 10 min

// In-memory rate limit: email -> { count, since }
const verifyAttempts = new Map<string, { count: number; since: number }>();

function checkVerifyRateLimit(email: string): boolean {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = verifyAttempts.get(key);
  if (!entry) return true;
  if (now - entry.since > VERIFY_ATTEMPTS_WINDOW_MS) {
    verifyAttempts.delete(key);
    return true;
  }
  return entry.count < MAX_VERIFY_ATTEMPTS;
}

function incrementVerifyAttempts(email: string): void {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = verifyAttempts.get(key);
  if (!entry) {
    verifyAttempts.set(key, { count: 1, since: now });
    return;
  }
  if (now - entry.since > VERIFY_ATTEMPTS_WINDOW_MS) {
    verifyAttempts.set(key, { count: 1, since: now });
    return;
  }
  entry.count += 1;
}

function clearVerifyAttempts(email: string): void {
  verifyAttempts.delete(email.toLowerCase().trim());
}

function generateSixDigitCode(): string {
  return String(randomInt(100000, 1000000));
}

function sendVerificationEmail(to: string, code: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Email verification code for ${to}: ${code}`);
    }
    return Promise.resolve();
  }
  const transporter = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  return transporter
    .sendMail({
      from: smtpFrom,
      to,
      subject: 'Verify your account',
      text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    })
    .then(() => {})
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('Failed to send verification email:', (err as Error).message);
    });
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    opts?: { username?: string; name?: string },
  ) {
    const emailNorm = email.toLowerCase().trim();
    const usernameNorm = opts?.username?.trim() || null;

    const existingByEmail = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (existingByEmail) return { ok: false, error: 'Email already registered' };

    if (usernameNorm) {
      const existingByUsername = await this.prisma.user.findFirst({
        where: { username: { equals: usernameNorm, mode: 'insensitive' } },
      });
      if (existingByUsername) return { ok: false, error: 'Username already taken' };
    }

    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };

    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: emailNorm,
        username: usernameNorm,
        name: opts?.name?.trim() || null,
        passwordHash,
        isVerified: false,
      },
      select: { id: true, email: true, name: true, username: true },
    });

    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.emailVerification.create({
      data: { userId: user.id, code, expiresAt },
    });

    void sendVerificationEmail(emailNorm, code);

    return {
      ok: true,
      needVerification: true,
      email: user.email,
      user: { id: user.id, email: user.email, name: user.name, username: user.username },
    };
  }

  async verifyEmail(email: string, code: string) {
    const emailNorm = email.toLowerCase().trim();
    const codeSanitized = String(code).replace(/\D/g, '').slice(0, 6);
    if (codeSanitized.length !== 6) {
      return { ok: false, error: 'Invalid verification code' };
    }

    if (!checkVerifyRateLimit(emailNorm)) {
      return { ok: false, error: 'Too many attempts. Try again in 10 minutes.' };
    }

    const user = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) {
      incrementVerifyAttempts(emailNorm);
      return { ok: false, error: 'Invalid verification code' };
    }

    const verification = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id, code: codeSanitized },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) {
      incrementVerifyAttempts(emailNorm);
      return { ok: false, error: 'Invalid verification code' };
    }
    if (verification.expiresAt < new Date()) {
      incrementVerifyAttempts(emailNorm);
      return { ok: false, error: 'Code expired' };
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
      this.prisma.emailVerification.delete({ where: { id: verification.id } }),
    ]);
    clearVerifyAttempts(emailNorm);

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    };
  }

  async resendVerification(email: string) {
    const emailNorm = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: emailNorm } });

    // Не раскрываем, существует ли email (анти user-enumeration)
    if (!user) return { ok: true };
    if (user.isVerified) return { ok: true };

    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
      this.prisma.emailVerification.create({ data: { userId: user.id, code, expiresAt } }),
    ]);

    void sendVerificationEmail(emailNorm, code);
    return { ok: true };
  }

  async login(email: string, password: string) {
    const emailNorm = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user || !(await compare(password, user.passwordHash)))
      return { ok: false, error: 'Invalid email or password' };
    if (!user.isVerified)
      return { ok: false, error: 'Please verify your email first. Check the code we sent you.' };
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    };
  }
}
