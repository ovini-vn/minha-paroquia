"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { setContribution } from "@/server/modules/dizimo/service";
import { setContributionInputSchema } from "@/server/modules/dizimo/schema";

export async function setContributionAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.DIZIMO_MANAGE);

  const input = setContributionInputSchema.parse({
    userId: formData.get("userId"),
    period: formData.get("period"),
    contributed: formData.get("contributed"),
  });

  await setContribution(session.membership.parishId, input, session.userId);
  revalidatePath("/painel/dizimo");
}
