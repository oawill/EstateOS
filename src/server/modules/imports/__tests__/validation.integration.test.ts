import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { validatePropertyRows, validateResidentRows } from "../service";

describe("CSV import validation (integration)", () => {
  let estateId: string;
  let blockId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Import Test Estate", slug: `import-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const block = await prisma.block.create({ data: { estateId, name: "Block A" } });
    blockId = block.id;

    await prisma.property.create({
      data: {
        estateId,
        blockId,
        addressLabel: "Existing House",
        propertyType: "DETACHED_HOUSE",
        units: { create: { estateId, label: "" } },
      },
    });
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
  });

  describe("validatePropertyRows", () => {
    it("passes a valid row with no block/street", async () => {
      const [row] = await validatePropertyRows(estateId, [
        { addressLabel: "New House", propertyType: "DETACHED_HOUSE", blockName: "", streetName: "", unitLabels: "" },
      ]);
      expect(row.errors).toEqual([]);
    });

    it("passes a valid row referencing an existing block", async () => {
      const [row] = await validatePropertyRows(estateId, [
        { addressLabel: "Another House", propertyType: "DETACHED_HOUSE", blockName: "Block A", streetName: "", unitLabels: "" },
      ]);
      expect(row.errors).toEqual([]);
    });

    it("errors when a required field is missing", async () => {
      const [row] = await validatePropertyRows(estateId, [
        { addressLabel: "", propertyType: "DETACHED_HOUSE", blockName: "", streetName: "", unitLabels: "" },
      ]);
      expect(row.errors.length).toBeGreaterThan(0);
    });

    it("errors on an unknown block name rather than silently accepting it", async () => {
      const [row] = await validatePropertyRows(estateId, [
        { addressLabel: "New House 2", propertyType: "DETACHED_HOUSE", blockName: "Nonexistent Block", streetName: "", unitLabels: "" },
      ]);
      expect(row.errors.some((e) => e.includes("Nonexistent Block"))).toBe(true);
    });

    it("errors on a duplicate address label that already exists", async () => {
      const [row] = await validatePropertyRows(estateId, [
        { addressLabel: "Existing House", propertyType: "DETACHED_HOUSE", blockName: "", streetName: "", unitLabels: "" },
      ]);
      expect(row.errors.some((e) => e.includes("already exists"))).toBe(true);
    });

    it("errors when the same address label appears twice in one file", async () => {
      const rows = await validatePropertyRows(estateId, [
        { addressLabel: "Brand New House", propertyType: "DETACHED_HOUSE", blockName: "", streetName: "", unitLabels: "" },
        { addressLabel: "Brand New House", propertyType: "DETACHED_HOUSE", blockName: "", streetName: "", unitLabels: "" },
      ]);
      expect(rows[0].errors).toEqual([]);
      expect(rows[1].errors.some((e) => e.includes("more than once"))).toBe(true);
    });
  });

  describe("validateResidentRows", () => {
    it("errors when the referenced property doesn't exist", async () => {
      const [row] = await validateResidentRows(estateId, [
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "",
          phone: "",
          propertyAddressLabel: "Nonexistent Address",
          unitLabel: "",
          occupancyRole: "OWNER",
          moveInDate: "2024-01-01",
          emergencyContactName: "",
          emergencyContactPhone: "",
          vehiclePlateNumber: "",
        },
      ]);
      expect(row.errors.some((e) => e.includes("No property found"))).toBe(true);
    });

    it("passes when the referenced property and unit exist", async () => {
      const [row] = await validateResidentRows(estateId, [
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "",
          phone: "",
          propertyAddressLabel: "Existing House",
          unitLabel: "",
          occupancyRole: "OWNER",
          moveInDate: "2024-01-01",
          emergencyContactName: "",
          emergencyContactPhone: "",
          vehiclePlateNumber: "",
        },
      ]);
      expect(row.errors).toEqual([]);
    });
  });
});
