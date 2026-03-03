import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMy(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: { OR: [{ userIdA: userId }, { userIdB: userId }] },
      include: {
        userA: { select: { id: true, email: true, name: true } },
        userB: { select: { id: true, email: true, name: true } },
      },
    });
    return connections.map((c) => ({
      id: c.id,
      user: c.userIdA === userId ? c.userB : c.userA,
    }));
  }

  async invite(userId: string, toEmail: string) {
    const toNorm = toEmail.toLowerCase().trim();
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) throw new ForbiddenException();
    if (me.email === toNorm) return { ok: false, error: 'Нельзя пригласить самого себя' };
    const existing = await this.prisma.user.findUnique({ where: { email: toNorm } });
    if (existing) {
      const already = await this.prisma.connection.findFirst({
        where: {
          OR: [
            { userIdA: userId, userIdB: existing.id },
            { userIdA: existing.id, userIdB: userId },
          ],
        },
      });
      if (already) return { ok: false, error: 'Уже в контактах' };
    }
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.invite.create({
      data: { fromUserId: userId, toEmail: toNorm, token, expiresAt },
    });
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${baseUrl}/invite/${token}`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom) {
      try {
        const transporter = createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: smtpFrom,
          to: toNorm,
          subject: 'Приглашение в чат',
          text: `Вас пригласили в чат. Перейдите по ссылке для регистрации/входа: ${link}`,
          html: `<p>Вас пригласили в чат.</p><p><a href="${link}">Открыть приглашение</a></p>`,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Не удалось отправить email приглашение:', (err as Error).message);
      }
    }

    return { ok: true, link };
  }

  async listInvites(userId: string) {
    const invites = await this.prisma.invite.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        toEmail: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        usedById: true,
      },
    });
    return invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      toEmail: inv.toEmail,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      usedById: inv.usedById,
      status: inv.usedAt ? 'used' : inv.expiresAt < new Date() ? 'expired' : 'active',
      link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${inv.token}`,
    }));
  }

  async revokeInvite(userId: string, inviteId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, fromUserId: userId },
      select: { id: true, usedAt: true },
    });
    if (!invite) throw new ForbiddenException('Инвайт не найден');
    if (invite.usedAt) throw new ForbiddenException('Инвайт уже использован');
    await this.prisma.invite.delete({ where: { id: inviteId } });
    return { ok: true };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { token, usedAt: null },
      include: { fromUser: { select: { id: true } } },
    });
    if (!invite || invite.expiresAt < new Date()) throw new NotFoundException('Ссылка недействительна или истекла');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();
    if (user.email.toLowerCase() !== invite.toEmail)
      throw new ForbiddenException('Приглашение было отправлено на другой email');
    const idA = invite.fromUserId;
    const idB = userId;
    const [uid1, uid2] = idA < idB ? [idA, idB] : [idB, idA];
    await this.prisma.$transaction([
      this.prisma.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedById: userId },
      }),
      this.prisma.connection.upsert({
        where: { userIdA_userIdB: { userIdA: uid1, userIdB: uid2 } },
        create: { userIdA: uid1, userIdB: uid2 },
        update: {},
      }),
    ]);
    return { ok: true };
  }
}
