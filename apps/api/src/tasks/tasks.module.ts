import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { TaskTemplatesController } from './templates/task-templates.controller.js';
import { TaskTemplatesService } from './templates/task-templates.service.js';
import { RecurringEngineService } from './recurring/recurring-engine.service.js';
import { RecurringTasksProcessor } from './recurring/recurring.processor.js';
import { RecurringScheduler } from './recurring/recurring.scheduler.js';
import { RECURRING_TASKS_QUEUE } from './recurring/recurring.queue.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [BullModule.registerQueue({ name: RECURRING_TASKS_QUEUE }), NotificationsModule],
  controllers: [TasksController, TaskTemplatesController],
  providers: [
    TasksService,
    TaskTemplatesService,
    RecurringEngineService,
    RecurringTasksProcessor,
    RecurringScheduler,
  ],
  exports: [RecurringEngineService],
})
export class TasksModule {}
