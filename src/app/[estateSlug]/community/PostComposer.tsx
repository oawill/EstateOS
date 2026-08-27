"use client";

import { useActionState, useState } from "react";
import { Button, Card, FormError, Select, Textarea } from "@/components/shared/ui";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { getUploadUrlAction } from "./uploadActions";
import { createPostAction, type CommunityActionState } from "./actions";

const POST_TYPES: [string, string][] = [
  ["TEXT", "General post"],
  ["QUESTION", "Question"],
  ["RECOMMENDATION", "Recommendation"],
  ["LOST_FOUND", "Lost & Found"],
  ["DISCUSSION", "Discussion"],
  ["HELPFUL_INFO", "Helpful info"],
];

const initialState: CommunityActionState = {};

export function PostComposer({ estateSlug }: { estateSlug: string }) {
  const action = createPostAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [postType, setPostType] = useState("TEXT");

  return (
    <Card>
      <form action={formAction} className="space-y-3">
        <FormError message={state.error} />
        <Textarea
          name="body"
          rows={3}
          required
          placeholder="Share something with your community — a question, recommendation, or update…"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Select name="postType" value={postType} onChange={(e) => setPostType(e.target.value)} className="w-auto">
            {POST_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {postType === "LOST_FOUND" && (
            <Select name="lostFoundKind" className="w-auto" defaultValue="LOST">
              <option value="LOST">I lost something</option>
              <option value="FOUND">I found something</option>
            </Select>
          )}
        </div>
        <ImageUploader name="imageUrls" getUploadUrl={(filename, contentType) => getUploadUrlAction(estateSlug, filename, contentType)} />
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post"}
        </Button>
      </form>
    </Card>
  );
}
