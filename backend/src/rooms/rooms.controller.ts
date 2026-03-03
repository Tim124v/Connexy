import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReqUser } from '../auth/req-user.decorator.js';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  async list(@ReqUser() user: { id: string }) {
    return this.rooms.listRooms(user.id);
  }

  @Post()
  async create(@ReqUser() user: { id: string }, @Body() body: { name: string; password: string }) {
    return this.rooms.createRoom(user.id, body.name || 'Комната', body.password || '');
  }

  @Post('join')
  async join(@ReqUser() user: { id: string }, @Body() body: { roomId: string; password: string }) {
    return this.rooms.joinRoom(user.id, body.roomId, body.password || '');
  }

  @Get(':id/messages')
  async messages(@ReqUser() user: { id: string }, @Param('id') id: string) {
    return this.rooms.listMessages(user.id, id);
  }

  @Post(':id/messages')
  async send(
    @ReqUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    return this.rooms.sendMessage(user.id, id, body.text || '');
  }
}
