import { describe, expect, it } from "vitest";
import { getDisplayIdentity, type IdentitySourceResident } from "../identity";

function makeResident(overrides: Partial<IdentitySourceResident> = {}): IdentitySourceResident {
  return {
    firstName: "Adebayo",
    lastName: "Adewale",
    communityDisplayNamePreference: null,
    occupancies: [],
    user: null,
    ...overrides,
  };
}

describe("getDisplayIdentity", () => {
  it("uses first-name + last-initial by default", () => {
    const identity = getDisplayIdentity(makeResident(), "FIRST_NAME_LAST_INITIAL");
    expect(identity.name).toBe("Adebayo A.");
  });

  it("uses the full name when the estate default is FULL_NAME", () => {
    const identity = getDisplayIdentity(makeResident(), "FULL_NAME");
    expect(identity.name).toBe("Adebayo Adewale");
  });

  it("a resident's own preference overrides the estate default", () => {
    const identity = getDisplayIdentity(
      makeResident({ communityDisplayNamePreference: "FULL_NAME" }),
      "FIRST_NAME_LAST_INITIAL",
    );
    expect(identity.name).toBe("Adebayo Adewale");
  });

  it("every resident gets the Verified Resident badge", () => {
    const identity = getDisplayIdentity(makeResident(), "FULL_NAME");
    expect(identity.badges).toContain("Verified Resident");
  });

  it("adds Verified Property Owner only for a current OWNER occupancy", () => {
    const owner = getDisplayIdentity(
      makeResident({ occupancies: [{ role: "OWNER", isCurrent: true }] }),
      "FULL_NAME",
    );
    expect(owner.badges).toContain("Verified Property Owner");

    const pastOwner = getDisplayIdentity(
      makeResident({ occupancies: [{ role: "OWNER", isCurrent: false }] }),
      "FULL_NAME",
    );
    expect(pastOwner.badges).not.toContain("Verified Property Owner");

    const tenant = getDisplayIdentity(
      makeResident({ occupancies: [{ role: "TENANT", isCurrent: true }] }),
      "FULL_NAME",
    );
    expect(tenant.badges).not.toContain("Verified Property Owner");
  });

  it("adds Verified Vendor only for an active VENDOR membership", () => {
    const vendor = getDisplayIdentity(
      makeResident({ user: { memberships: [{ role: "VENDOR", isActive: true }] } }),
      "FULL_NAME",
    );
    expect(vendor.badges).toContain("Verified Vendor");

    const inactiveVendor = getDisplayIdentity(
      makeResident({ user: { memberships: [{ role: "VENDOR", isActive: false }] } }),
      "FULL_NAME",
    );
    expect(inactiveVendor.badges).not.toContain("Verified Vendor");
  });

  it("adds Estate Management only for an active ESTATE_ADMIN membership", () => {
    const admin = getDisplayIdentity(
      makeResident({ user: { memberships: [{ role: "ESTATE_ADMIN", isActive: true }] } }),
      "FULL_NAME",
    );
    expect(admin.badges).toContain("Estate Management");
  });

  it("a resident can hold multiple badges at once", () => {
    const identity = getDisplayIdentity(
      makeResident({
        occupancies: [{ role: "OWNER", isCurrent: true }],
        user: { memberships: [{ role: "ESTATE_ADMIN", isActive: true }] },
      }),
      "FULL_NAME",
    );
    expect(identity.badges).toEqual(["Verified Resident", "Verified Property Owner", "Estate Management"]);
  });
});
