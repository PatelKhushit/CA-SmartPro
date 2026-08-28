import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

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
