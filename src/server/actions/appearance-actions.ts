"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guards";
import { updateOwnThemePreference } from "@/server/modules/users/service";
import type { ThemePreference } from "@prisma/client";

export async function setThemePreferenceAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const value = formData.get("themePreference");
  if (value !== "default" && value !== "liturgical") return;

  await updateOwnThemePreference(session.userId, value as ThemePreference);
  revalidatePath("/", "layout");
}
