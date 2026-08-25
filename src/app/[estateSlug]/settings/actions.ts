"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { namedEntitySchema } from "@/server/modules/estates/schema";
import { createBlock, createStreet, createZone } from "@/server/modules/estates/service";

type Kind = "block" | "street" | "zone";

const CREATORS: Record<Kind, typeof createBlock> = {
  block: createBlock,
  street: createStreet,
  zone: createZone,
};

export async function createGeographyAction(estateSlug: string, kind: Kind, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");

  const parsed = namedEntitySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  await CREATORS[kind](membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/settings`);
}
