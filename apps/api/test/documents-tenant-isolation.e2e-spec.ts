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
 * Documents carry private client files, so they get their own tenant
 * isolation coverage beyond the generic clients-focused suite: one firm must
 * never read, list, or mint/redeem a download link for another firm's
 * document, and the signed download URL itself must reject tampering.
 */
describe('Documents tenant isolation (e2e)', () => {
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
      await prisma.documentRequestItem.deleteMany({ where: { organizationId: org.id } });
      await prisma.documentRequest.deleteMany({ where: { organizationId: org.id } });
      await prisma.documentVersion.deleteMany({ where: { organizationId: org.id } });
      await prisma.document.deleteMany({ where: { organizationId: org.id } });
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
    const email = `${randomUUID()}@documents-isolation.test`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firmName, fullName: 'Test User', email, password: 'StrongPass123' })
      .expect(201);
    createdOrgSlugs.push(res.body.user.organization.slug);
    return { accessToken: res.body.accessToken as string, orgId: res.body.user.organization.id as string };
  }

  it('blocks org B from reading, listing, or downloading org A documents', async () => {
    const orgA = await registerFirm(`Doc Isolation Org A ${randomUUID()}`);
    const orgB = await registerFirm(`Doc Isolation Org B ${randomUUID()}`);

    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .field('title', 'Confidential Document')
      .field('category', 'OTHER')
      .attach('file', Buffer.from('secret contents'), { filename: 'secret.csv', contentType: 'text/csv' })
      .expect(201);

    const documentId = uploadRes.body.id as string;
    const versionId = uploadRes.body.versions[0].id as string;
    expect(uploadRes.body.organizationId).toBe(orgA.orgId);

    // Org B cannot fetch it directly.
    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(404);

    // Org B's list does not include org A's document.
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(200);
    expect(listRes.body.items).toEqual([]);

    // Org B cannot mint a download link for org A's document/version.
    await request(app.getHttpServer())
      .post(`/api/v1/documents/${documentId}/versions/${versionId}/download-link`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .expect(404);

    // Org A can mint a download link and retrieve the file via the signed URL.
    const linkRes = await request(app.getHttpServer())
      .post(`/api/v1/documents/${documentId}/versions/${versionId}/download-link`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .expect(201);

    const fileRes = await request(app.getHttpServer())
      .get(`/api/v1/documents/file?token=${encodeURIComponent(linkRes.body.token)}`)
      .expect(200);
    expect(fileRes.text).toBe('secret contents');

    // A tampered token is rejected outright.
    await request(app.getHttpServer())
      .get(`/api/v1/documents/file?token=${encodeURIComponent(linkRes.body.token)}x`)
      .expect(403);
  });

  it('rejects requests with no token for the file route', async () => {
    await request(app.getHttpServer()).get('/api/v1/documents/file?token=not-a-real-token').expect(403);
  });
});
