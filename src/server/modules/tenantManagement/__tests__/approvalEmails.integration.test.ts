import { describe, expect, it } from "vitest";
import { buildApprovalRequestEmail, buildDecisionEmail, notifyManagersOfDecision, notifyOwnerOfApproval } from "../approvalEmails";

const facts = { propertyName: "Palm Court", vendorName: "ABC Cooling", description: "Compressor", amountMinor: 27_500_000 };

describe("owner approval emails", () => {
  it("tells the owner the amount, property and where to decide", () => {
    const mail = buildApprovalRequestEmail(facts, "new");
    expect(mail.subject).toContain("Palm Court");
    expect(mail.text).toContain("ABC Cooling");
    expect(mail.text).toContain("/owner/approvals");
    expect(buildApprovalRequestEmail(facts, "answered").text).toContain("answered your question");
  });

  it("tells managers the decision and includes the owner's note", () => {
    expect(buildDecisionEmail(facts, "APPROVE", null).subject).toContain("approved");
    const rejected = buildDecisionEmail(facts, "REJECT", "Too expensive");
    expect(rejected.subject).toContain("rejected");
    expect(rejected.text).toContain("Too expensive");
    expect(buildDecisionEmail(facts, "REQUEST_INFO", "Another quote?").subject).toContain("question");
  });

  it("never throws, even for an expense that does not exist", async () => {
    await expect(notifyOwnerOfApproval("does-not-exist", "new")).resolves.toBeUndefined();
    await expect(notifyManagersOfDecision("does-not-exist", "APPROVE", null)).resolves.toBeUndefined();
  });
});
