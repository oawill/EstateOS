# EstateOS

The operating system for modern Nigerian estates. Multi-tenant SaaS for estate management: billing, payments, visitors, security, maintenance, utilities, and announcements — one platform per estate, isolated by tenant.

This is **Phase 1 + Phase 2 + CSV import + Visitors/Gate Mode + Maintenance & vendors + Utilities + Announcements & notifications + Platform super-admin portal**: architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/residents management, the core billing/payments loop (charges → invoices → payment → receipt), bulk CSV import, visitor management (QR/PIN passes, gate check-in/out), the maintenance workflow (report → assign → resolve → confirm), manual utility meter billing, estate announcements with an in-app notification inbox, and a platform super-admin portal (estate dashboard, plans/pricing config with enforced unit limits, cross-tenant audit and user views). The public landing page is next (see [Roadmap](#roadmap)).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS 4**
- **PostgreSQL** via **Prisma 7** (driver-adapter model — see `src/server/db/client.ts`)
- **Auth.js v5** (Credentials provider, JWT sessions)
- **Paystack** (card/bank transfer/USSD) + manual bank-transfer recording, for payments
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
| `pnpm test:integration` | Vitest integration tests against the real dev database (payment idempotency, plan unit-limit enforcement, platform summary) |
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
- **Platform super-admin portal**: `Plan` is deliberately simple — name, monthly/annual price, an optional `unitLimit` (`null` = unlimited), a free-text `featureSummary`, and an `isActive` flag for retiring old plans without deleting history. Nothing in the app enforces plan-gated functionality except `unitLimit`, checked in `createProperty()` (`src/server/modules/properties/service.ts`, pure logic factored out as `wouldExceedUnitLimit()` for unit testing) before its unit-creation transaction commits — an estate with no plan, or a plan with no cap, stays unlimited. There is no real platform billing/collection from estates: the dashboard's "Projected MRR" is just the sum of monthly plan prices across `ACTIVE` estates with a plan assigned, not an actual invoice — same deferred treatment as Paystack's live keys. Platform-level audit rows (plan changes, subscription status changes) are written with `estateId: null` since they're not scoped to one tenant, which also means they intentionally don't show up in an individual estate's own recent-activity list on its detail page.
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
- **Landing page** (next phase).
- **Printable/PDF receipts**: receipts exist as data (receipt number, issued date) shown inline on the invoice; a dedicated printable/PDF view is a later nice-to-have.
- **Phone/OTP login**: only email+password exists; the Credentials provider is structured so this is additive, not a rewrite.
- **Rate limiting, upload hardening, CSP**: flagged as TODO — real work starts once file uploads (maintenance/meter photos) are introduced.
- **Outstanding-balances CSV import**: still deferred from Phase 2/CSV import — see above.

## Roadmap

1. ~~Foundation~~ — architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/units, residents.
2. ~~Billing & payments~~ — charges, invoice generation, Paystack + manual payments, receipts, finance dashboard.
3. ~~CSV import~~ — bulk import for properties/units and residents/occupancy/vehicles.
4. ~~Visitors & Gate Mode~~ — QR/PIN visitor passes, security check-in/out, override with reason.
5. ~~Maintenance & vendor workflow~~ — tickets, assignment, status workflow, vendor directory, resident confirmation.
6. ~~Utilities~~ — manual meter management, consumption-based billing reusing the existing Invoice/Payment pipeline.
7. ~~Announcements & notifications~~ — targeted announcements, in-app notification inbox, multi-channel dispatch architecture.
8. ~~Platform super-admin portal~~ — platform dashboard, plans/pricing config with enforced unit limits, estate detail (status + plan assignment + trial tracking), cross-tenant audit and user views. **(this phase)**
9. Public landing page, outstanding-balances import.
