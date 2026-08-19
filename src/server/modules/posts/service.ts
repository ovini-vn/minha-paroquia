import { withTenantContext } from "@/server/db/tenant-context";
import type { CreatePostInput } from "./schema";

export function createPost(input: CreatePostInput & { parishId: string; priestProfileId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.post.create({
      data: {
        parishId: input.parishId,
        priestProfileId: input.priestProfileId,
        mediaType: input.mediaType,
        contentText: input.contentText ?? null,
        mediaUrl: input.mediaUrl ?? null,
      },
    }),
  );
}

export function listRecentPosts(parishId: string, limit = 10) {
  return withTenantContext(parishId, (tx) =>
    tx.post.findMany({
      where: { parishId },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

export async function getLatestPost(parishId: string) {
  const [latest] = await listRecentPosts(parishId, 1);
  return latest ?? null;
}
