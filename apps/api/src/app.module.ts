import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ValidationPipe } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller.js';
import configuration from './config/configuration.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { GoalsModule } from './goals/goals.module.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OpsModule } from './ops/ops.module.js';
import { CalculatorsModule } from './calculators/calculators.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AiModule } from './ai/ai.module.js';
import { AuditModule } from './audit/audit.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { DocumentRequestsModule } from './document-requests/document-requests.module.js';
import { NoticesModule } from './notices/notices.module.js';
import { UdinModule } from './udin/udin.module.js';
import { GstModule } from './gst/gst.module.js';
import { TdsModule } from './tds/tds.module.js';
import { TeamModule } from './team/team.module.js';
import { AutomationsModule } from './automations/automations.module.js';
import { NewsModule } from './news/news.module.js';
import { SearchModule } from './search/search.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60 * 1000, limit: 120 }],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('redis.url') },
      }),
    }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    TasksModule,
    GoalsModule,
    ComplianceModule,
    CalendarModule,
    NotificationsModule,
    OpsModule,
    CalculatorsModule,
    ReportsModule,
    AiModule,
    AuditModule,
    DocumentsModule,
    DocumentRequestsModule,
    NoticesModule,
    UdinModule,
    GstModule,
    TdsModule,
    TeamModule,
    AutomationsModule,
    NewsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
