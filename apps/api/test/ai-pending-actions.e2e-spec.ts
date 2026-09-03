import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { closeTestApp } from './test-utils.js';

/**
 * The AI Copilot's two write tools (create_task/create_followup) must never
 * write to the database as a side effect of the model's own output — they
 * only stage an AiPendingAction, and the underlying Task is created solely
 * by AiService.confirmAction, reachable only via an authenticated,
 * explicit POST /ai/actions/:id/confirm. These tests exercise that
 * boundary directly against the real API + DB, bypassing the Gemini call
 * itself (which is non-deterministic / not configured in CI) by staging
 * the AiPendingAction row the same way AiService.proposeAction would.
 */
describe('AI pending actions — confirm-before-write (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  const createdOrgSlugs: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser(process.env.COOKIE_SECRET));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    const orgs = await prisma.organization.findMany({ where: { slug: { in: createdOrgSlugs } } });
    for (const org of orgs) {
      await prisma.aiPendingAction.deleteMany({ where: { organizationId: org.id } });
      await prisma.aiMessage.deleteMany({ where: { conversation: { organizationId: org.id } } });
      await prisma.aiConversation.deleteMany({ where: { organizationId: org.id } });
      await prisma.task.deleteMany({ where: { organizationId: org.id } });
      await prisma.client.deleteMany({ where: { organizationId: org.id } });
      await prisma.refreshSession.deleteMany({ where: { organizationId: org.id } });
      await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
      await prisma.user.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
    await prisma.$disconnect();
    await closeTestApp(app);
  });

  async function registerFirm(firmName: string) {
    const email = `${randomUUID()}@ai-pending-actions.test`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firmName, fullName: 'Test User', email, password: 'StrongPass123' })
      .expect(201);
    createdOrgSlugs.push(res.body.user.organization.slug);
    return { accessToken: res.body.accessToken as string, orgId: res.body.user.organization.id as string, userId: res.body.user.id as string };
  }

  async function stagePendingAction(org: { orgId: string; userId: string }, overrides: Partial<{ expiresAt: Date; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' }> = {}) {
    const conversation = await prisma.aiConversation.create({
      data: { organizationId: org.orgId, userId: org.userId },
    });
    const action = await prisma.aiPendingAction.create({
      data: {
        organizationId: org.orgId,
        userId: org.userId,
        conversationId: conversation.id,
        toolName: 'create_task',
        input: { title: `Follow up on VAT filing ${randomUUID()}` },
        summary: 'Create task "Follow up on VAT filing"',
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
        status: overrides.status ?? 'PENDING',
      },
    });
    return { conversation, action };
  }

  it('does not create a Task until the pending action is confirmed, then creates exactly one on confirm', async () => {
    const org = await registerFirm(`AI Action Org ${randomUUID()}`);
    const { action } = await stagePendingAction(org);

    const beforeCount = await prisma.task.count({ where: { organizationId: org.orgId } });
    expect(beforeCount).toBe(0);

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/confirm`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .expect(201);
    expect(confirmRes.body.created).toBe(true);
    expect(typeof confirmRes.body.taskId).toBe('string');

    const afterCount = await prisma.task.count({ where: { organizationId: org.orgId } });
    expect(afterCount).toBe(1);

    const stored = await prisma.aiPendingAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(stored.status).toBe('CONFIRMED');
    expect(stored.resultEntityType).toBe('task');
    expect(stored.resultEntityId).toBe(confirmRes.body.taskId);

    // Confirming a second time must not create a second Task.
    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/confirm`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .expect(409);
    expect(await prisma.task.count({ where: { organizationId: org.orgId } })).toBe(1);
  });

  it('cancelling a pending action never creates a Task', async () => {
    const org = await registerFirm(`AI Action Org ${randomUUID()}`);
    const { action } = await stagePendingAction(org);

    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/cancel`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .expect(201);

    expect(await prisma.task.count({ where: { organizationId: org.orgId } })).toBe(0);
    const stored = await prisma.aiPendingAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(stored.status).toBe('CANCELLED');

    // A cancelled action can no longer be confirmed.
    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/confirm`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .expect(409);
    expect(await prisma.task.count({ where: { organizationId: org.orgId } })).toBe(0);
  });

  it('rejects confirmation of an expired pending action', async () => {
    const org = await registerFirm(`AI Action Org ${randomUUID()}`);
    const { action } = await stagePendingAction(org, { expiresAt: new Date(Date.now() - 60 * 1000) });

    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/confirm`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .expect(409);
    expect(await prisma.task.count({ where: { organizationId: org.orgId } })).toBe(0);

    const stored = await prisma.aiPendingAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(stored.status).toBe('EXPIRED');
  });

  it('blocks org B from confirming or cancelling org A\'s pending action', async () => {
    const orgA = await registerFirm(`AI Action Org A ${randomUUID()}`);
    const orgB = await registerFirm(`AI Action Org B ${randomUUID()}`);
    const { action } = await stagePendingAction(orgA);

    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/confirm`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/cancel`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(404);

    expect(await prisma.task.count({ where: { organizationId: orgA.orgId } })).toBe(0);

    // Org A can still confirm its own action.
    await request(app.getHttpServer())
      .post(`/api/v1/ai/actions/${action.id}/confirm`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .expect(201);
    expect(await prisma.task.count({ where: { organizationId: orgA.orgId } })).toBe(1);
  });
});
