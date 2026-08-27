import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { addComment, createPost, getPost, toggleReaction } from "../posts";
import { createListing, getListing, toggleSavedListing, updateListingStatus } from "../classifieds";
import { createEvent, setRsvp, summarizeRsvps } from "../events";
import { createReport, resolveReport } from "../moderation";
import { listClassifiedCategories } from "../settings";

describe("Community feature flows (integration)", () => {
  let estateId: string;
  let residentId: string;
  let residentUserId: string;
  let moderatorUserId: string;
  let categoryId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Community Flow Test", slug: `community-flow-${randomUUID()}` } });
    estateId = estate.id;

    const residentUser = await prisma.user.create({ data: { name: "Flow Resident", email: `flow-resident-${randomUUID()}@example.com` } });
    residentUserId = residentUser.id;
    const resident = await prisma.resident.create({ data: { estateId, userId: residentUserId, firstName: "Flow", lastName: "Resident" } });
    residentId = resident.id;

    const moderator = await prisma.user.create({ data: { name: "Flow Moderator", email: `flow-mod-${randomUUID()}@example.com`, isPlatformAdmin: false } });
    moderatorUserId = moderator.id;

    const categories = await listClassifiedCategories(estateId, true);
    categoryId = categories[0].id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: residentUserId } });
    await prisma.user.delete({ where: { id: moderatorUserId } });
  });

  it("post -> comment -> reaction round-trip", async () => {
    const post = await createPost(estateId, residentId, { postType: "QUESTION", body: "Anyone know a good plumber?" });
    await addComment(estateId, post.id, residentId, "Try Emeka Electrical — great work.");
    const reaction = await toggleReaction(estateId, residentId, { postId: post.id });
    expect(reaction.reacted).toBe(true);

    const fetched = await getPost(estateId, post.id);
    expect(fetched.comments).toHaveLength(1);
    expect(fetched.reactions).toHaveLength(1);

    const unreaction = await toggleReaction(estateId, residentId, { postId: post.id });
    expect(unreaction.reacted).toBe(false);
  });

  it("listing creation -> save -> mark sold round-trip", async () => {
    const listing = await createListing(estateId, residentId, {
      categoryId,
      title: "Samsung 65\" TV",
      description: "Used, excellent condition",
      priceKobo: 65_000_00,
      negotiable: true,
      contactMethods: ["WHATSAPP"],
      whatsappNumber: "+2348000000000",
    });
    expect(listing.status).toBe("ACTIVE");

    const saveResult = await toggleSavedListing(estateId, residentId, listing.id);
    expect(saveResult.saved).toBe(true);

    const updated = await updateListingStatus(estateId, residentId, listing.id, "SOLD");
    expect(updated.status).toBe("SOLD");

    const fetched = await getListing(estateId, listing.id);
    expect(fetched.status).toBe("SOLD");
  });

  it("event RSVP counts", async () => {
    const event = await createEvent(estateId, residentId, { title: "Estate Cleanup", eventDate: new Date("2026-09-10") });
    await setRsvp(estateId, residentId, event.id, "GOING");

    const secondResidentUser = await prisma.user.create({ data: { name: "Second Resident", email: `flow-second-${randomUUID()}@example.com` } });
    const secondResident = await prisma.resident.create({ data: { estateId, userId: secondResidentUser.id, firstName: "Second", lastName: "Resident" } });
    await setRsvp(estateId, secondResident.id, event.id, "INTERESTED");

    const rsvps = await prisma.eventRsvp.findMany({ where: { eventId: event.id } });
    const counts = summarizeRsvps(rsvps);
    expect(counts).toEqual({ going: 1, interested: 1, notGoing: 0 });

    await prisma.resident.delete({ where: { id: secondResident.id } });
    await prisma.user.delete({ where: { id: secondResidentUser.id } });
  });

  it("report -> moderation resolve -> audit log round-trip", async () => {
    const post = await createPost(estateId, residentId, { postType: "TEXT", body: "Reported for testing" });
    const report = await createReport(estateId, residentId, { targetType: "POST", targetId: post.id, reason: "SPAM" });
    expect(report.status).toBe("OPEN");

    const resolved = await resolveReport(estateId, moderatorUserId, report.id, { action: "HIDE" });
    expect(resolved.status).toBe("ACTIONED");

    const hiddenPost = await prisma.communityPost.findUnique({ where: { id: post.id } });
    expect(hiddenPost?.moderationStatus).toBe("HIDDEN");

    const auditRow = await prisma.auditLog.findFirst({
      where: { entityType: "CommunityReport", entityId: report.id, action: "community.report_resolved" },
    });
    expect(auditRow).not.toBeNull();
    expect(auditRow?.estateId).toBe(estateId);
    expect(auditRow?.actorUserId).toBe(moderatorUserId);

    const contentAuditRow = await prisma.auditLog.findFirst({
      where: { entityType: "CommunityPost", entityId: post.id, action: "community.content_hidden" },
    });
    expect(contentAuditRow).not.toBeNull();
  });
});
