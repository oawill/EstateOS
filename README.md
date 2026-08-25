# EstateOS

The operating system for modern Nigerian estates. Multi-tenant SaaS for estate management: billing, payments, visitors, security, maintenance, utilities, and announcements — one platform per estate, isolated by tenant.

This is **Phase 1 + Phase 2 + CSV import**: architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/residents management, the core billing/payments loop (charges → invoices → payment → receipt), and bulk CSV import for properties and residents. Visitors, maintenance, and utilities are later phases (see [Roadmap](#roadmap)).

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
| `pnpm test:integration` | Vitest integration tests against the real dev database (payment idempotency) |
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

## What's mocked or deferred (not built yet)

- **Paystack live verification**: the initialize call and webhook handling are fully implemented (signature verification, idempotency), but need real Paystack test keys to exercise live — see `PAYSTACK_SECRET_KEY` above. Webhooks also can't reach `localhost`; use ngrok or Paystack's dashboard webhook-replay tool.
- **Outstanding-balances / opening-arrears CSV import**: deferred — importing historical arrears as invoices needs a design decision (a nullable `chargeId`, or an auto-created "Opening Balance" charge per import) that properties/residents import didn't need.
- **Meter-information import**: nothing to import into yet — no utilities module.
- **CSV import update-in-place**: a row colliding with an existing record (same address, etc.) is flagged as an error and skipped, never overwritten. No bulk-update mode in this pass.
- **Visitors & Gate Mode** (Phase 3): QR/PIN generation, security check-in/out.
- **Maintenance & utilities** (Phase 3): tickets, vendor work orders, meter readings.
- **Announcements & notifications** (Phase 3): the `notifications` table and multi-channel (WhatsApp/SMS/email) dispatch don't exist yet.
- **Platform super-admin billing** (Phase 4): plans/pricing config, platform revenue.
- **Landing page** (Phase 4).
- **Printable/PDF receipts**: receipts exist as data (receipt number, issued date) shown inline on the invoice; a dedicated printable/PDF view is a later nice-to-have.
- **Phone/OTP login**: only email+password exists; the Credentials provider is structured so this is additive, not a rewrite.
- **Rate limiting, upload hardening, CSP**: flagged as TODO — real work starts once Phase 3 introduces public forms and file uploads.

## Roadmap

1. ~~Foundation~~ — architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/units, residents.
2. ~~Billing & payments~~ — charges, invoice generation, Paystack + manual payments, receipts, finance dashboard.
3. ~~CSV import~~ — bulk import for properties/units and residents/occupancy/vehicles. **(this phase)**
4. Outstanding-balances import, then visitors/Gate Mode, maintenance & vendor workflow, utilities, announcements/notifications.
5. Platform super-admin portal (subscriptions/pricing), public landing page.
