"use client";

import { useActionState, useState } from "react";
import { Badge, Button, Card, FormError, Textarea } from "@/components/shared/ui";
import { decideAction, type ApprovalActionState } from "./actions";

export interface ApprovalView {
  id: string;
  title: string;
  property: string;
  unit: string;
  vendorName: string;
  amountLabel: string;
  requestedOn: string;
  comments: { id: string; role: string; author: string; body: string }[];
}

const initialState: ApprovalActionState = {};

function DecisionForm({ id, decision, amountLabel, onCancel }: { id: string; decision: "APPROVE" | "REJECT" | "REQUEST_INFO"; amountLabel: string; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(decideAction.bind(null, id, decision), initialState);
  const needsNote = decision !== "APPROVE";

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg bg-surface-muted p-3">
      <FormError message={state.error} />
      {decision === "APPROVE" && <p className="text-sm font-medium">Confirm: approve spending {amountLabel}?</p>}
      <Textarea name="note" rows={2} required={needsNote} placeholder={needsNote ? (decision === "REJECT" ? "Why are you rejecting this?" : "What would you like to know?") : "Add a note (optional)"} />
      <div className="flex gap-2">
        <Button type="submit" variant={decision === "REJECT" ? "danger" : "primary"} disabled={pending}>
          {pending ? "Saving…" : decision === "APPROVE" ? `Yes, approve ${amountLabel}` : decision === "REJECT" ? "Confirm rejection" : "Send question"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}

/** Material financial actions take two steps — choose, then confirm — so a stray tap can't spend the owner's money. */
export function ApprovalCard({ approval }: { approval: ApprovalView }) {
  const [mode, setMode] = useState<"APPROVE" | "REJECT" | "REQUEST_INFO" | null>(null);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{approval.title}</p>
          <p className="mt-0.5 text-sm text-foreground-muted">
            {approval.property} · {approval.unit}
          </p>
          <p className="mt-0.5 text-sm text-foreground-muted">Vendor: {approval.vendorName}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">Requested {approval.requestedOn}</p>
        </div>
        <Badge tone="warning">{approval.amountLabel}</Badge>
      </div>

      {approval.comments.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {approval.comments.map((c) => (
            <p key={c.id} className="text-sm">
              <span className="font-medium">{c.role === "OWNER" ? "You" : c.author}:</span> <span className="text-foreground-muted">{c.body}</span>
            </p>
          ))}
        </div>
      )}

      {mode === null ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setMode("APPROVE")}>
            Approve {approval.amountLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode("REJECT")}>
            Reject
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode("REQUEST_INFO")}>
            Ask a question
          </Button>
        </div>
      ) : (
        <DecisionForm id={approval.id} decision={mode} amountLabel={approval.amountLabel} onCancel={() => setMode(null)} />
      )}
    </Card>
  );
}
