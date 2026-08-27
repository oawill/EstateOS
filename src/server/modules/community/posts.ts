import { Prisma, type CommunityPostType, type LostFoundKind } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

async function assertNotSuspended(estateId: string, residentId: string) {
  const resident = await scoped(estateId).resident.findById(residentId);
  if (!resident) throw new NotFoundError("Resident");
  if (resident.communitySuspendedAt) {
    throw new ForbiddenError("Your community posting privileges have been suspended.");
  }
}

const postWithRelations = Prisma.validator<Prisma.CommunityPostDefaultArgs>()({
  include: {
    author: { include: { occupancies: true, user: { include: { memberships: true } } } },
    images: { orderBy: { sortOrder: "asc" } },
    comments: {
      where: { moderationStatus: "VISIBLE" },
      orderBy: { createdAt: "asc" },
      include: { author: { include: { occupancies: true, user: { include: { memberships: true } } } } },
    },
    reactions: true,
  },
});
export type CommunityPostWithRelations = Prisma.CommunityPostGetPayload<typeof postWithRelations>;

export async function createPost(
  estateId: string,
  authorResidentId: string,
  input: { postType: CommunityPostType; body: string; lostFoundKind?: LostFoundKind; imageUrls?: string[] },
) {
  await assertNotSuspended(estateId, authorResidentId);

  return prisma.$transaction(async (tx) => {
    const post = await tx.communityPost.create({
      data: {
        estateId,
        authorResidentId,
        postType: input.postType,
        body: input.body,
        lostFoundKind: input.postType === "LOST_FOUND" ? input.lostFoundKind : undefined,
      },
    });

    if (input.imageUrls?.length) {
      await tx.communityPostImage.createMany({
        data: input.imageUrls.map((url, index) => ({ estateId, postId: post.id, url, sortOrder: index })),
      });
    }

    return post;
  });
}

export async function listFeed(estateId: string, filter?: { postType?: CommunityPostType }) {
  const [posts, announcements] = await Promise.all([
    scoped(estateId).communityPost.findMany<CommunityPostWithRelations>({
      where: { moderationStatus: "VISIBLE", postType: filter?.postType },
      orderBy: { createdAt: "desc" },
      include: postWithRelations.include,
    }),
    filter?.postType ? Promise.resolve([]) : scoped(estateId).announcement.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  type FeedItem =
    | { kind: "post"; createdAt: Date; post: CommunityPostWithRelations }
    | { kind: "announcement"; createdAt: Date; announcement: (typeof announcements)[number] };

  const items: FeedItem[] = [
    ...posts.map((post): FeedItem => ({ kind: "post", createdAt: post.createdAt, post })),
    ...announcements.map((announcement): FeedItem => ({ kind: "announcement", createdAt: announcement.createdAt, announcement })),
  ];

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getPost(estateId: string, postId: string) {
  const post = await scoped(estateId).communityPost.findById<CommunityPostWithRelations>(postId, {
    include: postWithRelations.include,
  });
  if (!post || post.moderationStatus !== "VISIBLE") throw new NotFoundError("Post");
  return post;
}

export async function listMyPosts(estateId: string, residentId: string) {
  return scoped(estateId).communityPost.findMany<CommunityPostWithRelations>({
    where: { authorResidentId: residentId },
    orderBy: { createdAt: "desc" },
    include: postWithRelations.include,
  });
}

export async function addComment(
  estateId: string,
  postId: string,
  authorResidentId: string,
  body: string,
  parentCommentId?: string,
) {
  await assertNotSuspended(estateId, authorResidentId);
  const post = await scoped(estateId).communityPost.findById(postId);
  if (!post) throw new NotFoundError("Post");

  return scoped(estateId).communityComment.create({ postId, authorResidentId, body, parentCommentId });
}

export async function toggleReaction(estateId: string, residentId: string, target: { postId?: string; commentId?: string }) {
  // Confirm the target actually belongs to this estate before touching it —
  // without this, a client-supplied id from another tenant would silently
  // create a cross-estate reaction row (the compound unique key alone
  // doesn't prevent it, since it doesn't include estateId).
  if (target.postId) {
    const post = await scoped(estateId).communityPost.findById(target.postId);
    if (!post) throw new NotFoundError("Post");
  } else if (target.commentId) {
    const comment = await scoped(estateId).communityComment.findById(target.commentId);
    if (!comment) throw new NotFoundError("Comment");
  }

  const where = target.postId
    ? { residentId_postId: { residentId, postId: target.postId } }
    : { residentId_commentId: { residentId, commentId: target.commentId! } };

  const existing = await prisma.communityReaction.findUnique({ where: where as Prisma.CommunityReactionWhereUniqueInput });
  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    return { reacted: false };
  }

  await scoped(estateId).communityReaction.create({ residentId, postId: target.postId, commentId: target.commentId });
  return { reacted: true };
}

export async function toggleSavedPost(estateId: string, residentId: string, postId: string) {
  const post = await scoped(estateId).communityPost.findById(postId);
  if (!post) throw new NotFoundError("Post");

  const existing = await prisma.communitySavedPost.findUnique({ where: { residentId_postId: { residentId, postId } } });
  if (existing) {
    await prisma.communitySavedPost.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await scoped(estateId).communitySavedPost.create({ residentId, postId });
  return { saved: true };
}

export async function listSavedPosts(estateId: string, residentId: string) {
  const saved = await scoped(estateId).communitySavedPost.findMany({ where: { residentId }, orderBy: { createdAt: "desc" } });
  const postIds = saved.map((s) => s.postId);
  if (postIds.length === 0) return [];

  const posts = await scoped(estateId).communityPost.findMany<CommunityPostWithRelations>({
    where: { id: { in: postIds } },
    include: postWithRelations.include,
  });
  const byId = new Map(posts.map((p) => [p.id, p]));
  return postIds.map((id) => byId.get(id)).filter((p): p is CommunityPostWithRelations => Boolean(p));
}

export async function markLostFoundResolved(estateId: string, postId: string, authorResidentId: string) {
  const post = await scoped(estateId).communityPost.findById(postId);
  if (!post) throw new NotFoundError("Post");
  if (post.authorResidentId !== authorResidentId) throw new ForbiddenError("Only the author can mark this resolved.");

  return scoped(estateId).communityPost.update(postId, { lostFoundResolvedAt: new Date() });
}
