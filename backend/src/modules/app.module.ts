import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ConnectionsModule,
    MessagesModule,
    RoomsModule,
  ],
})
export class AppModule {}
