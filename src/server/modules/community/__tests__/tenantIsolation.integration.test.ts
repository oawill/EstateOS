import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { scoped, TenantScopeError } from "@/server/db/scoped";
import { createPost, toggleReaction, toggleSavedPost } from "../posts";
import { createListing, toggleSavedListing } from "../classifieds";
import { createReport } from "../moderation";

/**
 * Spec §19: every community record must be tenant-scoped server-side, and
 * a request from Estate A for Estate B content must return not-found, not
 * leak data. This exercises both the generic scoped() delegate wiring and
 * the hand-written cross-reference checks in posts.ts/classifieds.ts/
 * moderation.ts (toggleReaction/toggleSavedPost/toggleSavedListing/
 * createReport all validate their target belongs to the caller's estate
 * before touching a join table keyed only by resident+target ids).
 */
describe("Community tenant isolation (integration)", () => {
  let estateAId: string;
  let estateBId: string;
  let residentAId: string;
  let residentBId: string;
  let userAId: string;
  let userBId: string;
  let categoryAId: string;

  beforeAll(async () => {
    const estateA = await prisma.estate.create({ data: { name: "Isolation Test A", slug: `iso-a-${randomUUID()}` } });
    const estateB = await prisma.estate.create({ data: { name: "Isolation Test B", slug: `iso-b-${randomUUID()}` } });
    estateAId = estateA.id;
    estateBId = estateB.id;

    const userA = await prisma.user.create({ data: { name: "Resident A", email: `iso-a-${randomUUID()}@example.com` } });
    const userB = await prisma.user.create({ data: { name: "Resident B", email: `iso-b-${randomUUID()}@example.com` } });
    userAId = userA.id;
    userBId = userB.id;

    const residentA = await prisma.resident.create({ data: { estateId: estateAId, userId: userAId, firstName: "A", lastName: "Resident" } });
    const residentB = await prisma.resident.create({ data: { estateId: estateBId, userId: userBId, firstName: "B", lastName: "Resident" } });
    residentAId = residentA.id;
    residentBId = residentB.id;

    const categoryA = await prisma.classifiedCategory.create({ data: { estateId: estateAId, key: "FOR_SALE", label: "For Sale" } });
    categoryAId = categoryA.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateAId } });
    await prisma.estate.delete({ where: { id: estateBId } });
    await prisma.user.delete({ where: { id: userAId } });
    await prisma.user.delete({ where: { id: userBId } });
  });

  it("scoped() findMany/findById never returns another estate's post, and update() throws for a cross-estate id", async () => {
    const post = await createPost(estateAId, residentAId, { postType: "TEXT", body: "Estate A only" });

    const bPosts = await scoped(estateBId).communityPost.findMany();
    expect(bPosts.find((p) => p.id === post.id)).toBeUndefined();

    const foundFromB = await scoped(estateBId).communityPost.findById(post.id);
    expect(foundFromB).toBeNull();

    await expect(scoped(estateBId).communityPost.update(post.id, { body: "hijacked" })).rejects.toThrow(TenantScopeError);
  });

  it("scoped() isolation holds for classified listings too", async () => {
    const listing = await createListing(estateAId, residentAId, {
      categoryId: categoryAId,
      title: "Estate A sofa",
      description: "Only visible in estate A",
      contactMethods: ["IN_APP"],
    });

    const bListings = await scoped(estateBId).classifiedListing.findMany();
    expect(bListings.find((l) => l.id === listing.id)).toBeUndefined();
    expect(await scoped(estateBId).classifiedListing.findById(listing.id)).toBeNull();
  });

  it("toggleReaction rejects a post id that belongs to a different estate", async () => {
    const post = await createPost(estateAId, residentAId, { postType: "TEXT", body: "Estate A post for reaction test" });

    await expect(toggleReaction(estateBId, residentBId, { postId: post.id })).rejects.toThrow(/not found/i);

    const reactionsOnPost = await prisma.communityReaction.findMany({ where: { postId: post.id } });
    expect(reactionsOnPost).toHaveLength(0);
  });

  it("toggleSavedPost rejects a post id that belongs to a different estate", async () => {
    const post = await createPost(estateAId, residentAId, { postType: "TEXT", body: "Estate A post for save test" });

    await expect(toggleSavedPost(estateBId, residentBId, post.id)).rejects.toThrow(/not found/i);

    const saved = await prisma.communitySavedPost.findMany({ where: { postId: post.id } });
    expect(saved).toHaveLength(0);
  });

  it("toggleSavedListing rejects a listing id that belongs to a different estate", async () => {
    const listing = await createListing(estateAId, residentAId, {
      categoryId: categoryAId,
      title: "Estate A chair",
      description: "Only visible in estate A",
      contactMethods: ["IN_APP"],
    });

    await expect(toggleSavedListing(estateBId, residentBId, listing.id)).rejects.toThrow(/not found/i);

    const saved = await prisma.communitySavedListing.findMany({ where: { listingId: listing.id } });
    expect(saved).toHaveLength(0);
  });

  it("createReport rejects a targetId that belongs to a different estate", async () => {
    const post = await createPost(estateAId, residentAId, { postType: "TEXT", body: "Estate A post for report test" });

    await expect(
      createReport(estateBId, residentBId, { targetType: "POST", targetId: post.id, reason: "SPAM" }),
    ).rejects.toThrow(/not found/i);

    const reports = await prisma.communityReport.findMany({ where: { targetId: post.id } });
    expect(reports).toHaveLength(0);
  });
});
