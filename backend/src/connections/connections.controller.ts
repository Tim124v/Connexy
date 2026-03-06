import { Controller, Get, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
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

  @Get('invites')
  async listInvites(@ReqUser() user: { id: string }) {
    return this.connections.listInvites(user.id);
  }

  @Delete('invites/:id')
  async revoke(@ReqUser() user: { id: string }, @Param('id') id: string) {
    return this.connections.revokeInvite(user.id, id);
  }

  @Post('invite-link')
  async createInviteLink(@ReqUser() user: { id: string }) {
    return this.connections.createInviteLink(user.id);
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
