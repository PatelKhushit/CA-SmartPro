import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { RequestHandler } from 'express';
import helmetImport from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

// helmet's dual ESM/CJS package types resolve inconsistently under
// moduleResolution "nodenext" depending on which TS invocation path resolves
// the import (works locally, fails on some build hosts — see
// helmetjs/helmet#414 and microsoft/TypeScript#50466). The runtime import is
// unaffected by this; only the static type needs an explicit assist.
const helmet = helmetImport as unknown as (options?: Record<string, unknown>) => RequestHandler;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser(config.get<string>('auth.cookieSecret')));

  app.enableCors({
    origin: config.get<string[]>('corsAllowedOrigins'),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CA SmartPro API listening on http://localhost:${port}/api/v1`);
}

await bootstrap();
