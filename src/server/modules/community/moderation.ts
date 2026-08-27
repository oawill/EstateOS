import { Prisma, type CommunityReportReason, type CommunityReportTargetType, type CommunityVisibility } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";

const reportWithReporter = Prisma.validator<Prisma.CommunityReportDefaultArgs>()({
  include: { reporter: true },
});
type CommunityReportWithReporter = Prisma.CommunityReportGetPayload<typeof reportWithReporter>;

async function findTarget(estateId: string, targetType: CommunityReportTargetType, targetId: string) {
  if (targetType === "POST") return scoped(estateId).communityPost.findById(targetId);
  if (targetType === "COMMENT") return scoped(estateId).communityComment.findById(targetId);
  return scoped(estateId).classifiedListing.findById(targetId);
}

export async function createReport(
  estateId: string,
  reporterResidentId: string,
  input: { targetType: CommunityReportTargetType; targetId: string; reason: CommunityReportReason; details?: string },
) {
  const target = await findTarget(estateId, input.targetType, input.targetId);
  if (!target) throw new NotFoundError("Reported content");

  return scoped(estateId).communityReport.create({
    reporterResidentId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    details: input.details,
  });
}

export interface ReportFilters {
  status?: "OPEN" | "REVIEWED" | "ACTIONED" | "DISMISSED";
  targetType?: CommunityReportTargetType;
}

export async function listReports(estateId: string, filters: ReportFilters = {}) {
  return scoped(estateId).communityReport.findMany<CommunityReportWithReporter>({
    where: { status: filters.status, targetType: filters.targetType },
    orderBy: { createdAt: "desc" },
    include: reportWithReporter.include,
  });
}

async function setContentVisibility(
  estateId: string,
  actorUserId: string,
  targetType: CommunityReportTargetType,
  targetId: string,
  moderationStatus: CommunityVisibility,
) {
  const before = await findTarget(estateId, targetType, targetId);
  if (!before) throw new NotFoundError("Content");

  const after =
    targetType === "POST"
      ? await scoped(estateId).communityPost.update(targetId, { moderationStatus })
      : targetType === "COMMENT"
        ? await scoped(estateId).communityComment.update(targetId, { moderationStatus })
        : await scoped(estateId).classifiedListing.update(targetId, { moderationStatus });

  await recordAudit({
    estateId,
    actorUserId,
    action: moderationStatus === "REMOVED" ? "community.content_removed" : "community.content_hidden",
    entityType: targetType === "POST" ? "CommunityPost" : targetType === "COMMENT" ? "CommunityComment" : "ClassifiedListing",
    entityId: targetId,
    before,
    after,
  });

  return after;
}

export async function resolveReport(
  estateId: string,
  moderatorUserId: string,
  reportId: string,
  resolution: { action: "HIDE" | "REMOVE" | "DISMISS"; notes?: string },
) {
  const report = await scoped(estateId).communityReport.findById(reportId);
  if (!report) throw new NotFoundError("Report");

  if (resolution.action !== "DISMISS") {
    await setContentVisibility(estateId, moderatorUserId, report.targetType, report.targetId, resolution.action === "REMOVE" ? "REMOVED" : "HIDDEN");
  }

  const status = resolution.action === "DISMISS" ? "DISMISSED" : "ACTIONED";
  const after = await scoped(estateId).communityReport.update(reportId, {
    status,
    resolvedAt: new Date(),
    resolvedByUserId: moderatorUserId,
  });

  await recordAudit({
    estateId,
    actorUserId: moderatorUserId,
    action: "community.report_resolved",
    entityType: "CommunityReport",
    entityId: reportId,
    before: report,
    after,
  });

  return after;
}

export async function suspendResidentPosting(estateId: string, moderatorUserId: string, residentId: string, reason: string) {
  const before = await scoped(estateId).resident.findById(residentId);
  if (!before) throw new NotFoundError("Resident");

  const after = await scoped(estateId).resident.update(residentId, {
    communitySuspendedAt: new Date(),
    communitySuspendedReason: reason,
  });

  await recordAudit({
    estateId,
    actorUserId: moderatorUserId,
    action: "community.resident_suspended",
    entityType: "Resident",
    entityId: residentId,
    before,
    after,
  });

  return after;
}

export async function unsuspendResidentPosting(estateId: string, moderatorUserId: string, residentId: string) {
  const before = await scoped(estateId).resident.findById(residentId);
  if (!before) throw new NotFoundError("Resident");

  const after = await scoped(estateId).resident.update(residentId, {
    communitySuspendedAt: null,
    communitySuspendedReason: null,
  });

  await recordAudit({
    estateId,
    actorUserId: moderatorUserId,
    action: "community.resident_unsuspended",
    entityType: "Resident",
    entityId: residentId,
    before,
    after,
  });

  return after;
}

export async function listSuspendedResidents(estateId: string) {
  return prisma.resident.findMany({
    where: { estateId, communitySuspendedAt: { not: null } },
    orderBy: { communitySuspendedAt: "desc" },
  });
}
