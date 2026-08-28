import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { RecurringEngineService } from './recurring-engine.service.js';
import { RECURRING_TASKS_QUEUE } from './recurring.queue.js';

@Processor(RECURRING_TASKS_QUEUE)
export class RecurringTasksProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurringTasksProcessor.name);

  constructor(private readonly engine: RecurringEngineService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Running recurring task generation (job ${job.id}, attempt ${job.attemptsMade + 1})`);
    const summary = await this.engine.generateAll();
    this.logger.log(
      `Recurring task generation complete: ${summary.tasksCreated} created, ${summary.tasksSkippedExisting} already existed, ${summary.templatesConsidered} templates considered.`,
    );
  }
}
