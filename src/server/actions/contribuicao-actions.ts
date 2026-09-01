"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { podeAlcancar, requirePermission, requireSession } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  cancelarContribuicao,
  confirmarRecebimentoDoPix,
  copiarFinalidadesDaDoacao,
  criarFinalidade,
  descartarPix,
  editarFinalidade,
  gerarPixDeContribuicao,
  lancarContribuicao,
} from "@/server/modules/contribuicao/service";
import {
  criarFinalidadeSchema,
  editarFinalidadeSchema,
  gerarPixSchema,
  lancarContribuicaoSchema,
  paraCentavos,
} from "@/server/modules/contribuicao/schema";
import { AppError, ForbiddenError } from "@/server/shared/errors";

export type ActionState = { error?: string; ok?: boolean };

function comoErro(erro: unknown): ActionState {
  if (erro instanceof ZodError) return { error: erro.issues[0]?.message ?? "Confira os campos." };
  if (erro instanceof AppError) return { error: erro.message };
  throw erro;
}

async function exigirParoquia() {
  const session = await requireSession();
  if (!session.membership) throw new ForbiddenError();
  return { parishId: session.membership.parishId, userId: session.userId, session };
}

async function exigirTesouraria() {
  const { parishId, userId, session } = await exigirParoquia();
  requirePermission(session, PERMISSIONS.FINANCEIRO_GERENCIAR);
  return { parishId, userId };
}

/**
 * O fiel gera o próprio Pix.
 *
 * Não pede permissão nenhuma além de pertencer à paróquia: contribuir é
 * voluntário, e exigir autorização para poder ofertar seria o avesso disto.
 */
export async function gerarPixAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let destino: string;
  try {
    const { parishId, userId } = await exigirParoquia();
    const dados = gerarPixSchema.parse({
      finalidadeId: formData.get("finalidadeId"),
      valor: formData.get("valor") || undefined,
    });
    const pix = await gerarPixDeContribuicao({ ...dados, parishId, userId });
    destino = `/contribuir/${pix.id}`;
  } catch (erro) {
    return comoErro(erro);
  }
  // Fora do try: `redirect` funciona lançando, e capturá-lo viraria erro na
  // tela em vez de navegação.
  redirect(destino);
}

export async function descartarPixAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId, userId } = await exigirParoquia();
    await descartarPix(parishId, String(formData.get("pixId") ?? ""), userId);
    revalidatePath("/contribuir");
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function criarFinalidadeAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirTesouraria();
    const dados = criarFinalidadeSchema.parse({
      nome: formData.get("nome"),
      descricao: formData.get("descricao") || undefined,
      icone: formData.get("icone") || "igreja",
      ehDizimo: formData.get("ehDizimo") === "sim",
    });
    await criarFinalidade({ ...dados, parishId });
    revalidatePath("/painel/financeiro");
    revalidatePath("/contribuir");
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function editarFinalidadeAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirTesouraria();
    const dados = editarFinalidadeSchema.parse({
      finalidadeId: formData.get("finalidadeId"),
      nome: formData.get("nome"),
      descricao: formData.get("descricao") || undefined,
      icone: formData.get("icone") || "igreja",
      ehDizimo: formData.get("ehDizimo") === "sim",
      // Caixa desmarcada não é enviada pelo navegador: a ausência É o "não".
      // Ler pela presença dispensa um campo escondido cujo efeito dependeria
      // da ordem em que os dois aparecem no formulário.
      ativa: formData.get("ativa") === "sim",
    });
    await editarFinalidade({ ...dados, parishId });
    revalidatePath("/painel/financeiro");
    revalidatePath("/contribuir");
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function copiarFinalidadesAction(): Promise<void> {
  const { parishId } = await exigirTesouraria();
  await copiarFinalidadesDaDoacao(parishId);
  revalidatePath("/painel/financeiro");
  revalidatePath("/contribuir");
}

export async function lancarContribuicaoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId, userId } = await exigirTesouraria();
    const dados = lancarContribuicaoSchema.parse({
      finalidadeId: formData.get("finalidadeId"),
      userId: formData.get("userId") || undefined,
      valor: formData.get("valor"),
      recebidaEm: formData.get("recebidaEm"),
      forma: formData.get("forma"),
      observacao: formData.get("observacao") || undefined,
    });
    await lancarContribuicao({ ...dados, parishId, registradaPor: userId });
    revalidatePath("/painel/financeiro");
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

/** Para a tela decidir o que mostrar, com a mesma regra da guarda. */
export async function podeVerFinanceiro(): Promise<boolean> {
  const session = await requireSession();
  return podeAlcancar(session, PERMISSIONS.FINANCEIRO_VER);
}

/**
 * A secretaria confirma que um código caiu na conta.
 *
 * O valor só é lido quando o código foi gerado sem valor — nos outros casos
 * o que vale é o que a pessoa viu na tela quando gerou, e aceitar um valor
 * diferente aqui deixaria histórico e extrato discordando sem aviso.
 */
export async function confirmarRecebimentoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId, userId } = await exigirTesouraria();
    const bruto = String(formData.get("valor") ?? "").trim();
    const centavos = bruto ? paraCentavos(bruto) : null;
    if (bruto && (centavos === null || centavos <= 0)) {
      return { error: "Informe um valor como 50,00." };
    }

    const dia = String(formData.get("recebidaEm") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { error: "Informe o dia em que o valor entrou." };

    await confirmarRecebimentoDoPix({
      parishId,
      pixId: String(formData.get("pixId") ?? ""),
      centavos,
      // Data sem hora entra como meia-noite UTC, como o resto do app guarda
      // `@db.Date` — e é assim que o formatador a lê de volta.
      recebidaEm: new Date(`${dia}T00:00:00.000Z`),
      confirmadaPor: userId,
    });
    revalidatePath("/painel/financeiro");
    revalidatePath("/contribuir");
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function cancelarContribuicaoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirTesouraria();
    await cancelarContribuicao(parishId, String(formData.get("contribuicaoId") ?? ""));
    revalidatePath("/painel/financeiro");
    revalidatePath("/contribuir");
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}
