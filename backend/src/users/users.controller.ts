import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReqUser } from '../auth/req-user.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@ReqUser() user: { id: string }) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!u) throw new Error('User not found');
    return u;
  }

  @Patch('me')
  async updateMe(@ReqUser() user: { id: string }, @Body() body: { name?: string }) {
    const u = await this.prisma.user.update({
      where: { id: user.id },
      data: { name: body.name != null ? body.name : undefined },
      select: { id: true, email: true, name: true },
    });
    return u;
  }
}
