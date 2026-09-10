"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guards";
import {
  updateOwnThemePreference,
  updateOwnColorScheme,
  updateOwnFontScale,
  updateOwnFontFamily,
} from "@/server/modules/users/service";
import type { ThemePreference, ColorScheme, FontScale, FontFamily } from "@prisma/client";

/** As três letras oferecidas. Fora desta lista, a ação não faz nada. */
const FAMILIAS: FontFamily[] = ["inter", "atkinson", "lexend", "instrument"];

/*
 * Os temas aceitos, em LISTA e não numa cadeia de `!==`.
 *
 * A cadeia antiga (`value !== "default" && value !== "liturgical"`)
 * rejeitava em silêncio qualquer valor novo: quem escolhesse "Luz de
 * Vitral" via a tela recarregar sem nada ter mudado, sem erro em lugar
 * nenhum. Lista é o formato que erra alto — esquecer de incluir um valor
 * novo vira problema visível na primeira tentativa.
 */
const TEMAS: ThemePreference[] = ["default", "liturgical", "vitral"];

export async function setThemePreferenceAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const value = formData.get("themePreference");
  if (typeof value !== "string" || !TEMAS.includes(value as ThemePreference)) return;

  await updateOwnThemePreference(session.userId, value as ThemePreference);
  revalidatePath("/", "layout");
}

export async function setColorSchemeAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const value = formData.get("colorScheme");
  if (value !== "light" && value !== "dark") return;

  await updateOwnColorScheme(session.userId, value as ColorScheme);
  // O atributo vive no <html>, no layout raiz — revalida a árvore inteira.
  revalidatePath("/", "layout");
}

/** Tamanho da letra: P, M ou G. */
export async function setFontScaleAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const value = formData.get("fontScale");
  if (value !== "p" && value !== "m" && value !== "g") return;

  await updateOwnFontScale(session.userId, value as FontScale);
  // O atributo vive no <html>, no layout raiz — revalida a árvore inteira.
  revalidatePath("/", "layout");
}

/**
 * A família da letra: Inter, Atkinson ou Lexend.
 *
 * A Inter continua o padrão. As outras existem porque tamanho grande não
 * resolve sozinho — quem tem catarata perde a letra pelo DESENHO dela, não
 * só pelo tamanho.
 */
export async function setFontFamilyAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const value = formData.get("fontFamily");
  if (typeof value !== "string" || !FAMILIAS.includes(value as FontFamily)) return;

  await updateOwnFontFamily(session.userId, value as FontFamily);
  // O atributo vive no <html>, no layout raiz — revalida a árvore inteira.
  revalidatePath("/", "layout");
}
