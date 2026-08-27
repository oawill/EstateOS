"use server";

import { revalidatePath } from "next/cache";
import { CommunityPostType, LostFoundKind, type CommunityReportReason, type CommunityReportTargetType } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import {
  addComment,
  createPost,
  markLostFoundResolved,
  toggleReaction,
  toggleSavedPost,
} from "@/server/modules/community/posts";
import { createReport } from "@/server/modules/community/moderation";

export interface CommunityActionState {
  error?: string;
}

async function requireResident(estateSlug: string, permission: "community-posts:*" | "community-comments:*" | "community-reactions:*" | "community-reports:create") {
  const { user, membership } = await requireEstatePermission(estateSlug, permission);
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");
  return { estateId: membership.estateId, residentId: resident.id };
}

export async function createPostAction(
  estateSlug: string,
  _prevState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const { estateId, residentId } = await requireResident(estateSlug, "community-posts:*");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something before posting." };

  const postTypeRaw = String(formData.get("postType") ?? "TEXT");
  const postType = Object.values(CommunityPostType).includes(postTypeRaw as CommunityPostType)
    ? (postTypeRaw as CommunityPostType)
    : CommunityPostType.TEXT;

  const lostFoundKindRaw = String(formData.get("lostFoundKind") ?? "");
  const lostFoundKind = Object.values(LostFoundKind).includes(lostFoundKindRaw as LostFoundKind)
    ? (lostFoundKindRaw as LostFoundKind)
    : undefined;

  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);

  try {
    await createPost(estateId, residentId, { postType, body, lostFoundKind, imageUrls });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't create that post." };
  }

  revalidatePath(`/${estateSlug}/community`);
  revalidatePath(`/${estateSlug}/community/recommendations`);
  revalidatePath(`/${estateSlug}/community/my-posts`);
  return {};
}

export async function addCommentAction(estateSlug: string, postId: string, formData: FormData): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug, "community-comments:*");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const parentCommentId = String(formData.get("parentCommentId") ?? "") || undefined;
  await addComment(estateId, postId, residentId, body, parentCommentId);
  revalidatePath(`/${estateSlug}/community`);
}

export async function toggleReactionAction(estateSlug: string, target: { postId?: string; commentId?: string }): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug, "community-reactions:*");
  await toggleReaction(estateId, residentId, target);
  revalidatePath(`/${estateSlug}/community`);
}

export async function toggleSavedPostAction(estateSlug: string, postId: string): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug, "community-posts:*");
  await toggleSavedPost(estateId, residentId, postId);
  revalidatePath(`/${estateSlug}/community`);
  revalidatePath(`/${estateSlug}/community/saved`);
}

export async function markLostFoundResolvedAction(estateSlug: string, postId: string): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug, "community-posts:*");
  await markLostFoundResolved(estateId, postId, residentId);
  revalidatePath(`/${estateSlug}/community`);
}

export async function createReportAction(
  estateSlug: string,
  targetType: CommunityReportTargetType,
  targetId: string,
  _prevState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const { estateId, residentId } = await requireResident(estateSlug, "community-reports:create");

  const reason = formData.get("reason") as CommunityReportReason | null;
  if (!reason) return { error: "Select a reason." };
  const details = String(formData.get("details") ?? "").trim() || undefined;

  try {
    await createReport(estateId, residentId, { targetType, targetId, reason, details });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't submit that report." };
  }

  return {};
}
