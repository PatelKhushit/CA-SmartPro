# Build Status

Legend: ✅ Done (real UI + API + DB)  🚧 In progress  ⬜ Not started  ⏭️ Phase 2/3 (intentionally deferred, interface designed for it)

**This file was significantly out of date as of 2026-09-02** — several modules below (GST, TDS, UDIN, Notices, Team, Automations, AI Copilot write actions, News, localization) had already shipped in earlier commits but were never added to this doc, which still described them as "coming soon." The sections below have been corrected against the actual code, not assumptions. See "Current totals" at the bottom for the headline numbers.

## Phase 1 — MVP (this build)

| Module | Status | Notes |
|---|---|---|
| Monorepo / infra / docker-compose | ✅ | npm workspaces, Postgres + Redis via docker-compose, ports pinned (web 3100, api 4000) |
| Prisma schema & migrations | ✅ | Full MVP schema, tenant-scoped, seeded roles/permissions only (no fake data) |
| Auth (register/login/logout/refresh) | ✅ | Argon2id, JWT access + rotating httpOnly refresh cookie, lockout, password reset |
| RBAC + tenant isolation guards | ✅ | Seeded roles/permissions, PermissionsGuard, automated tenant-isolation e2e tests |
| Design system + auth pages | ✅ | shadcn-style component kit, status-color system, responsive app shell |
| Clients module | ✅ | CRUD, contacts, services, tenant-isolated (verified); list now has real status filter, server-side sort, and pagination (see Foundation hardening below) |
| Tasks + templates + recurring engine | ✅ | BullMQ-backed idempotent generation (unique constraint + transaction, not just convention), priority engine, checklist/comments/assign |
| My Day + Focus Mode + productivity/goals | ✅ | Next-best-task, focus timer, live-computed goal progress |
| Compliance engine + CA Calendar + reminders + notifications | ✅ | No statutory dates invented/seeded — firm enters + verifies rules; unified calendar; IN_APP reminders/notifications |
| CA Calculator | ✅ | 12 calculators, backend computes formula/assumptions, real REST round-trip |
| Basic reports + AI Copilot | ✅ | Daily/Monthly/Team reports + CSV export; AI Copilot live on Gemini, read-only tools plus two write tools (create_task/create_followup) that now require explicit server-side confirmation before anything is created (see Foundation hardening) |
| Responsive UI + mobile nav + audit log | ✅ | Real mobile bottom nav/sidebar (`md:` breakpoint split, not a shrunk desktop layout). Audit log now runs through a single central `AuditService` with structured before/after values (see Foundation hardening) |
| Command palette + quick-create | ✅ | `Ctrl+K` (or clicking the topbar search box) opens a real `cmdk` command palette — grouped nav commands, quick actions (Add client/task, Open AI Assistant, Open Settings), and live client/task search blended in. Topbar "+ Create" dropdown for New client/New task |
| Global error boundaries | ✅ | Root `error.tsx`, an in-shell `(app)/error.tsx` (keeps sidebar visible on error), `not-found.tsx`, and `global-error.tsx` for the root-layout edge case — no more blank page on an uncaught render error |
| Tests + production build verification | ✅ | 43 unit tests + 10 e2e tests (tenant isolation, documents tenant isolation, AI confirm-before-write, health), all passing. Both apps build clean with `tsc`/ESLint/oxlint |

## Phase 2 — Documents & Document Requests

| Module | Status | Notes |
|---|---|---|
| Rebrand: CA SmartPro | ✅ | Navy/blue/emerald/AI-purple design tokens, navy sidebar, SVG favicon |
| Document storage | ✅ | Real private local-disk storage behind a `StorageProvider` interface — swappable for S3 without schema/API changes |
| Signed download URLs | ✅ | HMAC-SHA256 signed, single-version-scoped, short TTL, constant-time verified |
| Documents module | ✅ | Upload (MIME+extension allowlist, size cap), versioning, metadata edit, archive, org/client-scoped listing |
| Document Requests | ✅ | Per-ServiceCategory starter checklists (GST/TDS/Income Tax/Audit/ROC), editable, auto-recomputed status (PENDING → PARTIAL → FULFILLED) |
| Client 360 Documents + Document Requests tabs | ✅ | Real, permission-gated panels |

### Known simplifications carried from this pass

- "Attach an already-uploaded document" to a checklist item isn't wired in the UI — only "upload a new file to fulfill this item."
- No automated reminder/notification when a document request goes overdue — the Automation Engine that would drive this is real (see below) but isn't wired to this specific trigger yet.
- Virus/malware scanning is not implemented — MIME+extension allowlisting is the only file-type control.
- Local-disk storage is real and swappable, but not S3 — no cross-machine durability in this environment.

## Phase 2 (cont'd) — Dashboard, grouped navigation, Compliance & Follow-ups views

| Module | Status | Notes |
|---|---|---|
| Re-theme: navy `#0D1B2A` / blue `#2563EB` / `#3B82F6` | ✅ | Tagline "Your Practice. Your Productivity. Your Growth." |
| Sidebar restructure | ✅ | Collapsible groups (Main/Work/Tax & Compliance/Intelligence/Admin), `NAV_GROUPS` in `lib/nav.ts` |
| New real pages: Compliance, Document Requests, Follow-ups | ✅ | Org-wide compliance-events table, cross-client document requests list, task-category-based follow-ups view |
| Client 360 fix | ✅ | Stale "Compliance" coming-soon badge removed once the real `/compliance` page landed |

## Phase 2 (cont'd) — GST, TDS, UDIN, Notices, Team, Automations, AI write actions, News, localization

**This section did not previously exist in this file** — these modules shipped in an earlier commit and were incorrectly left documented as "coming soon" below. Corrected here.

| Module | Status | Notes |
|---|---|---|
| GST module | ✅ | Real GST profiles + returns tracking (`/gst`) — internal deadline/status tracking only, **not** a government GST portal filing integration (that stays out of scope; see Explicitly deferred). Tenant-isolated, audit-logged, transactional. Task auto-sync on return completion. |
| TDS module | ✅ | Real TDS profiles, returns, challans, certificates (`/tds`). Same internal-tracking-not-government-filing scope as GST. |
| UDIN module | ✅ | Real UDIN record tracking (`/udin`) — never synthesizes or invents a UDIN number, manual entry only, by design. |
| Notices module | ✅ | Real notice tracking with status workflow, comments, linked documents, linked tasks (`/notices`). |
| Team module | ✅ | Real member invite flow (placeholder password + email-delivered set-password token, same TTL as password reset), role assignment, suspend/reactivate (`/team`). This corrects an earlier note in this file claiming Team was "fully unbuilt" — it wasn't, as of the commit that added it. |
| Automations module | ✅ | Real automation rules (trigger/condition/action), rule CRUD, execution history (`/automations`). `SEND_EMAIL`/`SEND_WHATSAPP` actions honestly report `SKIPPED — provider not configured` rather than faking delivery. |
| AI Copilot write actions | ✅ | `create_task`/`create_followup` tools — now gated by a real server-side confirm/cancel step (see Foundation hardening below). |
| News | ✅ | Real RSS aggregation (`rss-parser` dependency) via `/news`, not fabricated content. |
| Localization (EN/HI/GU) | ✅ | Real i18n system (`lib/i18n/`), language switcher in the topbar. |
| Voice Assistant | ✅ | Real feature, not a stub — browser Web Speech API (STT/TTS) layered on the same AI conversation backend as the text Copilot (`/voice`). The backend `voice/` directory itself is a leftover empty scaffold (`dto/` only, not wired into `app.module.ts`) since voice needs no dedicated backend module — it reuses `/ai/conversations`. |

### Known gaps in this set

- No dedicated unit or e2e tests for GST/TDS/UDIN/Notices/Team/Automations business logic — coverage here is limited to whatever the general tenant-isolation e2e suite exercises incidentally. Worth adding in a future pass.
- TDS profile creation has no audit log entry (GST's equivalent does) — a small pre-existing inconsistency, not fixed in this pass to keep the audit-centralization change a pure refactor rather than adding new audit coverage.
- Compliance-event `waive()` and client contact/service CRUD also have no audit coverage — same reasoning (existing gaps, not new ones introduced or closed by the centralization pass).

## Phase 2 (cont'd) — Foundation hardening (2026-09-02)

A gap audit against the original product spec found the app well ahead of a bare "Phase 1" in module count, but with several real correctness/UX gaps. This pass closed the highest-priority ones.

| Item | Status | Notes |
|---|---|---|
| AI write-tool server-side confirmation | ✅ | `create_task`/`create_followup` no longer execute inline — they stage a DB-backed `AiPendingAction` (org/user-scoped, 15-minute expiry). The actual write only happens via `POST /ai/actions/:id/confirm`, which re-checks permission and can't be double-fired. A UI confirmation card (Confirm/Cancel) was added to both the Copilot and Voice pages. Previously this was a UI-only convention with no server enforcement — a direct API call could have bypassed it. 4 new e2e tests cover the boundary (no task until confirm, exactly-once, expiry, cross-org block). |
| Dashboard cleanup | ✅ | Removed decorative marketing-style sections (`ColorPaletteSection`/`KeyFeaturesSection`/`BrandingBenefitsSection`) that had crept into `/my-day`. Moved the (real, functional) accent-color picker to Settings → Appearance. Added the previously-missing KPI cards (Overdue Tasks, Upcoming Compliance, Pending Documents, Payment Tasks) and two new real widgets: Compliance Snapshot and Needs Attention — both backed by real API data, no fabricated numbers. |
| Real pre-existing bug fixed | ✅ | Sending the *first* message in a brand-new AI conversation 404'd (`POST /ai/conversations//messages` — empty id), caused by a stale-closure race in `useSendAiMessage`. Fixed by passing `conversationId` as a mutate-call argument instead of a hook argument. Found and fixed while verifying the confirmation-gate work above. |
| Clients list filter/sort/pagination | ✅ | Status filter, sortable columns (Client/Status/Tasks, real server-side sort via new `sortBy`/`sortDir` API params), and pagination controls — the backend already supported filtering/pagination but the UI never exposed it. |
| Global error boundaries | ✅ | See Phase 1 table above. |
| Add-client wizard | ✅ | Was a 1-step modal (5 fields); now a real 5-step wizard (Basic Info → Contact → Assignment → Services → Review). Primary contact and selected services are created via follow-up API calls once the client exists (not baked into a single oversized payload). "Industry" from the original product spec was deliberately **not** added — no backing column for it. CIN/LLPIN *was* originally left out for the same reason, then added properly once the ROC/MCA module needed a real per-client identifier — see "ITR and ROC/MCA modules" below. |
| Task creation fields | ✅ | Was title/priority/due-date/client only; now also has description, category, start date, estimated hours, assignee, and a real checklist — all fields the backend already accepted but the dialog never exposed. "Reviewer" and "tags" from the spec were **not** added — no backing column exists for either. |
| Command palette + quick-create | ✅ | See Phase 1 table above. |
| Centralized audit logging | ✅ | See Phase 1 table above. Also added `beforeValue`/`afterValue` columns (structured diffs, not just free-form `metadata`) and a `userAgent` column — previously captured in `SessionMeta` at the auth layer but silently discarded before reaching the audit row. Settings → Audit log now has an expandable row showing the before/after JSON when present. |

### Known gaps not addressed in this pass

- No "Read Only" role (the product spec names one; the seeded roles are SUPER_ADMIN/FIRM_ADMIN/MANAGER/ACCOUNTANT/STAFF/CLIENT, with CLIENT being zero-permission rather than a general read-only staff role).
- No distinct `AiToolCall` model (tool name/input/output are flattened onto `AiMessage`) and no `AI_REQUEST`/`AI_RESPONSE`/`AI_TOOL_CALL`/`AI_APPROVAL`/`AI_ACTION` audit-action taxonomy — the new `ai_action_proposed`/`ai_action_confirmed`/`ai_action_cancelled` actions cover the confirmation flow specifically but aren't a full taxonomy.
- No `Payment`/`Invoice`/`Billing`, or RAG (`knowledge_documents`/`knowledge_chunks`) models yet — later-phase schema isn't stubbed yet. (`ITRReturn` and `ROCFiling` closed the same gap for their modules — see below.)
- Notifications has no full `/notifications` page (bell dropdown only) and no click-through from a notification to its related entity.
- Client profile tabs are Overview/Contacts/Services/Documents/Document Requests/Notes — no Tasks, Billing, Compliance, or Activity-timeline tab on the client itself yet (those exist as org-wide pages, not per-client views).
- No column-visibility toggle, saved filters, bulk selection, or export on the clients list — only filter/sort/pagination were added this pass.

## Phase 2 (cont'd) — ITR and ROC/MCA modules (2026-09-02)

| Module | Status | Notes |
|---|---|---|
| ITR module | ✅ | Real ITR return tracking (`/income-tax`) — `ITRReturn` model (assessment year, form type, status workflow DATA_COLLECTION→…→COMPLETED/DEMAND/REFUND, acknowledgement number, refund/demand amounts, assignee + reviewer, task-linking, document-request integration). Same internal-tracking-not-government-filing scope as GST/TDS — no ITR e-filing integration, and none pretended. Tenant-isolated, audit-logged, transactional, task auto-sync on completion. |
| ROC/MCA module | ✅ | Real ROC/MCA filing tracking (`/roc-mca`) — `ROCFiling` model (form type: AOC-4/MGT-7/MGT-7A/ADT-1/DIR-3 KYC/DIR-12/DPT-3/INC-20A/PAS-3/LLP Form 8/LLP Form 11/Other, financial year, due/filing date, SRN, status, assignee, task-linking, document-request integration). Reuses the shared `ComplianceWorkStatus` enum (same as GST/TDS) rather than inventing a third status vocabulary. No MCA portal filing integration. |
| Client CIN/LLPIN field | ✅ | Closes the gap noted above (Add-client wizard entry) — `Client.cinOrLlpin` column added, exposed in the add-client wizard's Basic Info step, the client detail page's Tax Information card, and used as the ROC filing client-picker's identifier (mirroring how PAN is used for ITR). |

### Known gaps not addressed in this pass

- No dedicated unit tests for the ITR or ROC services — same "covered incidentally by tenant-isolation e2e" situation as GST/TDS/UDIN/Notices/Team/Automations (see above).
- ROC's `formType` enum lists the common annual/event-based MCA forms (AOC-4, MGT-7/7A, ADT-1, DIR-3 KYC, DIR-12, DPT-3, INC-20A, PAS-3, LLP Forms 8/11) plus `OTHER` — it is not an exhaustive list of every MCA e-form.

## Phase 2 (cont'd) — Billing: Fee Plans, Invoices, Payments (2026-09-02)

| Module | Status | Notes |
|---|---|---|
| Fee Plans | ✅ | Real per-client recurring/one-time fee arrangements (`FeePlan`: name, amount, frequency, start/end date, active toggle) — the "Fee Plans" tab on `/invoices`. "Generate invoice" turns a plan into a draft invoice in one action. |
| Invoices | ✅ | Real invoice creation with dynamic line items (`Invoice` + `InvoiceLineItem`), org-scoped sequential numbering (`INV-0001`…), optional GST-at-18% convenience checkbox (plain arithmetic, not a filing computation), status workflow DRAFT→SENT→CANCELLED set manually; PARTIALLY_PAID/PAID are **not** manually settable — they're derived only from recorded payments, enforced server-side. Line items are only editable while DRAFT. An invoice with recorded payments cannot be cancelled until those payments are removed. `/invoices` (list, tabs, filters) and `/invoices/[id]` (detail: totals, line items, payments, actions). |
| Payments | ✅ | Real payment recording against a sent invoice (`Payment`: amount, date, method, reference), capped at the outstanding balance server-side. Recording/removing a payment recomputes the invoice's `amountPaid` and status transactionally — no separate "reconcile" step, no drift possible. Org-wide ledger at `/payments` with client/invoice links, filter/search; payments removable (reverses the invoice status computation) to correct mis-entries. |
| Billing summary KPIs | ✅ | Active fee plans, outstanding invoices, total outstanding ₹, overdue count, collected this month — all computed on read from real rows, nothing cached or estimated. "Overdue" is intentionally not a stored invoice status (see schema note) so it can never go stale without a cron job. |
| `payments.manage` permission | ✅ | Renamed from the unused, never-wired `payments.create` placeholder (added in an earlier pass, reserved for this exact module) to match the `view`/`manage` convention used everywhere else (`itr.manage`, `roc.manage`, etc.). |

### Known gaps not addressed in this pass

- No invoice PDF/print export yet — deferred to the Reports/export pass (Phase 2 task: "Expand Reports module + PDF/Excel export").
- No email delivery of invoices — same as the rest of the app's email-provider gap (see Explicitly deferred below); marking an invoice "Sent" is a manual status change, not an actual send.
- No task/reminder integration for invoices or fee plans (unlike the GST/TDS/ITR/ROC compliance modules) — billing due dates aren't yet wired into the Compliance Deadline Center or automated reminders.
- No dedicated unit tests for `BillingService` — covered only by the same tenant-isolation e2e suite as the other Phase 2 modules.
- No partial refunds or multi-currency support; `Payment` amounts are always in the organization's base currency (INR).

## Phase 2 (cont'd) — Attendance (2026-09-02)

| Module | Status | Notes |
|---|---|---|
| Self check-in/check-out | ✅ | Every staff role (including STAFF) can check themselves in/out — gated only by `attendance.view` (granted to every seeded role except CLIENT), not a "manage others" permission, since this is a personal daily action. Real `Attendance` rows, one per user per calendar day (`@@unique([organizationId, userId, date])`), `workedMinutes` computed from actual check-in/check-out timestamps. |
| Manager marking/correction | ✅ | `attendance.manage` (MANAGER/FIRM_ADMIN/SUPER_ADMIN) can mark or correct any team member's status (Present/Absent/Half Day/On Leave/Holiday/Week Off) for any date via an upsert — reusing the same unique-per-day constraint, so marking an existing date corrects it rather than duplicating. |
| `/attendance` page | ✅ | Today's check-in/out card, this-month KPI cards (Present/On Leave/Absent, computed from real rows — not estimated), team-wide "present today" count, month + team-member filters, and the register table. Managers see every team member's row; everyone else sees only their own. |
| Attendance summary | ✅ | Computed on read each time (today's status, this-month counts, team present-today count) — no cached/derived counters that could drift. |

### Known gaps not addressed in this pass

- No UI to manually adjust a check-in/check-out *timestamp* (only status/notes, via the Mark Attendance upsert) — the backend's `PATCH /attendance/:id` supports timestamp correction but isn't wired to a dialog yet.
- Dates are stored as midnight UTC (this codebase's existing convention — see "Known simplifications" below), not the organization's configured timezone, so a check-in right around UTC midnight could land on the "wrong" calendar day for organizations far from UTC.
- No attendance-to-payroll integration.
- No dedicated unit tests for `AttendanceService` — same tenant-isolation-e2e-only coverage as the other Phase 2 modules.

## Phase 2 (cont'd) — Leave management (2026-09-02)

| Module | Status | Notes |
|---|---|---|
| Leave requests | ✅ | Real `LeaveRequest` model (type: Casual/Sick/Earned/Unpaid/Other, date range, days — supports 0.5 for half-day, reason, status PENDING→APPROVED/REJECTED/CANCELLED). Everyone with `leave.view` (every seeded role except CLIENT) can request and cancel their own pending requests. |
| Approvals | ✅ | `leave.manage` (MANAGER/FIRM_ADMIN/SUPER_ADMIN) approves or rejects pending requests. Unlike Attendance's firm-wide register, the leave list is **self-scoped** for non-managers (reasons can be personal/medical) — only `leave.manage` holders can see and filter by other team members. |
| Attendance integration | ✅ | Approving a leave request upserts an `Attendance` row (status `ON_LEAVE`, or `HALF_DAY` for a single 0.5-day request) for every date in the range — real cross-module linkage, not just a status label. Live-verified: a 4-day approval produced 4 real `ON_LEAVE` attendance rows. |
| `/leave` page | ✅ | KPI cards (my pending/approved, days taken this year, team pending-approvals-for-me), status tabs, and a request table with inline approve/reject/cancel actions gated by ownership + permission. |

### Known gaps not addressed in this pass

- No leave entitlement/balance/accrual/carry-forward tracking — deliberately not built, since that requires firm-configurable policy data (annual quota, accrual rate) that doesn't exist anywhere in this schema yet, and this project's convention is never to invent policy numbers. "Days Taken This Year" is a real, computed total; it is not compared against any entitlement.
- No leave calendar/team-overlap view (e.g., "who else is on leave this week").
- No dedicated unit tests for `LeaveService` — same tenant-isolation-e2e-only coverage as the other Phase 2 modules.

## Phase 2 (cont'd) — AI Copilot tool expansion, 6 → 18 tools (2026-09-03)

| Item | Status | Notes |
|---|---|---|
| 10 new read tools | ✅ | `get_gst_status`, `get_tds_status`, `get_itr_status`, `get_roc_status`, `get_billing_summary` (org-wide summary if no client given, else that client's recent records), `get_my_leave_requests`, `get_my_attendance_status` (always self-scoped, never take another user as an argument), `get_document_requests_status`, `get_udin_records`, `get_notices`. Each reuses the same feature service its REST endpoint uses (`GstService`, `ItrService`, `BillingService`, etc.) rather than duplicating query logic — the AI can never show a different answer than the app's own pages. |
| 2 new write tools | ✅ | `create_leave_request` (always for the calling user only — the tool has no "for someone else" parameter, so this is enforced by the tool's shape, not just a permission check) and `create_document_request`. Both go through the exact same confirm-before-write staging as the original two tools — nothing new was added to the trust boundary, only to what can be staged. |
| Per-tool read permission gating | ✅ | **Closes a real gap**: previously, *no* AI read tool checked the calling user's module permission — a user who could chat with the AI at all could ask about GST/compliance/etc. regardless of their own `*.view` grants (tenant-isolated, but not permission-scoped). The 4 original read tools are left as-is (unchanged behavior, no regression risk), but all 10 new ones are gated by a `READ_TOOL_PERMISSIONS` map (`get_gst_status` → `gst.view`, `get_billing_summary` → `payments.view`, etc.) checked in `AiService.executeTool()` before dispatch — mirroring how `ai.actions` was already checked for writes. |
| `AiPendingAction.resultTaskId` → `resultEntityType`/`resultEntityId` | ✅ | The old field only made sense when both write tools produced a Task. Generalized via a manually-written migration (the interactive `prisma migrate dev` prompt doesn't work in this environment) that backfills existing `CONFIRMED` rows (`resultEntityType='task'`) rather than discarding that audit history. |
| Live-verified | ✅ | A single Copilot message ("GST returns, billing/invoices, and my own attendance") correctly triggered all three tools in one turn and synthesized an accurate combined answer; a `create_leave_request` write was staged, confirmed, and produced a real `PENDING` `LeaveRequest` row visible on `/leave` — full round trip, not just a staged-then-untested action. |

### Known gaps not addressed in this pass

- The original 4 read tools (`get_today_tasks`, `get_overdue_tasks`, `get_client_summary`, `get_compliance_events`) still have no permission gate — left unchanged to avoid a behavior regression on tools that already shipped; closing this fully would mean auditing whether `tasks.view`/`compliance.view` should gate them.
- No AI tools for recording payments, approving/rejecting leave, or any other financial/approval action — deliberately excluded as too high-stakes for a chat-staged action even with confirm-before-write, not a technical limitation.
- `SYSTEM_PROMPT` and `summarizeAction()` are still hand-maintained per tool name (a small dispatch table, not data-driven) — fine at 18 tools, would need a refactor before growing much further.

## Phase 2 (cont'd) — Reports expansion + PDF/Excel export (2026-09-03)

| Item | Status | Notes |
|---|---|---|
| Compliance report | ✅ | New `/reports` "Compliance" tab — firm-wide GST/TDS/ITR/ROC/UDIN/Notices health in one view. Reuses each module's own `summary()` (`GstService`, `TdsService`, etc.), same "can't disagree with that module's own page" guarantee used for the AI tools. |
| Billing report | ✅ | New "Billing" tab — active fee plans, outstanding/overdue invoice counts, collected-this-month, total outstanding, and the top 10 overdue invoices by client. Reuses `BillingService.summary()`/`listInvoices()`. |
| Client report billing data | ✅ | `GET /reports/client/:clientId` now includes real invoice/outstanding-balance data (previously a `// Phase 2` comment placeholder, from before the Billing module existed). Not yet consumed by any frontend page — the endpoint existed with no UI caller before this pass either. |
| PDF export | ✅ | Daily report → `GET /reports/daily/export.pdf` via `pdfkit` (added as a new dependency) — a real one-page (or paginated) task table with the same data as the CSV export, using pdfkit's built-in Helvetica fonts (no external font files needed). |
| Excel export | ✅ | Monthly report → `GET /reports/monthly/export.xlsx` and Team report → `GET /reports/team/export.xlsx`, both via `exceljs` (added as a new dependency) — real `.xlsx` workbooks with a header row and typed columns, not a renamed CSV. |
| Live-verified | ✅ | All three new export buttons (PDF/Excel/Excel) confirmed returning HTTP 200 with the correct endpoint hit, via the browser's own network log — not just "the code compiles." |

### Known gaps not addressed in this pass

- No PDF/Excel export for the new Compliance or Billing tabs themselves (only Daily/Monthly/Team, matching the original three report types) — would be a straightforward follow-up using the same `pdfkit`/`exceljs` pattern.
- No date-range picker on the Compliance/Billing tabs (both are always "as of now" snapshots, same as their source modules' own summary cards).

## Phase 2 (cont'd) — PWA support (2026-09-03)

| Item | Status | Notes |
|---|---|---|
| Web app manifest | ✅ | `public/manifest.webmanifest` — real name/icons/theme colors/`display: standalone`, linked from the root layout via Next's Metadata API (`manifest`, `viewport.themeColor`, `appleWebApp`). |
| App icons | ✅ | Real 192×192 and 512×512 PNGs rasterized from the actual brand `icon.svg` (navy background, "CA" wordmark, green growth-arrow accent) via `sharp` — not a placeholder logo. `purpose: "any"` only; no `maskable` variant, since the source artwork isn't safe-zone-padded and a mislabeled maskable icon would get clipped on Android rather than actually working. |
| Service worker | ✅ | `public/sw.js`, hand-written (no `next-pwa` or similar plugin — avoids an extra dependency of unknown Turbopack compatibility for a ~50-line script). Cache-first for content-hashed `/_next/static/*` and `/icons/*`; network-first for page navigations with a cached-shell/`/offline` fallback; **every** `/api/*` request is explicitly bypassed — always live, never cached, never intercepted. |
| Offline page | ✅ | Real `/offline` route, pre-cached at service-worker install time, shown only when a navigation's network request fails — states plainly that no business data is cached, rather than implying stale data is safe to trust. |
| Registration | ✅ | `components/pwa-register.tsx`, registered only when `NODE_ENV === 'production'` — a service worker caching hashed chunk URLs actively fights Turbopack's dev-mode HMR, so it's never registered in `next dev`. |
| Live-verified | ✅ | Ran a real `next build` + `next start` (not dev mode, since SW registration is prod-only) and confirmed via injected JS: the manifest `<link>` resolves, `theme-color` meta is set, the service worker registered and reached `active` state, and its cache actually contains the 4 shell assets (icons, manifest, `/offline`) — not just "the file exists on disk." |

### Known gaps not addressed in this pass

- No custom "Install app" prompt UI (listening for `beforeinstallprompt`) — every supporting browser already surfaces its own native install affordance once the manifest+SW+icons criteria are met, which is what this pass delivers; a custom banner would be a nice-to-have, not a requirement.
- No push notifications — this PWA pass is installability + shell-caching only, not the notifications API.
- Maskable icon variant not included (see App icons row above) — would need new artwork with proper safe-zone padding, not a rescale of the existing logo.

## Phase 2 (cont'd) — RAG / Knowledge base foundation (2026-09-03)

| Item | Status | Notes |
|---|---|---|
| Knowledge documents | ✅ | Real `KnowledgeDocument`/`KnowledgeChunk` models. A document (title + free-text content — no file/PDF upload in this pass) is chunked (~800 chars, 100-char overlap, breaking on paragraph/sentence boundaries where possible) and each chunk is embedded via a real Gemini embedding call — never a fabricated/random vector. |
| Embeddings | ✅ | `gemini-embedding-001` (3072-dim), called through the same `@google/genai` client already used for chat. Runs synchronously within the create/update request — acceptable at foundation scale; this app already has BullMQ wired up elsewhere, so a background job is the natural next step at higher volume, not a new dependency. |
| Similarity search | ✅ | Application-level cosine similarity over a `Float[]` column — **not** a native pgvector index. This environment's Postgres image is plain `postgres:16-alpine` (no pgvector extension), and swapping the Docker image was judged too consequential an infra change to make unprompted during this pass. Documented upgrade path: switch to `pgvector/pgvector:pg16` (same Postgres 16 data format, so the existing volume survives), `CREATE EXTENSION vector`, and a `vector(3072)` column + `ORDER BY embedding <=> $1` — everything else (chunking, the embedding call, the API surface) stays the same. Fine at the scale a single firm's internal knowledge base actually reaches. |
| Status transparency | ✅ | `PROCESSING → READY / FAILED`, with the real provider error message stored and shown in the UI on failure (live-verified: an initially-wrong model name produced a real `404 NOT_FOUND` from the Gemini API, surfaced verbatim in the document's card — not swallowed or faked as success). |
| `search_knowledge_base` AI tool | ✅ | The 11th new AI tool (bringing the total to 19, not 18) — closes the actual RAG loop: the model can now search the firm's own saved documentation and ground answers in it, gated by `knowledge.view` like the other new read tools. |
| Frontend | ✅ | `/knowledge` — create/view/edit/delete documents, plus a real semantic search box (not a keyword filter) showing ranked results with a relevance score. Documents still `PROCESSING` are polled every 2s until they resolve. |
| Live-verified | ✅ | Created a real "Client Offboarding SOP" document, confirmed 2 real 3072-dim embedding vectors landed in Postgres, searched with a paraphrase containing **zero** literal keyword overlap with the source text ("client stops working with us" vs. "client terminates their engagement") and got both chunks back ranked 70–72% relevance — genuine semantic retrieval, not substring matching. Then asked the AI Copilot an unprompted, indirect question about client offboarding; it chose to call `search_knowledge_base` on its own, retrieved the SOP, and produced an accurate, faithful summary explicitly attributed to "your firm's Client Offboarding SOP" — the full RAG loop, closed. |

### Known gaps not addressed in this pass

- No file/PDF/DOCX upload as a knowledge source — text only (paste or type). Extracting text from an uploaded `Document` would need a new parsing dependency (e.g. `pdf-parse`) and is a reasonable next step, not built here.
- No pgvector — see the Similarity search row above for the exact, low-risk upgrade path once volume warrants it.
- Embedding generation is synchronous (blocks the create/update request); no background job yet.
- No per-document access control finer than firm-wide `knowledge.view`/`knowledge.manage` — every document is visible to the whole firm, there's no "private note" or department-scoped visibility.

## Phase 2 (cont'd) — Task time tracking (2026-09-03)

| Item | Status | Notes |
|---|---|---|
| Real bug being fixed | ✅ | Focus Mode already had a timer UI, but it was pure client-side `useState`/`setInterval` — elapsed time reset to 0 on any page refresh or crashed tab, and `actualMinutes` was only ever overwritten once at task completion (not accumulated across sessions). This pass replaces it with a server-persisted timer, closing both gaps. |
| `TaskTimeEntry` model | ✅ | New model (`startedAt`, nullable `endedAt`/`durationMinutes` — null `endedAt` means "currently running"). `POST /tasks/:id/timer/start` starts one (auto-stopping any other task's running timer for that user first, so a user can only ever have one timer running at a time), `POST /tasks/:id/timer/stop` stops it and, in the same transaction, adds the elapsed minutes onto `Task.actualMinutes` — accumulating across every start/stop cycle rather than overwriting. `GET /tasks/timer/running` and `GET /tasks/:id/time-entries` expose current/historical state. Audit-logged (`task_timer_started`/`task_timer_stopped`). |
| Focus Mode rewrite | ✅ | `/focus/:id` now starts (or transparently switches to) the real server timer on entry, ticks a local display anchored to the DB `startedAt` (so a refresh recomputes elapsed time instead of resetting it), and Pause/Resume call the real start/stop endpoints instead of a local flag. |
| Topbar running-timer indicator | ✅ | New `RunningTimerIndicator`, polled every 30s and shown from anywhere in the app (not just the Focus Mode page) — proof the timer is genuinely server-side rather than tied to one page staying open. Click-through to the task's Focus Mode, inline stop button. |
| Task detail time log | ✅ | New "Time log" card on `/tasks/:id` showing the running total and every entry (user, start–end, duration) via `GET /tasks/:id/time-entries`. |
| Real bug found and fixed during this pass | ✅ | Nest's Express adapter sends an **empty HTTP body** (not JSON `"null"`) for a controller method that resolves to `null` — `GET /tasks/timer/running` with no running timer returned `Content-Length: 0`. The frontend's generic `apiFetch` parses an empty body as `undefined`, which React Query rejects ("Query data cannot be undefined"), breaking the query. Fixed at the `useRunningTimer` query-function boundary (`.then(v => v ?? null)`) rather than changing the generic API client, since this is the only endpoint in the app that intentionally returns a bare `null` for "nothing found" instead of throwing `404`. Confirmed via a direct `curl` against the endpoint (`Content-Length: 0`) before fixing, and via the browser's Next.js error overlay clearing after. |
| Live-verified | ✅ | Created a real task, entered Focus Mode (timer auto-started), refreshed the page mid-session and confirmed the elapsed time continued from the DB-backed value instead of resetting to 0:00, confirmed the topbar indicator appeared and ticked on an unrelated page (`/my-day`), stopped the timer from the topbar, and confirmed via `psql` that `Task.actualMinutes` and the `TaskTimeEntry` row (`startedAt`/`endedAt`/`durationMinutes`) matched. Test task and its time entries deleted afterward. |

### Known gaps not addressed in this pass

- No manual time-entry editing or deletion UI (e.g. correcting a forgotten stop) — entries are create-via-start/stop only.
- No per-entry notes ("what were you working on") — a time entry only records who/when/how-long, not a description.
- No dedicated unit or e2e tests for the timer endpoints — same "not covered beyond the general e2e suite" gap as most Phase 2 modules (see above).
- Starting a timer on a new task silently stops whatever timer was already running (by design, since one user can only track one task at a time) — there's no confirmation prompt before that switch happens.

## Explicitly deferred (Phase 3+)

- Government GST/Income-Tax/TDS/ROC filing integrations — the modules above track deadlines/status/documents internally; none of them file anything with an actual government portal, and none pretend to.
- Email delivery provider integration (transactional send) — interface + DB models exist, provider not wired. Password reset/welcome/invite emails log server-side instead of sending.
- WhatsApp Business API/BSP integration — schema-ready (`Reminder.channel`, automation `SEND_WHATSAPP` action), no provider wired; both honestly report as not-configured rather than faking delivery.
- Payment gateway, payment links, subscription billing. (Invoices, fee plans, and internal payment recording are now real — see "Billing" above. There is still no gateway to actually *collect* a payment online; recording stays manual.)
- RAG knowledge base (embeddings/vector DB).
- Client portal.
- White-label / custom domain / branding.
- Feature flag system / subscription plan entitlements.
- Client communication timeline (email/WhatsApp/call log) — follow-ups are modeled as a task category, not a dedicated entity.
- Super Admin cross-organization console — SUPER_ADMIN role seeded but currently behaves like FIRM_ADMIN scoped to one org.

## Known simplifications (documented rather than hidden)

- Compliance/task period math uses calendar quarters/halves, not Indian-FY-aware quarters.
- Timezone handling is UTC-based server-side; per-organization timezone display is not yet applied to due-date rendering.
- Reminder engine covers IN_APP only; dedupes per entity+offset+day via the Reminder table.
- "Compliance Due" and per-client Tasks/Compliance views aren't cross-linked (no `/compliance?clientId=` filter UI, no Client 360 Compliance tab) — the backend already supports the filter.

## AI provider

The AI Copilot runs on **Google Gemini** via `@google/genai`. Config: `AI_PROVIDER=gemini`, `AI_MODEL` pinned to `gemini-3.6-flash`. Tool-calling requires echoing back the model's full response content (`response.candidates[0].content`) — newer Gemini models attach a `thoughtSignature` to tool-call turns that must round-trip unchanged. 19 tools total (see "AI Copilot tool expansion" and "RAG / Knowledge base foundation" above): 4 read tools with no permission gate (the original ones) plus 11 with one (10 from the tool-expansion pass + `search_knowledge_base` from the RAG pass), and 4 write tools (`create_task`/`create_followup`/`create_leave_request`/`create_document_request`), all of which stage a pending action rather than executing inline — see Foundation hardening above.

## Design system

**CA SmartPro** brand identity: Deep Navy (`--navy`, `#0D1B2A`) sidebar/dark chrome, Primary Blue (`--brand-600`, `#2563EB`) buttons/links, Accent Blue (`--brand-500`, `#3B82F6`) focus rings/active nav, Emerald Green (`--status-completed`, `#16A34A`) success, Danger Red (`--status-overdue`, `#EF4444`), AI Purple (`--ai-*`, `#6D28D9`) used only inside the AI Copilot/Voice experience, CA Green (`--ca-green`, `#00A651`) logo accent. Neutrals follow the Slate ramp. Applied via CSS variables in `apps/web/src/app/globals.css`, both light and dark. `cmdk` was added this pass for the command palette, styled through the same token set (`components/ui/command.tsx`) rather than its own visual language.

## Current totals (as of 2026-09-03)

- **Tests**: 43 unit + 10 e2e, all passing.
- **Real, built modules**: Auth, Clients, Tasks (+ recurring engine + templates + time tracking), My Day/Focus/Goals, Compliance (rules + events + calendar), Calculators, Reports, AI Copilot (text + voice, read + confirmed-write, 19 tools), Documents, Document Requests, GST, TDS, ITR, ROC/MCA, UDIN, Notices, Team, Automations, News, Search, Notifications (bell only), Audit Log, Command Palette, Localization, Billing (Fee Plans/Invoices/Payments), Attendance, Leave management, Knowledge Base (RAG foundation), PWA.
- **Honest "coming soon" pages** (3): Communication, Audit, Analytics.

This file is updated at the end of each module as it lands — please keep it that way; the drift documented at the top of this file (several real modules undocumented for multiple commits) is exactly the failure mode this convention exists to prevent.
