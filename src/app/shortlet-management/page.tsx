import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/shared/ui";
import { StatusPill, MiniStat, GuestAvatar, PropertyImage, BookingJourney, BuildingIcon, ArrivalIcon, DepartureIcon, GuestsIcon, TurnoverIcon } from "@/app/dashboard/shortlets/ui";

export const metadata: Metadata = {
  title: "NidraQ Shortlet Management | Bookings, Guests & Owner Earnings",
  description:
    "NidraQ Shortlet Management gives individual hosts, diaspora owners, shortlet companies and serviced-apartment operators one platform for bookings, guests, payments, check-ins, cleaning, maintenance and owner earnings.",
};

const SUBNAV = [
  { href: "#overview", label: "Overview" },
  { href: "#features", label: "Features" },
  { href: "#owners", label: "Owners" },
  { href: "#operators", label: "Operators" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "/request-demo", label: "Demo" },
] as const;

const OPERATOR_AUDIENCES = [
  {
    title: "Individual Shortlet Owners",
    body: "Manage bookings, guests, payments, cleaning and property performance without spreadsheets or scattered WhatsApp messages.",
    icon: <BuildingIcon />,
  },
  {
    title: "Diaspora Owners",
    body: "See bookings, revenue, expenses, maintenance and what is happening at your Nigerian property from anywhere in the world.",
    icon: <GuestsIcon />,
  },
  {
    title: "Shortlet Managers",
    body: "Run multiple properties and owners from one dashboard — bookings, turnovers, maintenance and owner statements included.",
    icon: <ArrivalIcon />,
  },
  {
    title: "Serviced Apartment Companies",
    body: "Operate an entire portfolio of furnished apartments with centralized calendars, guest operations and financial reporting.",
    icon: <TurnoverIcon />,
  },
] as const;

const CORE_FEATURES = [
  { title: "Booking Management", body: "Direct, phone, WhatsApp and future channel bookings in one workspace." },
  { title: "Availability Calendar", body: "One calendar per property, and one portfolio view across all of them." },
  { title: "Guest Management", body: "A dedicated guest profile — never confused with a long-term tenant." },
  { title: "Payments", body: "Deposits, balances, refunds and full payment history per booking." },
  { title: "Check-In & Check-Out", body: "Guided steps that record who, when and the unit's condition." },
  { title: "Housekeeping", body: "Every checkout starts a turnover — nothing goes live dirty." },
  { title: "Turnover Management", body: "Cleaning, inspection and readiness, tracked stage by stage." },
  { title: "Maintenance", body: "Guest-reported issues flow into the same maintenance workflow as every NidraQ module." },
  { title: "Security Deposits", body: "Held, reviewed and refunded separately from booking revenue." },
  { title: "Owner Statements", body: "Revenue, expenses and management fees, reconciled and transparent." },
  { title: "Revenue Analytics", body: "Occupancy, average nightly rate and revenue by property." },
  { title: "Multi-Property Management", body: "One operator, many owners, properties and units — one login." },
] as const;

const BOOKING_SAMPLE = [
  { name: "Tolu Adeyemi", property: "Lekki Pearl Residence", dates: "Sep 16 – Sep 20", status: "CHECKED_IN", amount: "₦615,000" },
  { name: "Michael A.", property: "Ikoyi Waterfront Suite", dates: "Sep 19 – Sep 23", status: "CONFIRMED", amount: "₦895,000" },
  { name: "Chiamaka N.", property: "Maitama Executive Apartment", dates: "Sep 22 – Sep 26", status: "AWAITING_PAYMENT", amount: "₦535,000" },
] as const;

const CALENDAR_PROPERTIES = ["Lekki Pearl Residence", "Ikoyi Waterfront Suite", "Maitama Executive Apartment", "Victoria Island City Loft"] as const;
// A small illustrative pattern per property — for demonstration only, not live data.
const CALENDAR_PATTERNS: Record<string, ("available" | "booked" | "pending" | "blocked" | "owner")[]> = {
  "Lekki Pearl Residence": ["available", "available", "booked", "booked", "booked", "booked", "available", "available", "pending", "pending", "available", "available"],
  "Ikoyi Waterfront Suite": ["booked", "booked", "booked", "booked", "booked", "available", "available", "available", "booked", "booked", "booked", "owner"],
  "Maitama Executive Apartment": ["available", "blocked", "blocked", "available", "available", "booked", "booked", "booked", "booked", "available", "available", "available"],
  "Victoria Island City Loft": ["available", "available", "available", "pending", "pending", "booked", "booked", "booked", "available", "available", "blocked", "blocked"],
};
const CALENDAR_DAY_STYLES: Record<string, string> = {
  available: "bg-surface-muted",
  booked: "bg-primary",
  pending: "bg-warning",
  blocked: "bg-foreground-muted/40",
  owner: "bg-info",
};

const CHANNELS = [
  { label: "Direct", live: true },
  { label: "WhatsApp", live: true },
  { label: "Phone", live: true },
  { label: "NidraQ", live: true },
  { label: "Airbnb", live: false },
  { label: "Booking.com", live: false },
] as const;

export default function ShortletManagementPage() {
  return (
    <main className="shortlet-scope flex-1 bg-background">
      <LandingHeader />

      <div className="sticky top-0 z-20 hidden border-b border-border bg-surface/95 backdrop-blur sm:block">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5 text-sm font-medium text-foreground-muted" aria-label="Shortlet Management sections">
          {SUBNAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </a>
          ))}
          <Link href="/signup" className="ml-auto">
            <Button type="button" className="px-3 py-1.5 text-sm">
              Get Started
            </Button>
          </Link>
        </nav>
      </div>

      {/* ============================== HERO ============================== */}
      <section id="overview" className="bg-[linear-gradient(135deg,var(--color-navy)_0%,var(--color-navy-deep)_100%)] text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">A NidraQ Product</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">NidraQ Shortlet Management</h1>
            <p className="mt-4 max-w-lg text-white/80">
              Run your entire shortlet business from one place — bookings, guests, payments, check-ins, cleaning,
              maintenance and owner earnings.
            </p>
            <p className="mt-3 max-w-lg text-sm text-white/60">
              Built for Nigerian shortlet owners, serviced apartments, property managers and professional operators.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button type="button">Get Started</Button>
              </Link>
              <Link href="/request-demo">
                <Button type="button" variant="secondary">
                  Request a Demo
                </Button>
              </Link>
              <a href="#features" className="text-sm font-medium text-white/70 hover:text-white">
                Explore Features →
              </a>
            </div>
          </div>

          {/* Command Center preview — same visual language as the real /dashboard/shortlets home. */}
          <div className="animate-rise rounded-2xl border border-white/10 bg-surface p-5 text-foreground shadow-2xl sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Revenue This Month</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">₦4,850,000</p>
            <p className="mt-1 text-sm font-medium text-success">▲ 12.4% vs last month</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Occupancy" value="78%" />
              <MiniStat label="Arrivals Today" value={3} />
              <MiniStat label="Departures Today" value={2} />
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Upcoming Bookings</p>
              {BOOKING_SAMPLE.slice(0, 2).map((b) => (
                <div key={b.name} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <GuestAvatar name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="truncate text-xs text-foreground-muted">{b.property}</p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BUILT FOR SHORTLET OPERATORS ==================== */}
      <section id="owners" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Built for every kind of shortlet operator</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {OPERATOR_AUDIENCES.map((a) => (
            <div
              key={a.title}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                {a.icon}
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== SHOW THE PRODUCT ==================== */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything happening across your shortlets.
            <br className="hidden sm:block" /> One dashboard.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-foreground-muted">
            This is the actual NidraQ Shortlet command center — not a mockup of features that don&apos;t exist yet.
          </p>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface-muted px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-foreground-muted">dashboard.nidraq.com/shortlets</span>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Revenue This Month</p>
                  <p className="mt-1 text-2xl font-semibold">₦4.85M</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MiniStat label="Occupancy" value="78%" />
                  <MiniStat label="Bookings" value={24} />
                  <MiniStat label="Avg. Nightly Rate" value="₦142K" />
                  <MiniStat label="Available Nights" value={37} />
                </div>
              </div>
              <div className="lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Today</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ArrivalIcon />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-none">3</p>
                      <p className="text-[11px] text-foreground-muted">Arrivals</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <DepartureIcon />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-none">2</p>
                      <p className="text-[11px] text-foreground-muted">Departures</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <TurnoverIcon />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-none">2</p>
                      <p className="text-[11px] text-foreground-muted">Turnovers</p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Needs Attention</p>
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
                    <p className="font-medium">Cleaning Not Completed</p>
                    <p className="text-xs text-foreground-muted">Maitama Residence · guest arrives in 3 hours</p>
                  </div>
                  <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
                    <p className="font-medium">Payment Outstanding</p>
                    <p className="text-xs text-foreground-muted">Lekki Pearl Apartment · ₦250,000 outstanding</p>
                  </div>
                  <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
                    <p className="font-medium">Maintenance Blocking Booking</p>
                    <p className="text-xs text-foreground-muted">Victoria Island Suite · AC repair outstanding</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BOOKINGS ==================== */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bookings without the chaos.</h2>
            <p className="mt-3 text-foreground-muted">
              Manage direct, phone, WhatsApp and future channel bookings from one organized workspace.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-foreground-muted">
              {["Unified booking calendar", "Guest details", "Payment status", "Booking history", "Availability management", "Double-booking prevention"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1 text-xs font-medium">
              {["Upcoming", "Currently Staying", "Awaiting Payment", "Completed"].map((v, i) => (
                <span key={v} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${i === 0 ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`}>
                  {v}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {BOOKING_SAMPLE.map((b) => (
                <div key={b.name} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <GuestAvatar name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="truncate text-xs text-foreground-muted">
                      {b.property} · {b.dates}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill status={b.status} />
                    <p className="mt-1 text-sm font-semibold">{b.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CALENDAR ==================== */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">See your entire business on one calendar.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-foreground-muted">
            {[
              { state: "booked", label: "Confirmed / Guest Staying" },
              { state: "pending", label: "Pending" },
              { state: "owner", label: "Owner Stay" },
              { state: "blocked", label: "Maintenance / Blocked" },
              { state: "available", label: "Available" },
            ].map((l) => (
              <span key={l.state} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${CALENDAR_DAY_STYLES[l.state]}`} aria-hidden />
                {l.label}
              </span>
            ))}
          </div>
          <div className="mx-auto mt-6 max-w-4xl overflow-x-auto rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="min-w-[560px] space-y-3">
              {CALENDAR_PROPERTIES.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <p className="w-40 shrink-0 truncate text-sm font-medium">{p}</p>
                  <div className="flex flex-1 gap-0.5">
                    {CALENDAR_PATTERNS[p].map((state, i) => (
                      <span key={i} className={`h-6 flex-1 rounded-sm ${CALENDAR_DAY_STYLES[state]}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-foreground-muted">Illustrative preview — your calendar reflects your own properties and bookings.</p>
        </div>
      </section>

      {/* ==================== OWNER FINANCIAL VISIBILITY ==================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Know exactly what your shortlets are earning.</h2>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-foreground-muted">
              {["Revenue by property", "Occupancy", "Booking income", "Expenses", "Management fees", "Owner statements", "Payment tracking"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span className="text-foreground-muted">Gross Booking Revenue</span>
                <span className="font-medium">₦5,200,000</span>
              </p>
              <p className="flex justify-between">
                <span className="text-foreground-muted">Operating Expenses</span>
                <span className="font-medium text-danger">−₦430,000</span>
              </p>
              <p className="flex justify-between border-b border-border pb-2">
                <span className="text-foreground-muted">Management Fees</span>
                <span className="font-medium text-danger">−₦520,000</span>
              </p>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Net Owner Earnings</p>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-success">₦4,250,000</p>
            </div>
            <Link href="/request-demo" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              View Statement →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== OPERATIONS ==================== */}
      <section id="how-it-works" className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">From checkout to the next guest — stay ready.</h2>
          <div className="mt-10 flex justify-center">
            <BookingJourney status="CHECKED_OUT" isPaid={true} />
          </div>
          <p className="mx-auto mt-2 max-w-md text-center text-xs text-foreground-muted">
            Guest Checks Out → Cleaning Assigned → Turnover Checklist → Inspection → Unit Ready → Next Guest Checks In
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {["Housekeeping", "Turnovers", "Before/After Photos", "Maintenance", "Damage Reporting", "Security Deposits"].map((f) => (
              <div key={f} className="rounded-xl border border-border bg-surface p-4 text-center text-sm font-medium">
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== DIASPORA ==================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Own in Nigeria.
              <br /> Manage from anywhere.
            </h2>
            <p className="mt-4 max-w-md text-foreground-muted">
              Whether you&apos;re in London, Atlanta, Toronto or anywhere else, NidraQ gives you visibility into what
              is happening at your shortlet property.
            </p>
            <Link href="/dashboard/shortlets" className="mt-6 inline-block">
              <Button type="button">Explore Owner Dashboard</Button>
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <PropertyImage alt="Lekki Pearl Residence" className="h-32 w-full" />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Lekki Pearl Residence</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Currently</span>
                  <span className="font-medium">Guest Staying</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Checkout</span>
                  <span className="font-medium">September 18</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Next Booking</span>
                  <span className="font-medium">September 20</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Latest Cleaning</span>
                  <span className="font-medium text-success">Completed ✓</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Latest Inspection</span>
                  <span className="font-medium text-success">Passed ✓</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Open Maintenance</span>
                  <span className="font-medium text-success">None ✓</span>
                </p>
                <p className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>September Revenue</span>
                  <span>₦1.85M</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GUEST EXPERIENCE ==================== */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">A better experience for your guests too.</h2>
              <p className="mt-4 max-w-md text-foreground-muted">
                A lightweight, mobile-first guest experience — guests never have to navigate the full NidraQ
                platform to find what they need.
              </p>
            </div>
            <div className="order-1 flex justify-center lg:order-2">
              <div className="w-64 rounded-[2rem] border-8 border-navy bg-surface p-3 shadow-xl">
                <div className="rounded-2xl bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">My Stay</p>
                  <p className="mt-1 text-sm font-semibold">Lekki Pearl Residence</p>
                  <p className="text-xs text-foreground-muted">NQB-2026-000184 · Sep 16 – Sep 20</p>
                  <div className="mt-4 space-y-1.5">
                    {["Directions", "Check-In Instructions", "Wi-Fi", "House Rules", "Contact Host", "Request Service", "Report a Problem", "Check-Out"].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs font-medium">
                        {item}
                        <span aria-hidden>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MULTI-PROPERTY OPERATORS ==================== */}
      <section id="operators" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Built to grow with your portfolio.</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-foreground-muted">
          One operator can manage multiple owners, properties and units without creating separate systems.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { n: "1", label: "Property" },
            { n: "10", label: "Properties" },
            { n: "50", label: "Properties" },
            { n: "100+", label: "Units" },
          ].map((s) => (
            <div key={`${s.n}-${s.label}`} className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
              <p className="text-3xl font-semibold tracking-tight text-primary">{s.n}</p>
              <p className="mt-1 text-sm text-foreground-muted">{s.label}</p>
            </div>
          ))}
        </div>
        <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground-muted sm:grid-cols-3">
          {["Portfolio dashboard", "Property-level reporting", "Owner statements", "Role-based staff access", "Housekeeping assignments", "Maintenance management"].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* ==================== CORE FEATURES ==================== */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Everything you need, nothing you don&apos;t</h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {CORE_FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CHANNELS ==================== */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One operation. Multiple booking sources.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {CHANNELS.map((c) => (
            <span
              key={c.label}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${c.live ? "border-border bg-surface text-foreground" : "border-dashed border-border bg-surface-muted text-foreground-muted"}`}
            >
              {c.label}
              {!c.live && <span className="ml-1.5 text-[10px] uppercase tracking-wide">planned</span>}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-md text-xs text-foreground-muted">
          Airbnb and Booking.com integrations are not live today — channel integration is ready, with external
          channel support planned.
        </p>
      </section>

      {/* ==================== ESTATE CONNECTION ==================== */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Shortlet inside a managed estate?</h2>
          <p className="mt-3 text-foreground-muted">Connect Shortlet Management with NidraQ Estate Management.</p>
          <div className="mx-auto mt-8 flex max-w-xs flex-col items-center gap-2 text-sm font-medium">
            {["Confirmed Booking", "Temporary Guest Access", "Gate / Security", "Check-In", "Stay", "Access Expires at Checkout"].map((step, i, arr) => (
              <div key={step} className="w-full">
                <div className="rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">{step}</div>
                {i < arr.length - 1 && <div className="mx-auto my-1 h-4 w-px bg-border" aria-hidden />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="bg-[linear-gradient(135deg,var(--color-navy)_0%,var(--color-navy-deep)_100%)] py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run your shortlet like a business.</h2>
          <p className="mt-3 text-white/70">Bookings, guests, operations and earnings — all in one place.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button type="button">Get Started</Button>
            </Link>
            <Link href="/request-demo">
              <Button type="button" variant="secondary">
                Request a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
