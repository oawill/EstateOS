import { scoped } from "@/server/db/scoped";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { nextPlatformSequenceNumber } from "@/server/modules/demoRequests/sequence";
import type { SecurityIncidentCategory, SecurityIncidentSeverity, SecurityIncidentStatus } from "@prisma/client";

/** Reference format "NQS-2026-000184" — year-scoped so the counter resets each calendar year, same pattern as every other NidraQ reference number. */
async function nextIncidentNumber(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `security_incident_${year}`);
  return `NQS-${year}-${String(value).padStart(6, "0")}`;
}

export interface CreateIncidentInput {
  category: SecurityIncidentCategory;
  severity: SecurityIncidentSeverity;
  description: string;
  location?: string;
}

export async function createIncident(estateId: string, actorUserId: string, input: CreateIncidentInput) {
  const incidentNumber = await nextIncidentNumber();

  const incident = await scoped(estateId).securityIncident.create({
    incidentNumber,
    category: input.category,
    severity: input.severity,
    description: input.description,
    location: input.location || null,
    reportedByUserId: actorUserId,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "security_incident.created",
    entityType: "SecurityIncident",
    entityId: incident.id,
    after: incident,
  });

  return incident;
}

export async function listIncidents(estateId: string, filter?: { status?: SecurityIncidentStatus }) {
  return scoped(estateId).securityIncident.findMany({
    where: filter?.status ? ({ status: filter.status } as never) : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getIncident(estateId: string, incidentId: string) {
  const incident = await scoped(estateId).securityIncident.findById(incidentId);
  if (!incident) throw new NotFoundError("Security incident");
  return incident;
}

/** Status only ever moves forward through a fixed workflow — never deleted, and every transition is audited so the history stays intact even if a status is later corrected. */
export async function transitionIncident(estateId: string, actorUserId: string, incidentId: string, status: SecurityIncidentStatus) {
  const incident = await getIncident(estateId, incidentId);
  const updated = await scoped(estateId).securityIncident.update(incidentId, { status });

  await recordAudit({
    estateId,
    actorUserId,
    action: "security_incident.status_changed",
    entityType: "SecurityIncident",
    entityId: incidentId,
    before: { status: incident.status },
    after: { status: updated.status },
  });

  return updated;
}
