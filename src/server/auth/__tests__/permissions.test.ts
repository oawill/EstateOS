import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { hasPermission } from "../permissions";

describe("RBAC permission map", () => {
  it("SECURITY can verify visitors and use the gate, but has no billing access", () => {
    expect(hasPermission(Role.SECURITY, "visitors:verify")).toBe(true);
    expect(hasPermission(Role.SECURITY, "gate:*")).toBe(true);
    expect(hasPermission(Role.SECURITY, "vehicles:read")).toBe(true);

    expect(hasPermission(Role.SECURITY, "invoices:*")).toBe(false);
    expect(hasPermission(Role.SECURITY, "payments:*")).toBe(false);
    expect(hasPermission(Role.SECURITY, "receipts:*")).toBe(false);
    expect(hasPermission(Role.SECURITY, "residents:*")).toBe(false);
  });

  it("RESIDENT is confined to their own-* permissions and can't manage the estate", () => {
    expect(hasPermission(Role.RESIDENT, "own-bills:read")).toBe(true);
    expect(hasPermission(Role.RESIDENT, "own-visitors:*")).toBe(true);
    expect(hasPermission(Role.RESIDENT, "properties:*")).toBe(false);
    expect(hasPermission(Role.RESIDENT, "members:*")).toBe(false);
  });

  it("VENDOR can only touch assigned work orders", () => {
    expect(hasPermission(Role.VENDOR, "assigned-workorders:read")).toBe(true);
    expect(hasPermission(Role.VENDOR, "assigned-workorders:update")).toBe(true);
    expect(hasPermission(Role.VENDOR, "workorders:*")).toBe(false);
    expect(hasPermission(Role.VENDOR, "vendors:*")).toBe(false);
  });

  it("ESTATE_ADMIN has full estate-scoped access but not platform access", () => {
    expect(hasPermission(Role.ESTATE_ADMIN, "properties:*")).toBe(true);
    expect(hasPermission(Role.ESTATE_ADMIN, "residents:*")).toBe(true);
    expect(hasPermission(Role.ESTATE_ADMIN, "billing:*")).toBe(true);
    expect(hasPermission(Role.ESTATE_ADMIN, "platform:*")).toBe(false);
  });

  it("PLATFORM_SUPER_ADMIN has platform:* but not estate-tenant-shaped permissions", () => {
    expect(hasPermission(Role.PLATFORM_SUPER_ADMIN, "platform:*")).toBe(true);
    expect(hasPermission(Role.PLATFORM_SUPER_ADMIN, "residents:*")).toBe(false);
    expect(hasPermission(Role.PLATFORM_SUPER_ADMIN, "invoices:*")).toBe(false);
  });

  it("a wildcard grant covers every action on its resource but no other resource", () => {
    expect(hasPermission(Role.FINANCE, "charges:*")).toBe(true);
    expect(hasPermission(Role.FINANCE, "reports:read")).toBe(true);
    expect(hasPermission(Role.FINANCE, "maintenance:*")).toBe(false);
  });
});
