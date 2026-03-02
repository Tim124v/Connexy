import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService } from './connections.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
