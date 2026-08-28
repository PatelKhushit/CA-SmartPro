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
 * Section 6 of the product spec requires automated tenant-isolation tests:
 * one organization must never be able to read, modify, or enumerate another
 * organization's data via the API, regardless of what IDs it guesses.
 */
describe('Tenant isolation (e2e)', () => {
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
    // Best-effort cleanup of everything this test created.
    const orgs = await prisma.organization.findMany({ where: { slug: { in: createdOrgSlugs } } });
    for (const org of orgs) {
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
    const email = `${randomUUID()}@tenant-isolation.test`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firmName, fullName: 'Test User', email, password: 'StrongPass123' })
      .expect(201);
    createdOrgSlugs.push(res.body.user.organization.slug);
    return { accessToken: res.body.accessToken as string, orgId: res.body.user.organization.id as string };
  }

  it('blocks org B from reading, editing, deleting, or listing org A data', async () => {
    const orgA = await registerFirm(`Tenant Isolation Org A ${randomUUID()}`);
    const orgB = await registerFirm(`Tenant Isolation Org B ${randomUUID()}`);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ displayName: 'Confidential Client Ltd' })
      .expect(201);

    const clientId = createRes.body.id as string;
    expect(createRes.body.organizationId).toBe(orgA.orgId);

    // Org B cannot fetch it directly.
    await request(app.getHttpServer())
      .get(`/api/v1/clients/${clientId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(404);

    // Org B cannot modify it.
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/clients/${clientId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .send({ displayName: 'HACKED' })
      .expect(404);
    expect(patchRes.body.success).toBe(false);

    // Org B cannot delete it.
    await request(app.getHttpServer())
      .delete(`/api/v1/clients/${clientId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(404);

    // Org B's list does not include org A's client.
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(200);
    expect(listRes.body.items).toEqual([]);
    expect(listRes.body.total).toBe(0);

    // Org A can still read its own unmodified client.
    const ownRes = await request(app.getHttpServer())
      .get(`/api/v1/clients/${clientId}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .expect(200);
    expect(ownRes.body.displayName).toBe('Confidential Client Ltd');
  });

  it('rejects requests with no token and with a garbage token', async () => {
    await request(app.getHttpServer()).get('/api/v1/clients').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/clients')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('strips client-supplied organizationId/role/permissions on register (mass-assignment guard)', async () => {
    const email = `${randomUUID()}@tenant-isolation.test`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firmName: `Mass Assignment Probe ${randomUUID()}`,
        fullName: 'Probe User',
        email,
        password: 'StrongPass123',
        organizationId: 'some-other-org-id',
        roleId: 'super-admin-role-id',
        permissions: ['*'],
      })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});
