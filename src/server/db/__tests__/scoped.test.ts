import { describe, expect, it, vi } from "vitest";
import { makeScopedDelegate, TenantScopeError } from "../scoped";

/**
 * These tests exercise the tenant-scoping factory directly against a fake
 * Prisma delegate — no database needed — to prove the property that
 * matters most: estateId is injected server-side into every query, so a
 * caller can never read or mutate another tenant's row through this API,
 * regardless of what `where`/`data` it passes in.
 */
function fakeDelegate(rows: Array<{ id: string; estateId: string; [key: string]: unknown }>) {
  return {
    findMany: vi.fn(async (args: { where?: Record<string, unknown> }) =>
      rows.filter((r) => Object.entries(args.where ?? {}).every(([k, v]) => r[k] === v)),
    ),
    findFirst: vi.fn(async (args: { where?: Record<string, unknown> }) =>
      rows.find((r) => Object.entries(args.where ?? {}).every(([k, v]) => r[k] === v)) ?? null,
    ),
    create: vi.fn(async (args: { data: Record<string, unknown> }) => {
      const row = { id: "new-id", ...args.data } as { id: string; estateId: string };
      rows.push(row);
      return row;
    }),
    updateMany: vi.fn(async (args: { where?: Record<string, unknown> }) => {
      const count = rows.filter((r) => Object.entries(args.where ?? {}).every(([k, v]) => r[k] === v)).length;
      return { count };
    }),
    deleteMany: vi.fn(async (args: { where?: Record<string, unknown> }) => {
      const count = rows.filter((r) => Object.entries(args.where ?? {}).every(([k, v]) => r[k] === v)).length;
      return { count };
    }),
  };
}

describe("scoped tenant isolation", () => {
  it("only returns rows belonging to the given estate, ignoring a spoofed where clause", async () => {
    const rows = [
      { id: "1", estateId: "estate-a", name: "Mine" },
      { id: "2", estateId: "estate-b", name: "Not mine" },
    ];
    const delegate = fakeDelegate(rows);
    const scoped = makeScopedDelegate(delegate, "Block", "estate-a");

    // Even if a caller tried to widen the where clause to another estate,
    // the injected estateId always wins because it's spread in last.
    const result = await scoped.findMany({ where: { estateId: "estate-b" } as never });
    expect(result).toEqual([rows[0]]);
  });

  it("findById never returns a record from a different estate", async () => {
    const rows = [{ id: "shared-id", estateId: "estate-b", name: "Other tenant's row" }];
    const delegate = fakeDelegate(rows);
    const scoped = makeScopedDelegate(delegate, "Block", "estate-a");

    const result = await scoped.findById("shared-id");
    expect(result).toBeNull();
  });

  it("create always attaches the caller's estateId, overriding any data.estateId supplied", async () => {
    const rows: Array<{ id: string; estateId: string }> = [];
    const delegate = fakeDelegate(rows);
    const scoped = makeScopedDelegate(delegate, "Block", "estate-a");

    await scoped.create({ name: "New block", estateId: "estate-b" } as never);
    expect(rows[0].estateId).toBe("estate-a");
  });

  it("update throws TenantScopeError instead of silently updating another tenant's row", async () => {
    const rows = [{ id: "1", estateId: "estate-b", name: "Not mine" }];
    const delegate = fakeDelegate(rows);
    const scoped = makeScopedDelegate(delegate, "Block", "estate-a");

    await expect(scoped.update("1", { name: "Hijacked" } as never)).rejects.toThrow(TenantScopeError);
  });

  it("remove throws TenantScopeError instead of silently deleting another tenant's row", async () => {
    const rows = [{ id: "1", estateId: "estate-b", name: "Not mine" }];
    const delegate = fakeDelegate(rows);
    const scoped = makeScopedDelegate(delegate, "Block", "estate-a");

    await expect(scoped.remove("1")).rejects.toThrow(TenantScopeError);
  });
});
