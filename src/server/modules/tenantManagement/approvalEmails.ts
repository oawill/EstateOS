import { Resend } from "resend";
import { prisma } from "@/server/db/client";
import { formatNaira } from "@/lib/utils";

// Best-effort email for the owner approval flow. Same Resend pattern as the
// other emails: with no RESEND_API_KEY it logs and skips, and a failed send
// never blocks or rolls back the approval itself.

export interface ApprovalEmailFacts {
  propertyName: string;
  vendorName: string;
  description: string;
  amountMinor: number;
}

function baseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export function buildApprovalRequestEmail(facts: ApprovalEmailFacts, kind: "new" | "answered") {
  const lead = kind === "new" ? "A maintenance expense is waiting for your approval." : "The property manager has answered your question. The expense is waiting for your decision again.";
  return {
    subject: `Approval needed: ${formatNaira(facts.amountMinor)} at ${facts.propertyName}`,
    text: `${lead}

Property: ${facts.propertyName}
Vendor: ${facts.vendorName}
Work: ${facts.description}
Amount: ${formatNaira(facts.amountMinor)}

Review and decide: ${baseUrl()}/owner/approvals
`,
  };
}

export function buildDecisionEmail(facts: ApprovalEmailFacts, decision: "APPROVE" | "REJECT" | "REQUEST_INFO", note: string | null) {
  const outcome = decision === "APPROVE" ? "approved" : decision === "REJECT" ? "rejected" : "asked a question about";
  return {
    subject: `Owner ${decision === "REQUEST_INFO" ? "question" : decision === "APPROVE" ? "approved" : "rejected"}: ${facts.vendorName} at ${facts.propertyName}`,
    text: `The owner has ${outcome} this expense.

Property: ${facts.propertyName}
Vendor: ${facts.vendorName}
Work: ${facts.description}
Amount: ${formatNaira(facts.amountMinor)}
${note ? `\nOwner's note: ${note}\n` : ""}
Open maintenance: ${baseUrl()}/dashboard/tenants/maintenance
`,
  };
}

async function send(to: string[], message: { subject: string; text: string }) {
  const recipients = Array.from(new Set(to.filter(Boolean)));
  if (recipients.length === 0) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[tenantManagement/approvalEmails] RESEND_API_KEY not configured — skipping "${message.subject}"`);
    return;
  }
  try {
    const result = await new Resend(apiKey).emails.send({ from: process.env.EMAIL_FROM ?? "NidraQ <onboarding@resend.dev>", to: recipients, ...message });
    if (result.error) console.error("[tenantManagement/approvalEmails] Resend rejected email:", result.error);
  } catch (error) {
    console.error("[tenantManagement/approvalEmails] Failed to send email:", error);
  }
}

async function loadExpense(expenseId: string) {
  return prisma.maintenanceExpense.findUnique({
    where: { id: expenseId },
    include: { request: { include: { property: { include: { owner: { include: { user: { select: { email: true } } } }, managers: { include: { user: { select: { email: true } } } } } } } } },
  });
}

function factsOf(expense: NonNullable<Awaited<ReturnType<typeof loadExpense>>>): ApprovalEmailFacts {
  return {
    propertyName: expense.request.property.name,
    vendorName: expense.vendorName,
    description: expense.description,
    amountMinor: expense.finalAmountMinor ?? expense.approvedAmountMinor ?? expense.estimateMinor ?? 0,
  };
}

/** Tells the owner an expense needs their decision (new, or returned after the manager answered). */
export async function notifyOwnerOfApproval(expenseId: string, kind: "new" | "answered") {
  try {
    const expense = await loadExpense(expenseId);
    if (!expense) return;
    const owner = expense.request.property.owner;
    await send([owner.email ?? owner.user?.email ?? ""], buildApprovalRequestEmail(factsOf(expense), kind));
  } catch (error) {
    console.error("[tenantManagement/approvalEmails] notifyOwnerOfApproval failed:", error);
  }
}

/** Tells the property's managers what the owner decided. */
export async function notifyManagersOfDecision(expenseId: string, decision: "APPROVE" | "REJECT" | "REQUEST_INFO", note: string | null) {
  try {
    const expense = await loadExpense(expenseId);
    if (!expense) return;
    const emails = expense.request.property.managers.map((m) => m.user.email ?? "");
    await send(emails, buildDecisionEmail(factsOf(expense), decision, note));
  } catch (error) {
    console.error("[tenantManagement/approvalEmails] notifyManagersOfDecision failed:", error);
  }
}
