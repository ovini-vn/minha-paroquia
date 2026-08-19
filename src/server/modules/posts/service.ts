import { withTenantContext } from "@/server/db/tenant-context";
import { notifyManyUsers } from "@/server/modules/notifications/service";
import type { CreatePostInput } from "./schema";

export function createPost(input: CreatePostInput & { parishId: string; priestProfileId: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    const post = await tx.post.create({
      data: {
        parishId: input.parishId,
        priestProfileId: input.priestProfileId,
        mediaType: input.mediaType,
        contentText: input.contentText ?? null,
        mediaUrl: input.mediaUrl ?? null,
      },
    });

    const members = await tx.parishMembership.findMany({
      where: { parishId: input.parishId, status: "active" },
      select: { userId: true },
    });
    await notifyManyUsers(
      tx,
      input.parishId,
      members.map((m) => m.userId),
      "espiritual",
      "Nova Palavra do Padre",
      "O pároco publicou uma nova mensagem — confira na Comunidade.",
    );

    return post;
  });
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
