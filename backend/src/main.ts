import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module.js';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 3001);
  const isDev = configService.get<string>('NODE_ENV') !== 'production';

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  // serve uploaded files
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  app.enableCors({
    origin: isDev ? true : configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
}

bootstrap();


