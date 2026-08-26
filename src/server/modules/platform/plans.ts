import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CreatePlanInput } from "./plansSchema";

export async function listPlans() {
  return prisma.plan.findMany({ orderBy: { monthlyPriceKobo: "asc" } });
}

export async function createPlan(actorUserId: string, input: CreatePlanInput) {
  const plan = await prisma.plan.create({
    data: {
      name: input.name,
      monthlyPriceKobo: input.monthlyPriceKobo,
      annualPriceKobo: input.annualPriceKobo ?? null,
      unitLimit: input.unitLimit ?? null,
      featureSummary: input.featureSummary || null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "plan.created",
    entityType: "Plan",
    entityId: plan.id,
    after: plan,
  });

  return plan;
}

export async function setPlanActive(actorUserId: string, planId: string, isActive: boolean) {
  const before = await prisma.plan.findUnique({ where: { id: planId } });
  if (!before) throw new NotFoundError("Plan");

  const after = await prisma.plan.update({ where: { id: planId }, data: { isActive } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: isActive ? "plan.activated" : "plan.deactivated",
    entityType: "Plan",
    entityId: planId,
    before,
    after,
  });

  return after;
}
