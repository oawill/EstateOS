# NidraQ

Everything your community needs to run better. Multi-tenant SaaS for community/estate management: billing, payments, visitors, security, maintenance, utilities, announcements, and a private resident community — one platform per estate, isolated by tenant. Nigeria is the initial market; the architecture (currency, timezone, phone, locale) is not Nigeria-only.

This is **Phase 1 + Phase 2 + CSV import + Visitors/Gate Mode + Maintenance & vendors + Utilities + Announcements & notifications + Platform super-admin portal + Public landing page + Request a Demo + Community**: architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/residents management, the core billing/payments loop (charges → invoices → payment → receipt), bulk CSV import, visitor management (QR/PIN passes, gate check-in/out), the maintenance workflow (report → assign → resolve → confirm), manual utility meter billing, estate announcements with an in-app notification inbox, a platform super-admin portal (estate dashboard, plans/pricing config with enforced unit limits, cross-tenant audit and user views), a public marketing page for signed-out visitors, a public "Request a Demo" workflow (multi-step form → database record → email notifications → Super Admin triage queue), and a private per-estate Community (social feed, classifieds/shortlets, events, moderation). See [Roadmap](#roadmap) for what's left.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS 4**
- **PostgreSQL** via **Prisma 7** (driver-adapter model — see `src/server/db/client.ts`)
- **Auth.js v5** (Credentials provider, JWT sessions)
- **Paystack** (card/bank transfer/USSD) + manual bank-transfer recording, for payments
- **Resend** for transactional email (demo-request notifications) — optional, degrades gracefully without a key
- **S3-compatible storage** (`@aws-sdk/client-s3` + presigned uploads) for Community photos — optional, same graceful degradation
- **Vitest** for unit and integration tests

## Local setup

### 1. Database

You need a local PostgreSQL instance (native install or Docker). Create a dedicated role and database:

```bash
psql -U postgres -c "CREATE ROLE estateos WITH LOGIN PASSWORD 'yourpassword' CREATEDB; CREATE DATABASE estateos OWNER estateos;"
```

`CREATEDB` is required because `prisma migrate dev` creates a temporary shadow database to compute migrations. If your role can't be granted `CREATEDB`, create a second empty database yourself (e.g. `estateos_shadow`) and set `SHADOW_DATABASE_URL` in `.env` instead — see `.env.example`.

If you'd rather use Docker, a `docker-compose.yml` is included:

```bash
docker compose up -d
```

### 2. Environment

Copy `.env.example` to `.env` and fill in `DATABASE_URL` (URL-encode any special characters in your password, e.g. `@` → `%40`) and generate an `AUTH_SECRET`:

```bash
cp .env.example .env
npx auth secret
```

To exercise the Paystack payment path live, add `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` (test keys from your Paystack dashboard). Without them, "Pay with card / bank transfer" fails gracefully with a message pointing residents to the manual bank-transfer path instead — see [What's mocked or deferred](#whats-mocked-or-deferred-not-built-yet).

To actually send demo-request notification emails, add `RESEND_API_KEY` (from your Resend dashboard) and `EMAIL_FROM` (a verified sending address). `CUSTOMER_SERVICE_EMAIL` is where the internal notification goes — set it even without a Resend key, so the destination is configured once you add one. Without `RESEND_API_KEY`, demo requests still save to the database; the emails are just skipped with a logged warning.

To enable photo uploads in Community, add `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` (any S3-compatible provider — AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2). Without them, posts and classified listings work fully as text-only — the photo picker just doesn't appear.

### 3. Install, migrate, seed

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

The seed script creates:
- A platform admin: `admin@estateos.ng`
- **Greenview Gardens Estate** (`greenview-gardens`) with an admin, finance, facility manager, security, and one resident (with a vehicle) — all at `@greenview.ng`
- **Palm Court Residences** (`palm-court`) with its own admin, used to verify tenant isolation

All seeded users share the password: `password123`

### 4. Run

```bash
pnpm dev
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev/build/start |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests (no DB required — tenant scoping, RBAC, sequence numbering, and Paystack signature verification are tested against mocks) |
| `pnpm test:integration` | Vitest integration tests against the real dev database (payment idempotency, plan unit-limit enforcement, platform summary, demo-request creation/rate-limiting/audit logging, Community tenant isolation and feature flows) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Architecture notes

- **Multi-tenancy**: shared database, `estateId` on every tenant-owned row. All reads/writes to tenant tables go through `scoped(estateId)` in `src/server/db/scoped.ts`, which injects `estateId` server-side into every query — it is structurally impossible to read or mutate another tenant's row through this API, regardless of client input. Platform-admin cross-tenant queries live only in `src/server/modules/platform/`.
- **RBAC**: `src/server/auth/permissions.ts` is a static, in-code map from the 7 roles to permissions. `requireEstatePermission()` in `src/server/auth/guards.ts` is the single choke point every Server Action/page uses — enforced server-side, never trusting client-hidden UI.
- **Auth**: Auth.js v5, Credentials provider, JWT sessions. Estate access is resolved fresh on every request from the URL's `estateSlug` + the caller's `EstateMember` row — a slug for an estate you're not a member of behaves identically to a slug that doesn't exist.
- **Billing**: one invoice = one charge (no multi-charge bundling). Creating a `Charge` immediately resolves its target scope (entire estate / blocks / streets / property types / selected properties) into `Invoice` rows for each targeted unit's current resident — see `createChargeAndGenerateInvoices` in `src/server/modules/billing/service.ts`. Invoice/receipt numbers are atomic per-estate sequences (`src/server/modules/sequence.ts`), safe under concurrent creation via Postgres's row-lock on the `EstateSequence` unique index.
- **Payments**: never trusted from the frontend. `applySuccessfulPayment()` is the single place a payment is ever marked successful — called only by the signature-verified Paystack webhook (`app/api/webhooks/paystack/route.ts`) or by Finance/Admin approving a manual bank-transfer record. It recomputes the invoice's status from the sum of all successful payments, issues a receipt, and writes an audit log, so both payment paths share identical behavior. Idempotent by design (`paystackReference` uniqueness + a status check) — proven in `src/server/modules/billing/__tests__/idempotency.integration.test.ts` against the real database.
- **Audit log**: every create/update on Estate, Property, Unit, Resident, Occupancy, Vehicle, Block/Street/Zone, Charge, Payment, and platform subscription-status changes writes an `AuditLog` row (actor, before/after JSON).
- **CSV import**: no file storage involved — a CSV is parsed client-side (`papaparse`) and the parsed rows travel through Server Actions as plain data. A **validate** action runs zod row-shape checks plus DB-backed checks (does this block/street/property exist? does this address already exist?) and returns every row annotated with its errors; the preview UI disables "Confirm Import" while any row has an error. **Confirm** re-validates from scratch server-side — the client's earlier pass is never trusted — then imports each row by calling the same `createProperty()` / `createResidentWithOccupancy()` / `addVehicle()` functions the manual "Add property"/"Add resident" forms use, so imported records get identical tenant scoping and audit logging for free. See `src/server/modules/imports/`.
- **Visitors & Gate Mode**: a `VisitorPass` carries the visitor's identity fields directly (one invite = one visit occasion — no separate reusable visitor profile). Its QR code encodes `estateId.passId.signature` (HMAC-SHA256 over `estateId.passId`, reusing `AUTH_SECRET`) — verifying recomputes the signature server-side, so a tampered or guessed id fails before any DB lookup (`src/server/modules/visitors/token.ts`). The 6-digit backup PIN's uniqueness is time-scoped (only checked against currently-valid passes), not a permanent DB constraint, so the 1,000,000-combination space never gets permanently exhausted. Gate Mode's verification input is a plain autofocused text field, not a camera — this matches how cheap-Android gate setups actually work in practice (a USB/Bluetooth barcode-scanner "gun" just types into whatever's focused) and needs no camera/decode dependency. A `GateEntry` is a separate row per pass-through-the-gate (not a field on the pass itself), so "visitors currently checked in" is a direct query and the same pass can be used for multiple entries/exits within its window. Security can force an "override" check-in on an invalid/expired pass with a required reason, audited as `visitor.override_checkin`.
- **Maintenance & vendors**: assignment fields (`assignedToUserId`, `vendorId`) live directly on `MaintenanceTicket` — no separate `WorkOrder` model, since nothing needs an assignment record with its own lifecycle independent of the ticket yet. `Vendor` is a directory entry `FACILITY_MANAGER` can attach for record-keeping, not a login — a vendor's own staff who need to see their assigned tickets are separate `User`s with `Role.VENDOR`. `MaintenanceComment` rows double as both the audit-style status-change log and the resident-visible progress timeline. "Overdue" uses a documented default SLA by priority (URGENT 24h / HIGH 72h / MEDIUM 7d / LOW 14d since creation, only while still `REPORTED`/`REVIEWED`) — not a real product policy, easy to make configurable later. When a ticket is marked `RESOLVED`, the resident's "Was your issue resolved?" answer either closes it or reopens it to `IN_PROGRESS` with their feedback visible to staff.
- **Utilities**: a utility bill *is* an `Invoice` — generating one from a meter reading creates a one-off `Charge` (for the audit/grouping record) plus a single `Invoice` for that unit's current resident, directly (not through the multi-unit charge-targeting resolution, since a reading is inherently for one specific unit). This means Paystack, manual bank-transfer recording, receipts, and the finance dashboard all work for utility bills with no extra code. `MeterReading.previousReading` auto-copies from the meter's last reading rather than being typed in each time; a meter's first-ever reading only establishes a baseline (no bill) since there's nothing yet to compare it against. A reading on a vacant unit is still recorded but generates no bill, surfaced to facility staff rather than silently dropped. Manual entry only — the schema doesn't assume how a reading arrives, so a future smart-meter feed would be a new reading-creation path, not a rewrite.
- **Public landing page**: `src/app/page.tsx` is a router, not just a page — it was already branching on auth state (platform admin → `/platform`, one estate → straight to its dashboard, multiple → an estate picker, no memberships → onboarding); the only change was giving its "no user" branch a real page (`src/app/LandingPage.tsx`) instead of an unconditional redirect to `/login`. Every other branch, and thus every pre-existing routing behavior, is unchanged. No pricing section — pricing is explicitly deferred (see below).
- **Platform super-admin portal**: `Plan` is deliberately simple — name, monthly/annual price, an optional `unitLimit` (`null` = unlimited), a free-text `featureSummary`, and an `isActive` flag for retiring old plans without deleting history. Nothing in the app enforces plan-gated functionality except `unitLimit`, checked in `createProperty()` (`src/server/modules/properties/service.ts`, pure logic factored out as `wouldExceedUnitLimit()` for unit testing) before its unit-creation transaction commits — an estate with no plan, or a plan with no cap, stays unlimited. There is no real platform billing/collection from estates: the dashboard's "Projected MRR" is just the sum of monthly plan prices across `ACTIVE` estates with a plan assigned, not an actual invoice — same deferred treatment as Paystack's live keys. Platform-level audit rows (plan changes, subscription status changes) are written with `estateId: null` since they're not scoped to one tenant, which also means they intentionally don't show up in an individual estate's own recent-activity list on its detail page.
- **Design tokens**: `src/app/globals.css` defines the brand palette as a Tailwind v4 `@theme` block (`--color-primary`, `--color-navy`, `--color-silver`, `--color-success/warning/danger/info`, `--color-background/surface/surface-muted/border/foreground/foreground-muted`) — each auto-generates `bg-*`/`text-*`/`border-*` utilities. Palette is charcoal/black + crisp white + a single disciplined red accent (`primary` = `#D71920`), color-mood inspired by premium financial-institution branding but an original proptech identity — no logo, layout, or trade dress copied from anywhere. Red is deliberately restrained to CTAs/active-states/attention-required values, never a general-purpose color; semantic status colors (success/warning/info, and the `INVOICE_STATUS_TONE`-style maps in `src/lib/statusTones.ts`) stay their own hues and are never repointed at brand red. `src/components/shared/ui.tsx` (Button/Card/Input/Select/Label/FormError/Badge) is the single place tokens are consumed, so nearly every page inherits the palette without its own color classes. Light-mode only by design — dark-mode values are pre-defined under an inert `:root[data-theme="dark"]` selector for a future toggle, but nothing sets that attribute today; surfaces meant to read as "premium dark" (platform-admin nav, the landing page hero/header) use the `navy`/`gradient-premium` tokens directly instead. The logo/favicon (`public/logo.svg`, `src/app/icon.svg`) is a single self-contained SVG mark — a charcoal rounded-square chip with a white house/roofline shape and a small red accent dot — chosen over a raster asset specifically so it can be authored as code; it carries its own background so it reads correctly on both light and dark surfaces without separate exports.
- **Request a Demo**: a public, unauthenticated `/request-demo` route — deliberately not routed through the existing `Notification`/`dispatchNotification()` machinery, since that system assumes a tenant `estateId` and a `residentId` neither of which exist for an anonymous prospect. `DemoRequest` is its own top-level model with real Postgres enum arrays (`ManagementMethod[]`, `ChallengeArea[]`, `FeatureInterest[]`) for its multi-select fields rather than a `Json` blob, matching the rest of the schema's enum conventions and making the admin list/filter UI possible without parsing. Reference numbers (`DEMO-000001`) come from a new `PlatformSequence` — a minimal atomic counter — rather than the existing `EstateSequence`, whose `estateId` is a required FK that a non-tenant concept can't satisfy without a schema hack. Spam/abuse protection is three layers, all built from what already exists (no new paid service): a honeypot field (silently no-ops, no DB write, no signal to the bot), a minimum-elapsed-time check (`isSubmittedTooFast()`), and a real DB-backed IP rate limit (`ipHash` — an HMAC-SHA256 of the request IP keyed by `AUTH_SECRET`, same secret-reuse pattern the visitor QR token already uses — never the raw IP). Both notification emails (`src/server/modules/demoRequests/email.ts`) are wrapped so a Resend outage or missing `RESEND_API_KEY`/`CUSTOMER_SERVICE_EMAIL` only skips the email (logged) — the database write that already happened is never rolled back or lost. Admin mutations (status, staff assignment, internal notes, recording a confirmed demo date) go through the same fetch-before → update → `recordAudit()` pattern as the rest of the platform module, so the audit log doubles as the "follow-up activity" history the spec asks for — no separate activity-log model. Internal notes are only ever queried on the `requirePlatformAdmin()`-gated detail page, never rendered anywhere a prospect could see them.
- **Community**: a private per-estate social layer under `/{estateSlug}/community` — Feed, Classifieds (including a Shortlets category and Lost & Found as a post type, not separate systems), Events, and a Moderation queue, gated by new `community-*` permissions in `src/server/auth/permissions.ts` and granted only to `RESIDENT`/`ESTATE_ADMIN`. All ~14 new tables go through `scoped()` like every other tenant table (`src/server/db/scoped.ts`), and every join-table mutator that's keyed by a client-supplied id (reacting/saving/reporting) explicitly re-validates the target belongs to the caller's estate before touching it — the compound unique key alone doesn't guarantee that, since it doesn't include `estateId`. Identity badges ("Verified Resident", "Verified Property Owner", "Verified Vendor", "Estate Management") are computed from existing `Occupancy`/`EstateMember` data in `src/server/modules/community/identity.ts` — no separate verification system. Official estate posts aren't duplicated into a community table — the Feed reads `Announcement` directly and interleaves it at query time. Moderation actions (hide/remove/suspend) reuse the existing `recordAudit()` rather than a new activity-log model. Photo uploads (`src/server/modules/storage/s3.ts`) are presigned-URL, direct-to-storage, and entirely optional — see `S3_ENDPOINT` above. `ESTATE_ADMIN` staff accounts typically have no linked `Resident` profile, so their Community nav entry goes straight to Moderation (which needs none) rather than the Feed (which does); an admin without a resident profile who navigates into Feed/Classifieds/Events directly will see a 404 rather than being able to post as themselves — a known, deliberate boundary, not a bug.
- **NidraQ Shortlet (Phase 1 — foundation)**: a separate operations module for shortlet/serviced-apartment operators, deliberately not merged into the residential Community/estate experience — own route tree (`/{estateSlug}/shortlet/**`), own nav/layout, own permission namespace (`shortlet-*`). Reuses `Estate`/`EstateMember`/RBAC/`scoped()`/`recordAudit()`/the S3 presigned-upload pattern/the per-estate sequence helper rather than a parallel tenant concept — a shortlet operator is still an `Estate`, its residential geography/resident tables just stay empty. Unlike Community, enabling Shortlet for an estate is **platform-admin controlled** (`ShortletSettings.enabled`, toggled from the estate's Platform Admin detail page) rather than a self-serve toggle — framed as a subscription entitlement. `ShortletProperty` → `ShortletUnit` mirrors the residential `Property` → `Unit` split exactly (a single-unit property still gets one auto-created unit), so `Reservation` always references a unit. `Guest` is deliberately its own model, not `Resident` — a shortlet guest isn't an estate resident. Double-booking is prevented with an application-level overlap check inside the reservation's create transaction (checked against both live reservations and `AvailabilityBlock` rows), matching this codebase's existing preference for enforcing this kind of invariant in code rather than a DB constraint. `Reservation.amountPaidMinor` is a plain, manually-editable field this phase — no `Payment` integration yet (Phase 2). Amounts are stored in "minor units" (kobo-equivalent) with a per-estate `defaultCurrency`/`defaultTimezone`, not hardcoded to Naira, since the module is architected for multiple countries/currencies from the start. Deferred to later phases (per the build's own phased spec): payments/check-in-out workflows/property-readiness (Phase 2), housekeeping/maintenance-integration/operational tasks (Phase 3), owners/expenses/management fees/reporting (Phase 4), the NidraQ-managed operations console (Phase 5).
- **Announcements & notifications**: `Notification` is deliberately not announcement-only — `announcementId` is nullable, so the same table/dispatcher can later carry a payment-confirmation or visitor-checked-in notification without a schema change; this is the shared multi-channel event system the original spec calls for, not an announcements-specific inbox. A small `NotificationChannel` interface (`src/server/modules/notifications/channels.ts`) has one real implementation, `InAppChannel` — for in-app, the `Notification` row itself *is* the delivery. `dispatchNotification()` (`dispatch.ts`) is the single place that decides which channels run for a given notification (today just `IN_APP`), so adding WhatsApp/SMS/email later means writing that channel class and adding one line there, not touching every call site that creates a notification. Unlike billing's owner-then-tenant-only targeting, an announcement reaches *every current occupant* of a targeted unit — owner, tenant, and household members alike, since a power-outage notice should reach everyone living there.

## What's mocked or deferred (not built yet)

- **Paystack live verification**: the initialize call and webhook handling are fully implemented (signature verification, idempotency), but need real Paystack test keys to exercise live — see `PAYSTACK_SECRET_KEY` above. Webhooks also can't reach `localhost`; use ngrok or Paystack's dashboard webhook-replay tool.
- **Outstanding-balances / opening-arrears CSV import**: deferred — importing historical arrears as invoices needs a design decision (a nullable `chargeId`, or an auto-created "Opening Balance" charge per import) that properties/residents import didn't need.
- **Meter-information CSV import**: no bulk import for meters yet — add them one at a time on `/utilities`.
- **CSV import update-in-place**: a row colliding with an existing record (same address, etc.) is flagged as an error and skipped, never overwritten. No bulk-update mode in this pass.
- **Live camera QR scanning**: Gate Mode accepts a scanned/typed code via a plain text input (works with barcode-scanner hardware or manual PIN entry) rather than `getUserMedia` + an in-browser QR decoder — a documented future enhancement, not needed for the core verification flow to work correctly.
- **Estate-wide visitor management for admins**: `ESTATE_ADMIN` has the `visitors:*` permission for this already, but there's no admin UI yet to view/revoke any resident's pass — only residents can see their own.
- **Maintenance photo/video attachments**: tickets ship with category, description, location, and priority — no file storage yet, same treatment as Paystack's live keys.
- **Maintenance SLA policy**: the priority-based overdue thresholds are a reasonable default, not a real product decision — no configuration UI to change them per estate yet.
- **Smart-meter / third-party utility integration**: meters and readings are manual-entry only by design — see the Utilities architecture note above for how an automated feed would plug in later.
- **Utility meter photo evidence**: not captured yet — same file-storage dependency as maintenance photos.
- **Email/SMS/WhatsApp notification delivery**: architected as the same `NotificationChannel` interface `InAppChannel` implements, but not built — needs provider credentials (SendGrid/Termii/WhatsApp Business API or similar), same treatment as Paystack's live keys. Only `IN_APP` is enabled today.
- **Other events wired into the notification dispatcher**: only announcements go through `dispatchNotification()` right now. Hooking in payment confirmations, visitor check-ins, or maintenance status changes is additive (call the same function from that event's service) but hasn't been done yet.
- **Estate-wide announcement management for non-admin staff**: only `ESTATE_ADMIN` has an authoring UI; other roles (Finance, Facility Manager) don't send announcements in this pass even though nothing in the permission model would prevent it.
- **Real platform billing/collection**: the `Plan` model and dashboard's projected MRR are configuration/estimate only — there's no actual invoicing or Paystack collection from estates for their subscription. A distinct future phase, same treatment as Paystack's live keys elsewhere.
- **Per-feature plan entitlements**: `unitLimit` is the only plan attribute with real enforcement; `featureSummary` is descriptive text only, not a machine-checked entitlement engine.
- **Landing page pricing**: the landing page intentionally has no pricing section — see the platform-portal note above on why real pricing/billing is still deferred.
- **Printable/PDF receipts**: receipts exist as data (receipt number, issued date) shown inline on the invoice; a dedicated printable/PDF view is a later nice-to-have.
- **Phone/OTP login**: only email+password exists; the Credentials provider is structured so this is additive, not a rewrite.
- **Rate limiting, upload hardening, CSP**: flagged as TODO — real work starts once file uploads (maintenance/meter photos) are introduced.
- **Outstanding-balances CSV import**: still deferred from Phase 2/CSV import — see above.
- **Demo-request emails without real credentials**: `RESEND_API_KEY`, `EMAIL_FROM`, and a verified sending domain in Resend are all needed for the customer-service and prospect confirmation emails to actually send — without them, submissions still save (see the Request a Demo architecture note above), but no email goes out.
- **CAPTCHA on the demo-request form**: the honeypot + timing-check + DB-backed IP rate limit are real, functioning defenses, but a dedicated CAPTCHA/Turnstile provider would be a stronger layer if spam volume ever warrants it — not added now to avoid an unnecessary new paid dependency for a launch-stage feature.
- **Community photos without real S3 credentials**: `S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` are all needed for the photo picker to appear — without them, posts and listings work fully as text-only.
- **Community Groups**: the nav tab exists (spec calls it out as "future-ready") but only shows a "coming soon" message — no group data model was built.
- **Polls**: not built this pass — not in the MVP scope agreed for this phase.
- **A dedicated Services Marketplace model**: services are handled as a Classifieds category plus Feed recommendation posts, not a separate business-listing system with paid/verified-business distinctions.
- **Real in-app threaded messaging**: "Message Seller" is a one-shot inquiry (a `ListingInquiry` row the seller reads on their own listing), not a conversation thread — no messaging infrastructure exists in NidraQ yet to reuse.
- **Community notification preferences**: comment/reaction/RSVP/listing-inquiry events don't send notifications yet — the existing `Notification`/`dispatchNotification()` system assumes an `announcementId`-shaped event and would need a small, deliberate extension (a nullable `communityPostId`-style FK, mirroring how `announcementId` already works) to support this without duplicating the notification system.
- **Community analytics dashboard**: no dedicated reporting view yet — the platform/estate dashboards don't surface Community engagement metrics.
- **Full classified-listing editing**: sellers can transition status (active/reserved/sold/removed) but can't edit a listing's other fields after posting — relist as a new listing instead.
- **Commercial/monetization controls**: featured listings, promoted posts, verified-business profiles, and any NidraQ transaction fee are explicitly deferred — the data model doesn't preclude adding them, but nothing was built.

## Roadmap

1. ~~Foundation~~ — architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/units, residents.
2. ~~Billing & payments~~ — charges, invoice generation, Paystack + manual payments, receipts, finance dashboard.
3. ~~CSV import~~ — bulk import for properties/units and residents/occupancy/vehicles.
4. ~~Visitors & Gate Mode~~ — QR/PIN visitor passes, security check-in/out, override with reason.
5. ~~Maintenance & vendor workflow~~ — tickets, assignment, status workflow, vendor directory, resident confirmation.
6. ~~Utilities~~ — manual meter management, consumption-based billing reusing the existing Invoice/Payment pipeline.
7. ~~Announcements & notifications~~ — targeted announcements, in-app notification inbox, multi-channel dispatch architecture.
8. ~~Platform super-admin portal~~ — platform dashboard, plans/pricing config with enforced unit limits, estate detail (status + plan assignment + trial tracking), cross-tenant audit and user views.
9. ~~Public landing page~~ — marketing page for signed-out visitors, feature highlights, trust/architecture section.
10. ~~Request a Demo~~ — public multi-step demo-request form, database record with a unique reference, customer-service + prospect confirmation emails via Resend, Super Admin triage queue with filters/status/assignment/notes.
11. ~~Community~~ — private per-estate social feed, classifieds (incl. shortlets), Lost & Found, basic events, and moderation. **(this phase)**
12. Outstanding-balances import.
