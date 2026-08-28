import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller.js';
import { DailySchedulerService } from './daily-scheduler.service.js';
import { RemindersService } from './reminders.service.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { ComplianceModule } from '../compliance/compliance.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [TasksModule, ComplianceModule, NotificationsModule],
  controllers: [OpsController],
  providers: [DailySchedulerService, RemindersService],
})
export class OpsModule {}
