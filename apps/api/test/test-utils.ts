import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { RECURRING_TASKS_QUEUE } from '../src/tasks/recurring/recurring.queue.js';

/**
 * Nest's app.close() runs onApplicationShutdown for BullMQ's Queue/Worker
 * providers, but ioredis can still emit a stray "Connection is closed"
 * unhandled rejection if the queue's socket hasn't fully settled first.
 * Closing the queue explicitly (and awaiting it) before app.close() avoids
 * that race so e2e runs exit cleanly.
 */
export async function closeTestApp(app: INestApplication) {
  const queue = app.get<Queue>(getQueueToken(RECURRING_TASKS_QUEUE), { strict: false });
  if (queue) {
    await queue.close();
  }
  await app.close();
}
