import { formatDate } from "@/lib/utils";

export interface TimelineComment {
  id: string;
  body: string;
  newStatus: string | null;
  createdAt: Date | string;
}

export function TicketTimeline({ comments }: { comments: TimelineComment[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-slate-400">No updates yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {comments.map((comment) => (
        <li key={comment.id} className="border-l-2 border-slate-200 pl-3">
          {comment.newStatus && (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {comment.newStatus.replaceAll("_", " ")}
            </p>
          )}
          <p className="text-sm text-slate-700">{comment.body}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatDate(comment.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
