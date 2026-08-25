# EstateOS

The operating system for modern Nigerian estates. Multi-tenant SaaS for estate management: billing, payments, visitors, security, maintenance, utilities, and announcements — one platform per estate, isolated by tenant.

This is **Phase 1**: architecture, auth, multi-tenancy, RBAC, estate onboarding, and properties/residents management. Billing, payments, visitors, maintenance, and utilities are later phases (see [Roadmap](#roadmap)).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS 4**
- **PostgreSQL** via **Prisma 7** (driver-adapter model — see `src/server/db/client.ts`)
- **Auth.js v5** (Credentials provider, JWT sessions)
- **Vitest** for unit tests

## Local setup

### 1. Database

You need a local PostgreSQL instance (native install or Docker). Create a dedicated role and database:

```bash
psql -U postgres -c "CREATE ROLE estateos WITH LOGIN PASSWORD 'yourpassword' CREATEDB; CREATE DATABASE estateos OWNER estateos;"
```

`CREATEDB` is required because `prisma migrate dev` creates a temporary shadow database to compute migrations.

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
| `pnpm test` | Vitest unit tests (no DB required — tenant scoping and RBAC are tested against mocks) |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Architecture notes

- **Multi-tenancy**: shared database, `estateId` on every tenant-owned row. All reads/writes to tenant tables go through `scoped(estateId)` in `src/server/db/scoped.ts`, which injects `estateId` server-side into every query — it is structurally impossible to read or mutate another tenant's row through this API, regardless of client input. Platform-admin cross-tenant queries live only in `src/server/modules/platform/`.
- **RBAC**: `src/server/auth/permissions.ts` is a static, in-code map from the 7 roles to permissions. `requireEstatePermission()` in `src/server/auth/guards.ts` is the single choke point every Server Action/page uses — enforced server-side, never trusting client-hidden UI.
- **Auth**: Auth.js v5, Credentials provider, JWT sessions. Estate access is resolved fresh on every request from the URL's `estateSlug` + the caller's `EstateMember` row — a slug for an estate you're not a member of behaves identically to a slug that doesn't exist.
- **Audit log**: every create/update on Estate, Property, Unit, Resident, Occupancy, Vehicle, Block/Street/Zone, and platform subscription-status changes writes an `AuditLog` row (actor, before/after JSON).

## What's mocked or deferred (not built yet)

- **Billing/payments** (Phase 2): charges, invoices, Paystack integration, receipts, finance dashboard, CSV import.
- **Visitors & Gate Mode** (Phase 3): QR/PIN generation, security check-in/out.
- **Maintenance & utilities** (Phase 3): tickets, vendor work orders, meter readings.
- **Announcements & notifications** (Phase 3): the `notifications` table and multi-channel (WhatsApp/SMS/email) dispatch don't exist yet.
- **Platform super-admin billing** (Phase 4): plans/pricing config, platform revenue.
- **Landing page** (Phase 4).
- **Phone/OTP login**: only email+password exists; the Credentials provider is structured so this is additive, not a rewrite.
- **Rate limiting, upload hardening, CSP**: flagged as TODO — real work starts once Phase 2/3 introduce public forms and file uploads.

## Roadmap

1. ~~Foundation~~ — architecture, auth, multi-tenancy, RBAC, estate onboarding, properties/units, residents. **(this phase)**
2. Billing & payments — charges, invoices, Paystack, receipts, finance dashboard, CSV import.
3. Visitors/Gate Mode, maintenance & vendor workflow, utilities, announcements/notifications.
4. Platform super-admin portal (subscriptions/pricing), public landing page.
