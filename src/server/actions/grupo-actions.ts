"use server";

import { revalidatePath } from "next/cache";
import { requireSession, podeAlcancar } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  acolherInteressado,
  adicionarMembroPorNome,
  apagarEncontro,
  criarEncontro,
  dispensarInteresse,
  editarDadosDoGrupo,
  editarEncontro,
  ErroNoCronograma,
  importarCronograma,
  mudarPapel,
  podeGerirGrupo,
  removerMembro,
  type DadosDoEncontro,
} from "@/server/modules/grupos/service";
import { AppError } from "@/server/shared/errors";
import { redirect } from "next/navigation";
import {
  adicionarMembroPorEmail,
  apagarRecado,
  apagarTarefa,
  assumirTarefa,
  criarTarefa,
  entrarPeloConvite,
  gerarConviteDoGrupo,
  publicarRecado,
  salvarChamada,
} from "@/server/modules/grupos/vida-do-grupo";
import { enderecoDoApp } from "@/server/http/endereco-do-app";
import type { ErroDeLeitura } from "@/lib/grupos/cronograma";

export type GrupoActionState = { error?: string; ok?: string; erros?: ErroDeLeitura[] };

/**
 * Toda ação daqui passa por esta porta: quem gere as pastorais da paróquia,
 * ou quem coordena ESTE grupo. O grupo vem do formulário, e por isso é
 * conferido a cada chamada — confiar na tela que mostrou o botão seria
 * deixar qualquer um mexer em qualquer grupo mandando outro id.
 */
async function gestaoDoGrupo(formData: FormData) {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." } as const;
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return { error: "Grupo não informado." } as const;

  const parishId = session.membership.parishId;
  const pode = await podeGerirGrupo(
    parishId,
    groupId,
    session.userId,
    podeAlcancar(session, PERMISSIONS.OPPORTUNITIES_MANAGE),
  );
  if (!pode) return { error: "Só a coordenação do grupo pode fazer isso." } as const;
  return { session, parishId, groupId } as const;
}

function revalidarGrupo(groupId: string) {
  revalidatePath(`/comunidade/pastorais/${groupId}`);
  revalidatePath("/comunidade/pastorais");
  revalidatePath("/painel/pastorais");
  revalidatePath("/inicio");
  revalidatePath("/servir");
  revalidatePath("/gestao");
}

function texto(formData: FormData, campo: string): string | null {
  const v = formData.get(campo);
  return typeof v === "string" ? v : null;
}

function comoErro(error: unknown): GrupoActionState {
  if (error instanceof ErroNoCronograma) return { error: error.message, erros: error.erros };
  if (error instanceof AppError) return { error: error.message };
  throw error;
}

// ---- o grupo -------------------------------------------------------------

export async function editarDadosDoGrupoAction(
  _prev: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };

  try {
    await editarDadosDoGrupo(g.parishId, g.groupId, {
      name: texto(formData, "name") ?? "",
      description: texto(formData, "description"),
      leaderName: texto(formData, "leaderName"),
      meetsWhen: texto(formData, "meetsWhen"),
      meetsWhere: texto(formData, "meetsWhere"),
    });
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return { ok: "Dados do grupo salvos." };
}

// ---- encontros -----------------------------------------------------------

/**
 * O formulário manda "Data a definir" como caixa marcada, e o mês previsto
 * como `<input type="month">` ("2026-12"). Marcada a caixa, a data some —
 * mesmo que o campo tenha ficado preenchido de antes.
 */
function encontroDoFormulario(formData: FormData): DadosDoEncontro {
  const semData = formData.get("semData") === "on";
  return {
    data: semData ? null : texto(formData, "data"),
    dataFim: semData ? null : texto(formData, "dataFim"),
    mesPrevisto: semData ? texto(formData, "mesPrevisto") : null,
    tema: texto(formData, "tema") ?? "",
    complemento: texto(formData, "complemento"),
    pregador: texto(formData, "pregador"),
    destaque: formData.get("destaque") === "on",
    icone: texto(formData, "icone"),
  };
}

export async function criarEncontroAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };

  try {
    await criarEncontro(g.parishId, g.groupId, g.session.userId, encontroDoFormulario(formData));
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return { ok: "Encontro incluído no cronograma." };
}

export async function editarEncontroAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  const encontroId = texto(formData, "encontroId") ?? "";

  try {
    if (formData.get("apagar") === "sim") {
      await apagarEncontro(g.parishId, g.groupId, encontroId);
    } else {
      await editarEncontro(g.parishId, g.groupId, encontroId, encontroDoFormulario(formData));
    }
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return { ok: formData.get("apagar") === "sim" ? "Encontro apagado." : "Encontro salvo." };
}

export async function colarCronogramaAction(
  _prev: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };

  let resultado: { adicionados: number; repetidos: number };
  try {
    resultado = await importarCronograma(g.parishId, g.groupId, g.session.userId, texto(formData, "texto") ?? "");
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);

  const { adicionados, repetidos } = resultado;
  const novos = adicionados === 1 ? "1 encontro incluído" : `${adicionados} encontros incluídos`;
  const iguais =
    repetidos === 0 ? "" : repetidos === 1 ? " — 1 já estava no cronograma" : ` — ${repetidos} já estavam no cronograma`;
  return { ok: `${novos}${iguais}.` };
}

// ---- membros -------------------------------------------------------------

export async function adicionarMembroAction(
  _prev: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  const papel = formData.get("papel") === "coordenador" ? "coordenador" : "membro";

  let resultado: { fullName: string; jaEra: boolean };
  try {
    // O mesmo campo aceita nome completo ou e-mail: com "@", é e-mail — o
    // caminho quando há duas pessoas com o mesmo nome na paróquia.
    const quem = (texto(formData, "nome") ?? "").trim();
    resultado = quem.includes("@")
      ? await adicionarMembroPorEmail(g.parishId, g.groupId, quem, papel, g.session.userId)
      : await adicionarMembroPorNome(g.parishId, g.groupId, quem, papel, g.session.userId);
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return {
    ok: resultado.jaEra
      ? `${resultado.fullName} já fazia parte do grupo.`
      : `${resultado.fullName} agora faz parte do grupo e recebeu um aviso no app.`,
  };
}

export async function acolherInteressadoAction(
  _prev: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };

  try {
    await acolherInteressado(g.parishId, g.groupId, texto(formData, "userId") ?? "", g.session.userId);
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return { ok: "Agora faz parte do grupo, e recebeu um aviso no app." };
}

export async function dispensarInteresseAction(
  _prev: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };

  await dispensarInteresse(g.parishId, g.groupId, texto(formData, "userId") ?? "");
  revalidarGrupo(g.groupId);
  return { ok: "Tirado da lista." };
}

export async function acaoNoMembroAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  const membroId = texto(formData, "membroId") ?? "";
  const acao = formData.get("acao");

  try {
    if (acao === "remover") await removerMembro(g.parishId, g.groupId, membroId);
    else if (acao === "coordenador" || acao === "membro") await mudarPapel(g.parishId, g.groupId, membroId, acao);
    else return { error: "Ação desconhecida." };
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return {};
}

// ---- recados ---------------------------------------------------------------

export async function publicarRecadoAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  let avisados = 0;
  try {
    ({ avisados } = await publicarRecado(g.parishId, g.groupId, g.session.userId, texto(formData, "texto") ?? ""));
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return { ok: avisados === 1 ? "Recado enviado a 1 pessoa." : `Recado enviado a ${avisados} pessoas.` };
}

export async function apagarRecadoAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  await apagarRecado(g.parishId, g.groupId, texto(formData, "recadoId") ?? "");
  revalidarGrupo(g.groupId);
  return { ok: "Recado apagado." };
}

// ---- chamada ---------------------------------------------------------------

/**
 * A chamada chega como um campo por membro: `presenca-<userId>` = "sim" ou
 * "nao". Quem não veio no formulário não é marcado — não se inventa falta.
 */
export async function salvarChamadaAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  const presencas: { userId: string; presente: boolean }[] = [];
  for (const [campo, valor] of formData.entries()) {
    if (!campo.startsWith("presenca-") || typeof valor !== "string") continue;
    presencas.push({ userId: campo.slice("presenca-".length), presente: valor === "sim" });
  }
  let seAfastando: string[] = [];
  try {
    ({ seAfastando } = await salvarChamada(g.parishId, g.groupId, texto(formData, "encontroId") ?? "", g.session.userId, presencas));
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return {
    ok:
      seAfastando.length === 0
        ? "Chamada salva."
        : `Chamada salva. ${seAfastando.length === 1 ? "Uma pessoa completou" : `${seAfastando.length} pessoas completaram`} três faltas seguidas — a coordenação foi avisada.`,
  };
}

// ---- tarefas ---------------------------------------------------------------

export async function criarTarefaAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  try {
    await criarTarefa(
      g.parishId,
      g.groupId,
      texto(formData, "encontroId") ?? "",
      texto(formData, "descricao") ?? "",
      texto(formData, "responsavelId") || null,
    );
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(g.groupId);
  return { ok: "Tarefa incluída." };
}

export async function apagarTarefaAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  await apagarTarefa(g.parishId, g.groupId, texto(formData, "tarefaId") ?? "");
  revalidarGrupo(g.groupId);
  return {};
}

/** Qualquer membro assume uma tarefa sem dono — não passa pela coordenação. */
export async function assumirTarefaAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  const groupId = texto(formData, "groupId") ?? "";
  try {
    await assumirTarefa(session.membership.parishId, groupId, texto(formData, "tarefaId") ?? "", session.userId);
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(groupId);
  return { ok: "A tarefa é sua. Obrigado!" };
}

// ---- convite do grupo ------------------------------------------------------

export async function gerarConviteDoGrupoAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const g = await gestaoDoGrupo(formData);
  if ("error" in g) return { error: g.error };
  const token = await gerarConviteDoGrupo(g.parishId, g.groupId);
  return { ok: `${await enderecoDoApp()}/g/${token}` };
}

export async function entrarPeloConviteAction(_prev: GrupoActionState, formData: FormData): Promise<GrupoActionState> {
  const session = await requireSession();
  let groupId: string;
  try {
    ({ groupId } = await entrarPeloConvite(texto(formData, "token") ?? "", session.userId));
  } catch (error) {
    return comoErro(error);
  }
  revalidarGrupo(groupId);
  redirect(`/comunidade/pastorais/${groupId}`);
}
