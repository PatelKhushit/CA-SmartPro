# Build Status

Legend: ✅ Done (real UI + API + DB)  🚧 In progress  ⬜ Not started  ⏭️ Phase 2/3 (intentionally deferred, interface designed for it)

## Phase 1 — MVP (this build)

| Module | Status | Notes |
|---|---|---|
| Monorepo / infra / docker-compose | ✅ | npm workspaces, Postgres + Redis via docker-compose, ports pinned (web 3100, api 4000) |
| Prisma schema & migrations | ✅ | Full MVP schema, tenant-scoped, seeded roles/permissions only (no fake data) |
| Auth (register/login/logout/refresh) | ✅ | Argon2, JWT access + rotating httpOnly refresh cookie, lockout, password reset |
| RBAC + tenant isolation guards | ✅ | Seeded roles/permissions, PermissionsGuard, automated tenant-isolation e2e test |
| Design system + auth pages | ✅ | shadcn-style component kit, status-color system, responsive app shell |
| Clients module | ✅ | CRUD, contacts, services, tenant-isolated (verified) |
| Tasks + templates + recurring engine | ✅ | BullMQ-backed idempotent generation, priority engine, checklist/comments/assign |
| My Day + Focus Mode + productivity/goals | ✅ | Next-best-task, focus timer, live-computed goal progress |
| Compliance engine + CA Calendar + reminders + notifications | ✅ | No statutory dates invented/seeded — firm enters + verifies rules; unified calendar; IN_APP reminders/notifications |
| CA Calculator | ✅ | 12 calculators, backend computes formula/assumptions, real REST round-trip |
| Basic reports + AI Copilot UI | ✅ | Daily/Monthly/Team reports + CSV export; AI Copilot **live** on Gemini (`@google/genai`, model `gemini-3.6-flash`), 4 controlled read-only tools, verified domain-restriction refusal + multi-tool client-summary query in the browser; markdown rendering for assistant replies |
| Responsive UI + mobile nav + audit log | ✅ | Audit log viewer + logout logging shipped, 20+ audit actions recorded. Mobile bottom nav/sidebar verified structurally (correct Tailwind `md:` breakpoint classes, computed styles confirmed) — true visual mobile screenshot wasn't possible because this session's browser tool could not resize the actual viewport (see docs/STATUS.md note) |
| Tests + production build verification | ✅ | 34 unit tests (period math, priority engine, calculators, permissions guard) + 4 e2e tests (auth, tenant isolation, mass-assignment) all passing. Both apps build clean with `tsc`/ESLint/oxlint. Both production builds (`start:prod` / `next start`) boot and were verified live in-browser |

### Note on mobile QA

This session's Chrome automation tool reported `resize_window` succeeding, but `window.innerWidth` never changed (verified via direct JS execution) — so a real mobile-width screenshot wasn't achievable here. What **is** verified: the sidebar (`hidden md:flex`) and bottom nav (`flex md:hidden`) resolve to the correct opposite `display` values at the current desktop width, which is the standard, deterministic Tailwind breakpoint pattern used throughout shadcn-based apps. A physical/emulated mobile device check is recommended before shipping.

## Phase 2 — Documents & Document Requests (this build)

| Module | Status | Notes |
|---|---|---|
| Rebrand: CA SmartPro | ✅ | Navy `#01142A` / Royal Blue `#1565D8` / Professional Blue `#2F80ED` / Emerald `#16A34A` / AI Purple `#6D28D9` design tokens, navy sidebar with logo + firm-name footer block, SVG favicon, all user-facing "CA Practice OS" strings replaced. Dark mode now uses navy surfaces (was neutral charcoal) per the brand spec's explicit call for navy dark-mode surfaces — a deliberate rebrand decision, not a regression from the prior two-color identity. |
| Document storage | ✅ | Real (not mocked) private local-disk storage behind a `StorageProvider` interface (`apps/api/src/documents/storage`) — random per-org filenames, never the client-supplied name, path-traversal guarded. Swapping to real S3/MinIO/GCS in production is implementing one new class against the same interface, no schema or API changes. |
| Signed download URLs | ✅ | HMAC-SHA256 signed, single-version-scoped, short TTL (default 5 min, `STORAGE_SIGNED_URL_TTL_SECONDS`), constant-time verified. The authenticated `POST .../download-link` endpoint mints the token (and audit-logs the grant); the public `GET /documents/file?token=...` route verifies + streams — same trust model as an S3 presigned URL. Verified end-to-end via curl (200, correct `Content-Disposition`/`Content-Type`, exact byte match) and via tenant-isolation e2e tests (tampered token → 403, cross-org → 404 before a link can even be minted). |
| Documents module | ✅ | Upload (multipart, MIME+extension allowlist, size cap), versioning, metadata edit, archive, org- and client-scoped listing/filtering/search. Real DB rows, real bytes on disk, verified live in-browser (upload → list → download round-trip matched original file content). |
| Document Requests ("smart document request") | ✅ | Per-`ServiceCategory` starter checklists (GST/TDS/Income Tax/Audit/ROC) exactly matching product spec §27, fully editable before creating a request. Verified live: creating an Income Tax request correctly prefilled Bank statement/Investment proofs/Form 16/Interest certificate/AIS-TIS/Property documents/Other income proof. Fulfilling an item auto-uploads + links a document and recomputes request status (PENDING → PARTIAL → FULFILLED) server-side; verified live end-to-end including the recompute. |
| Client 360 Documents + Document Requests tabs | ✅ | Replaces the former "Coming soon — Phase 2" placeholders for these two with real, permission-gated panels. |
| Permissions | ✅ | Added `documents.edit`, `document_requests.view`, `document_requests.manage`; fulfilling a checklist item only requires `documents.upload` (the person collecting documents from a client isn't necessarily a manager) while creating/reviewing requests requires `document_requests.manage`. |
| Tests | ✅ | 9 new unit tests (signed-url sign/verify/tamper/expiry, upload MIME/extension allowlist) + a dedicated documents tenant-isolation e2e suite (cross-org read/list/download-link all blocked; tampered signed token rejected). 49 unit + 8 e2e total, all passing. |

### Known simplifications in this pass

- "Attach an already-uploaded document" to a checklist item isn't wired in the UI yet — only "upload a new file to fulfill this item." The API (`documents.clientId` scoping) supports building it; it's a small follow-up.
- No automated reminder/notification when a document request goes overdue or an item stays PENDING — the Automation Engine (§41) that would drive this doesn't exist yet. The request/item due-date data is there for it.
- Virus/malware scanning is not implemented (documented as a gap, not silently skipped) — MIME+extension allowlisting is the only file-type control today.
- Local-disk storage is real, working, and swappable, but it is not S3 — no cross-machine durability/replication in this environment. Production deployment should implement `StorageProvider` against S3-compatible storage before going live with real client files.

## Phase 2 (cont'd) — Dashboard, grouped navigation, Compliance & Follow-ups views

| Module | Status | Notes |
|---|---|---|
| Re-theme: navy `#0D1B2A` / blue `#2563EB` / `#3B82F6` | ✅ | Superseded the previous CA SmartPro palette (`#01142A`/`#1565D8`) per a revised brand spec. Tagline changed to "Your Practice. Your Productivity. Your Growth." Updated everywhere: `globals.css` (light + dark + `.auth-shell` + `.auth-gradient`), logo, favicon SVG, auth pages, root metadata, README. New `--disabled` (#94A3B8) token added. |
| My Day dashboard redesign | ✅ | 5 real KPI cards (Tasks Today, Overdue, Compliance Due, Follow-ups, Payment Tasks — no fabricated currency figures; "Payment Tasks" is a real count of category=PAYMENT tasks, standing in for the spec's "Receivables Due ₹" which would require a Payments ledger that doesn't exist yet) via a new reusable `KpiCard` component. Added Recent Clients (real service-category badges + task counts — client list query now includes `services`), an honest AI Copilot teaser card (no fabricated "insights," links to a real conversation), and a permission-gated Recent Activity timeline (reuses the real audit log, `settings.manage`-gated same as the Settings tab it's drawn from). |
| `getMyDay` counts extended | ✅ | Backend now also returns `complianceDue` (org-wide `ComplianceEvent` count due today, mirrors how the Compliance Calendar itself isn't per-assignee) and `paymentTasks` (category=PAYMENT count from the same already-fetched task set). |
| Sidebar restructure | ✅ | Flat nav replaced with 5 collapsible groups (Main/Work/Tax & Compliance/Intelligence/Admin) per the spec's information architecture. `NAV_GROUPS` in `lib/nav.ts`; `NAV_ITEMS` (flattened) kept exported for the mobile bottom nav's "More" list — no mobile-nav changes needed. Not-yet-built items carry a small dot indicator and route to an honest `ComingSoonPage`, never a dead link or faked screen. |
| New real page: Compliance | ✅ | `/compliance` — org-wide compliance-events table (status tabs, complete/waive actions) using the existing `compliance-events` API; `compliance.manage`-gated with a clear message for roles without it. Complements (doesn't replace) the existing Settings → Compliance rules tab. |
| New real page: Document Requests | ✅ | `/document-requests` — cross-client list reusing the existing `DocumentRequestCard` (now with an optional `showClient` prop) and `useDocumentRequests({})` with no `clientId` filter. |
| New real page: Follow-ups | ✅ | `/follow-ups` — Tasks API filtered to `category=FOLLOW_UP` (follow-ups are modeled as a task category, not a separate entity — see "Explicitly deferred" below); added `category` to `TaskListFilters` on the frontend, already supported server-side. |
| 14 honest "coming soon" pages | ✅ | Communication, Payments, Invoices, GST, TDS, Income Tax, Audit, ROC/MCA, UDIN, Notices, Voice Assistant, Analytics, Team, Automations — each a real route rendering a shared `ComingSoonPage` component with a specific, accurate description of what's missing (never a generic "under construction" placeholder, never mocked data standing in for the real module). |
| Client 360 fix | ✅ | Removed "Compliance" from the Client 360 "Coming soon" badge list — stale after the new `/compliance` page landed. |

### Known simplifications in this pass

- "Compliance Due" and per-client Tasks/Compliance views aren't cross-linked yet (e.g. no `/compliance?clientId=` filter UI, no Client 360 Compliance tab) — the backend already supports the filter; only the UI wiring is missing.
- "Team" is fully unbuilt (no invite/role-assignment UI) — Settings only shows firm name/slug today.

## Explicitly deferred (Phase 3+)

- Email delivery provider integration (transactional send) — interface + DB models exist, provider not wired. Password reset/welcome emails log server-side instead of sending.
- WhatsApp Business API/BSP integration — schema-ready (Reminder.channel, planned), no provider wired.
- Payment gateway, payment links, subscription billing, invoices.
- RAG knowledge base (embeddings/vector DB).
- Voice AI assistant.
- Client portal.
- White-label / custom domain / branding.
- Feature flag system / subscription plan entitlements.
- Client communication timeline (email/WhatsApp/call log) — follow-ups currently modeled as a task category, not a dedicated entity.
- Super Admin cross-organization console — SUPER_ADMIN role seeded but currently behaves like FIRM_ADMIN scoped to one org.

## Known simplifications (MVP-appropriate, documented rather than hidden)

- Compliance/task period math uses calendar quarters/halves, not Indian-FY-aware quarters.
- Timezone handling is UTC-based server-side; per-organization timezone display is not yet applied to due-date rendering.
- Reminder engine covers IN_APP only; dedupes per entity+offset+day via the Reminder table.

## AI provider

The AI Copilot runs on **Google Gemini** via `@google/genai` (not Anthropic — swapped after the Anthropic-based build was verified with a placeholder key, then rewired once a real Gemini key was provided). Config: `AI_PROVIDER=gemini`, `AI_MODEL` pinned to `gemini-3.6-flash` in this environment's `.env` (the `gemini-flash-latest` alias was hitting sustained 503s from Google at build time — Google's own API error also flagged `gemini-2.5-flash` as deprecated for new keys and pointed at `gemini-3.6-flash`, which is what's wired). Tool-calling required echoing back the model's full response content (`response.candidates[0].content`), not a hand-built function-call part — newer Gemini models attach a `thoughtSignature` to tool-call turns that must round-trip unchanged.

## Design system

**CA SmartPro** brand identity (this is the *second* palette revision — see git history for the earlier `#01142A`/`#1565D8` iteration, itself a successor to the original "CA Practice OS" two-color charcoal+blue identity): Deep Navy (`--navy`, `#0D1B2A`) for the sidebar/dark chrome, Primary Blue (`--brand-600`, `#2563EB`) for buttons/links/main actions, Accent Blue (`--brand-500`, `#3B82F6`) for focus rings/active nav/highlights, Emerald Green (`--status-completed`, `#16A34A`) for success/positive, Danger Red (`--status-overdue`, `#EF4444`), AI Purple (`--ai-*`, `#6D28D9`) used only inside the AI Copilot experience, CA Green (`--ca-green`, `#00A651`) reserved for the logo accent and future financial-positive indicators. Neutrals follow the Slate ramp (`#F8FAFC`/`#0F172A`/`#64748B`/`#E2E8F0`, plus `--disabled` `#94A3B8`). Applied via CSS variables in `apps/web/src/app/globals.css`, both light and `prefers-color-scheme: dark` — dark mode intentionally uses navy surfaces (not a neutral charcoal) per the brand spec's explicit "navy for dark-mode surfaces" direction. Functional status colors (green/amber/red for completed/attention/overdue) stay distinct from the brand/AI accent palettes since they carry meaning, per section 62. Logo: `apps/web/src/components/brand/logo.tsx` (`LogoMark` icon + `Logo` full lockup, light/on-dark variants); favicon is a static `apps/web/src/app/icon.svg` — deliberately **not** `next/og`'s `ImageResponse`, because that pulls in the native `sharp` binary, which this Windows dev environment's Application Control policy blocks from loading (crashed the entire dev server on first request when tried).

This file is updated at the end of each module as it lands.
