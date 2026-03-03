import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { hash, compare } from 'bcrypt';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async cleanupExpired() {
    await this.prisma.room.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  async listRooms(userId: string) {
    await this.cleanupExpired();
    const memberships = await this.prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: { owner: { select: { id: true, email: true, name: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({
      id: m.room.id,
      name: m.room.name,
      owner: m.room.owner,
      joinedAt: m.joinedAt,
      expiresAt: m.room.expiresAt,
      isOwner: m.room.ownerId === userId,
    }));
  }

  async createRoom(userId: string, name: string, password: string) {
    const passwordHash = await hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const room = await this.prisma.room.create({
      data: {
        name: name.trim() || 'Комната',
        passwordHash,
        ownerId: userId,
        expiresAt,
        members: { create: { userId } },
      },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    return { id: room.id, name: room.name, owner: room.owner, expiresAt: room.expiresAt };
  }

  async joinRoom(userId: string, roomId: string, password: string) {
    await this.cleanupExpired();
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!room) throw new NotFoundException('Комната не найдена');
    const ok = await compare(password, room.passwordHash);
    if (!ok) throw new ForbiddenException('Неверный пароль комнаты');
    await this.prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId },
      update: {},
    });
    return { id: room.id, name: room.name, owner: room.owner, expiresAt: room.expiresAt };
  }

  private async ensureMember(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findFirst({ where: { roomId, userId } });
    if (!member) throw new ForbiddenException('Нет доступа к комнате');
  }

  async listMessages(userId: string, roomId: string) {
    await this.cleanupExpired();
    await this.ensureMember(userId, roomId);
    const messages = await this.prisma.roomMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, email: true, name: true } } },
      take: 200,
    });
    return messages.map((m) => ({
      id: m.id,
      text: m.text,
      senderId: m.senderId,
      createdAt: m.createdAt,
      sender: m.sender,
    }));
  }

  async sendMessage(userId: string, roomId: string, text: string) {
    await this.cleanupExpired();
    await this.ensureMember(userId, roomId);
    const message = await this.prisma.roomMessage.create({
      data: { roomId, senderId: userId, text: text.trim() },
      include: { sender: { select: { id: true, email: true, name: true } } },
    });
    return {
      id: message.id,
      text: message.text,
      senderId: message.senderId,
      createdAt: message.createdAt,
      sender: message.sender,
    };
  }
}
