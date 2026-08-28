# CA SmartPro

*Your Practice. Your Productivity. Your Growth.*

A multi-tenant Practice Operating System for Chartered Accountant firms in India — clients, recurring compliance work, "My Day" productivity, calendar, calculators, documents, and an AI Copilot, built on real CRUD (no mock data). Internal package/repo name remains `ca-practice-os`.

This repository is being built **phase by phase** against the master spec in `docs/`. Current status: **Phase 1 MVP + Phase 2 Documents/Document Requests** (see `docs/STATUS.md`).

## Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn-style components + React Hook Form + Zod + TanStack Query + Recharts
- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL, REST API under `/api/v1`
- **Queue/Cache**: Redis + BullMQ (recurring task generation, reminders, notifications)
- **Auth**: Argon2 password hashing, short-lived JWT access tokens (Bearer) + rotating httpOnly refresh cookie

## Monorepo layout

```
apps/
  web/     Next.js frontend
  api/     NestJS backend (Prisma schema in apps/api/prisma)
infra/
  docker-compose.yml   Local Postgres + Redis
docs/
  STATUS.md            What's built vs TODO/Phase 2/Phase 3, per module
```

## Getting started (local development)

1. Copy `.env.example` to `.env` and fill in values (a working local `.env` with generated dev secrets is already present for first run — replace before any shared/staging use).
2. Start infra: `npm run docker:up` (Postgres on 5432, Redis on 6379).
3. Install dependencies: `npm install`
4. Generate Prisma client + run migrations: `npm run prisma:generate && npm run prisma:migrate`
5. Seed baseline data (roles/permissions/plans): `npm run prisma:seed`
6. Run the API: `npm run dev:api` (http://localhost:4000/api/v1)
7. Run the web app: `npm run dev:web` (http://localhost:3100 — pinned explicitly to avoid clashing with other local dev servers on 3000/3001)

## Security notes

- Never commit `.env`. `.env.example` documents every variable with no real values.
- Every organization-owned table carries `organization_id`; tenant scope is always derived server-side from the authenticated JWT, never from client-supplied input.
- AI Copilot calls are disabled with an explicit "AI not configured" response when `AI_API_KEY` is empty — never a fake/mocked answer.
- Third-party integrations not yet wired (WhatsApp, email delivery, payments, RAG) are marked as **Phase 3+** in `docs/STATUS.md` — they are not faked in the UI.
- Document uploads are stored privately on the API server's local disk (`apps/api/storage/`, gitignored) behind a `StorageProvider` interface — swap `STORAGE_PROVIDER`/implement one new class to move to S3-compatible storage in production; see `docs/STATUS.md`.
