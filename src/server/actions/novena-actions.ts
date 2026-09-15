"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guards";
import { marcarDiaRezado, recomecarNovena } from "@/server/modules/novenas/service";
import { AppError } from "@/server/shared/errors";

export type EstadoDaNovena = { error?: string; ok?: boolean };

/**
 * Chamada pela tela quando a pessoa chega ao fim do dia da novena.
 *
 * Não pede paróquia: a novena é da conta. O usuário vem da sessão; do
 * cliente vem só qual novena e qual dia — e o serviço recusa pular dia.
 */
export async function marcarDiaRezadoAction(slug: string, dia: number): Promise<EstadoDaNovena> {
  const session = await requireSession();
  try {
    await marcarDiaRezado(session.userId, slug, dia);
  } catch (erro) {
    if (erro instanceof AppError) return { error: erro.message };
    throw erro;
  }
  /*
   * SEM revalidatePath, de propósito.
   *
   * Revalidar faria o servidor desenhar a tela de novo com o dia seguinte,
   * e a sessão — cuja chave é o roteiro do dia — seria trocada na hora: a
   * pessoa terminava o dia 1, via "Dia 1 rezado" por um segundo e caía na
   * apresentação do dia 2. Visto no teste. As telas de novena buscam o
   * andamento a cada abertura, então o dia novo aparece quando ela voltar.
   */
  return { ok: true };
}

export async function recomecarNovenaAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const slug = String(formData.get("novena") ?? "");
  try {
    await recomecarNovena(session.userId, slug);
  } catch (erro) {
    if (erro instanceof AppError) return;
    throw erro;
  }
  revalidatePath("/rezar", "layout");
}
