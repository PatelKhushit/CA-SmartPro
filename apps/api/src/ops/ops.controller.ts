import { Controller, Post } from '@nestjs/common';
import { DailySchedulerService } from './daily-scheduler.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('ops')
export class OpsController {
  constructor(private readonly scheduler: DailySchedulerService) {}

  /** Manual "run daily ops now" for demos — same idempotent jobs the 3am cron runs. */
  @RequirePermissions('settings.manage')
  @Post('run-daily-now')
  runNow(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduler.runForOrganization(user.organizationId);
  }
}
