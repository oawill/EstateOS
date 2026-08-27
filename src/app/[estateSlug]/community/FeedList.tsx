"use client";

import { useActionState, useState } from "react";
import type { CommunityDisplayNamePreference } from "@prisma/client";
import { Badge, Button, Card, FormError, Input, Select } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { getDisplayIdentity } from "@/server/modules/community/identity";
import type { CommunityPostWithRelations } from "@/server/modules/community/posts";
import {
  addCommentAction,
  createReportAction,
  markLostFoundResolvedAction,
  toggleReactionAction,
  toggleSavedPostAction,
  type CommunityActionState,
} from "./actions";

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: Date;
};

type FeedItem =
  | { kind: "post"; createdAt: Date; post: CommunityPostWithRelations }
  | { kind: "announcement"; createdAt: Date; announcement: AnnouncementItem };

const POST_TYPE_LABEL: Record<string, string> = {
  TEXT: "",
  QUESTION: "Question",
  RECOMMENDATION: "Recommendation",
  LOST_FOUND: "Lost & Found",
  DISCUSSION: "Discussion",
  EVENT_NOTICE: "Event notice",
  HELPFUL_INFO: "Helpful info",
};

const REPORT_REASONS: [string, string][] = [
  ["SPAM", "Spam"],
  ["FRAUD_SCAM", "Fraud / scam"],
  ["HARASSMENT", "Harassment"],
  ["OFFENSIVE_CONTENT", "Offensive content"],
  ["MISLEADING_LISTING", "Misleading listing"],
  ["PROHIBITED_GOODS_SERVICES", "Prohibited goods/services"],
  ["PRIVACY_VIOLATION", "Privacy violation"],
  ["OTHER", "Other"],
];

export function ReportForm({ estateSlug, targetType, targetId }: { estateSlug: string; targetType: "POST" | "COMMENT" | "LISTING"; targetId: string }) {
  const action = createReportAction.bind(null, estateSlug, targetType, targetId);
  const initial: CommunityActionState = {};
  const [state, formAction, pending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return <p className="text-xs text-foreground-muted">Report submitted — thank you.</p>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-foreground-muted underline underline-offset-4 hover:text-foreground">
        Report
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setSubmitted(true);
      }}
      className="space-y-2 rounded-lg bg-surface-muted p-3"
    >
      <FormError message={state.error} />
      <Select name="reason" required className="text-xs">
        <option value="">Select a reason</option>
        {REPORT_REASONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Input name="details" placeholder="Additional details (optional)" />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={pending} className="text-xs">
          Submit report
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="text-xs">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CommentForm({ estateSlug, postId }: { estateSlug: string; postId: string }) {
  return (
    <form
      action={async (formData) => {
        await addCommentAction(estateSlug, postId, formData);
      }}
      className="mt-2 flex gap-2"
    >
      <Input name="body" placeholder="Write a comment…" required className="flex-1" />
      <Button type="submit" variant="secondary">
        Reply
      </Button>
    </form>
  );
}

function PostCard({
  estateSlug,
  post,
  currentResidentId,
  defaultDisplayNamePreference,
}: {
  estateSlug: string;
  post: CommunityPostWithRelations;
  currentResidentId: string;
  defaultDisplayNamePreference: CommunityDisplayNamePreference;
}) {
  const identity = getDisplayIdentity(post.author, defaultDisplayNamePreference);
  const hasReacted = post.reactions.some((r) => r.residentId === currentResidentId);
  const reactionCount = post.reactions.length;
  const isAuthor = post.authorResidentId === currentResidentId;
  const typeLabel = POST_TYPE_LABEL[post.postType];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium">{identity.name}</p>
            {identity.badges.map((badge) => (
              <Badge key={badge} tone={badge === "Estate Management" ? "info" : "neutral"}>
                {badge}
              </Badge>
            ))}
          </div>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {formatDate(post.createdAt)}
            {typeLabel ? ` · ${typeLabel}` : ""}
            {post.postType === "LOST_FOUND" && post.lostFoundKind ? ` (${post.lostFoundKind})` : ""}
          </p>
        </div>
        {post.postType === "LOST_FOUND" && (
          <Badge tone={post.lostFoundResolvedAt ? "success" : "warning"}>{post.lostFoundResolvedAt ? "Resolved" : "Unresolved"}</Badge>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>

      {post.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="" className="h-32 w-32 rounded-lg object-cover" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
        <form action={async () => toggleReactionAction(estateSlug, { postId: post.id })}>
          <Button type="submit" variant={hasReacted ? "primary" : "secondary"} className="!px-3 !py-1.5 text-xs">
            👍 Like{reactionCount > 0 ? ` (${reactionCount})` : ""}
          </Button>
        </form>
        <form action={async () => toggleSavedPostAction(estateSlug, post.id)}>
          <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">
            Save
          </Button>
        </form>
        {post.postType === "LOST_FOUND" && isAuthor && !post.lostFoundResolvedAt && (
          <form action={async () => markLostFoundResolvedAction(estateSlug, post.id)}>
            <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">
              Mark resolved
            </Button>
          </form>
        )}
        <ReportForm estateSlug={estateSlug} targetType="POST" targetId={post.id} />
      </div>

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {post.comments.map((comment) => {
            const commentIdentity = getDisplayIdentity(comment.author, defaultDisplayNamePreference);
            return (
              <div key={comment.id} className="text-sm">
                <span className="font-medium">{commentIdentity.name}</span>{" "}
                <span className="text-foreground-muted">{comment.body}</span>
              </div>
            );
          })}
        </div>
      )}

      <CommentForm estateSlug={estateSlug} postId={post.id} />
    </Card>
  );
}

function AnnouncementCard({ announcement }: { announcement: AnnouncementItem }) {
  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <div className="flex items-center gap-2">
        <Badge tone="info">Official Estate Notice</Badge>
        <span className="text-xs text-foreground-muted">{announcement.category.replaceAll("_", " ")}</span>
      </div>
      <p className="mt-2 font-medium">{announcement.title}</p>
      <p className="mt-1 text-sm text-foreground-muted">{announcement.body}</p>
      <p className="mt-2 text-xs text-foreground-muted">{formatDate(announcement.createdAt)}</p>
    </Card>
  );
}

export function FeedList({
  estateSlug,
  items,
  currentResidentId,
  defaultDisplayNamePreference,
}: {
  estateSlug: string;
  items: FeedItem[];
  currentResidentId: string;
  defaultDisplayNamePreference: CommunityDisplayNamePreference;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground-muted">Nothing here yet — be the first to post.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) =>
        item.kind === "post" ? (
          <PostCard
            key={`post-${item.post.id}`}
            estateSlug={estateSlug}
            post={item.post}
            currentResidentId={currentResidentId}
            defaultDisplayNamePreference={defaultDisplayNamePreference}
          />
        ) : (
          <AnnouncementCard key={`announcement-${item.announcement.id}`} announcement={item.announcement} />
        ),
      )}
    </div>
  );
}
