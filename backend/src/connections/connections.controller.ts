import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReqUser } from '../auth/req-user.decorator.js';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  async list(@ReqUser() user: { id: string }) {
    return this.connections.listMy(user.id);
  }

  @Post('invite')
  async invite(@ReqUser() user: { id: string }, @Body() body: { email: string }) {
    return this.connections.invite(user.id, body.email || '');
  }

  @Post('accept')
  async accept(@ReqUser() user: { id: string }, @Body() body: { token: string }) {
    return this.connections.acceptInvite(body.token, user.id);
  }
}
