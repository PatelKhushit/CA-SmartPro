import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { GENERATE_RECURRING_TASKS_JOB, RECURRING_TASKS_QUEUE } from './recurring.queue.js';

@Injectable()
export class RecurringScheduler {
  private readonly logger = new Logger(RecurringScheduler.name);

  constructor(@InjectQueue(RECURRING_TASKS_QUEUE) private readonly queue: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleDailyGeneration() {
    await this.enqueue('cron');
  }

  /** Also exposed to a manual "run now" API for demos/ops — same job, same idempotency guarantees. */
  async enqueue(triggeredBy: 'cron' | 'manual') {
    this.logger.log(`Enqueuing recurring task generation (triggered by ${triggeredBy})`);
    await this.queue.add(
      GENERATE_RECURRING_TASKS_JOB,
      { triggeredBy },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );
  }
}
