"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  upsertDonationSettings,
  createPurpose,
  updatePurpose,
  setPurposeActive,
  deletePurpose,
  createInitiative,
  updateInitiative,
  setInitiativeActive,
  deleteInitiative,
  moverItem,
} from "@/server/modules/doacao/service";
import { updateParishDonationProfile } from "@/server/modules/parishes/service";
import { uploadImagem } from "@/server/modules/uploads/service";
import { problemaNaChavePix, problemaNoCnpj, ehTipoDeChavePix } from "@/lib/pix";
import { ICONES_DE_DOACAO, CATEGORIAS_DE_INICIATIVA } from "@/lib/doacao";
import { AppError } from "@/server/shared/errors";
import type { DonationCategory, DizimoCtaTipo } from "@prisma/client";

export type DoacaoState = { error?: string; ok?: string };

/** Dado financeiro: só quem já configura a paróquia mexe aqui. */
async function exigirAcesso(): Promise<string> {
  const session = await requireSession();
  if (!session.membership) {
    throw new AppError("Você precisa pertencer a uma paróquia.", "SEM_PARISH");
  }
  requirePermission(session, PERMISSIONS.DASHBOARD_PARISH_VIEW);
  return session.membership.parishId;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function atualizarTelas() {
  revalidatePath("/doacao");
  revalidatePath("/painel/doacao");
}

export async function salvarDadosDeDoacaoAction(
  _prev: DoacaoState,
  formData: FormData,
): Promise<DoacaoState> {
  try {
    const parishId = await exigirAcesso();

    const cnpj = texto(formData, "cnpj");
    const problemaCnpj = problemaNoCnpj(cnpj);
    if (problemaCnpj) return { error: problemaCnpj };

    const tipo = texto(formData, "pixKeyType");
    const chave = texto(formData, "pixKey");

    // Chave em branco é paróquia que ainda não configurou — a tela do fiel
    // esconde a área inteira nesse caso. Só validamos o que foi preenchido.
    if (chave || tipo) {
      if (!ehTipoDeChavePix(tipo)) return { error: "Escolha o tipo da chave PIX." };
      const problema = problemaNaChavePix(tipo, chave);
      if (problema) return { error: problema };
    }

    const ctaTipoBruto = texto(formData, "dizimoCtaTipo");
    const ctaTipo = (["whatsapp", "link", "interno"] as const).includes(
      ctaTipoBruto as "whatsapp" | "link" | "interno",
    )
      ? (ctaTipoBruto as DizimoCtaTipo)
      : null;

    await updateParishDonationProfile(parishId, {
      cnpj: cnpj || null,
      email: texto(formData, "email") || null,
    });

    await upsertDonationSettings(parishId, {
      pixKey: chave || null,
      pixKeyType: chave ? tipo : null,
      pixPayload: texto(formData, "pixPayload") || null,
      dizimoAtivo: formData.get("dizimoAtivo") === "on",
      dizimoTitulo: texto(formData, "dizimoTitulo") || null,
      dizimoTexto: texto(formData, "dizimoTexto") || null,
      dizimoCtaLabel: texto(formData, "dizimoCtaLabel") || null,
      dizimoCtaTipo: ctaTipo,
      dizimoCtaValor: texto(formData, "dizimoCtaValor") || null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  atualizarTelas();
  revalidatePath("/contato");
  return { ok: "Dados de doação salvos." };
}

function iconeValido(chave: string): string {
  return chave in ICONES_DE_DOACAO ? chave : "igreja";
}

export async function salvarFinalidadeAction(
  _prev: DoacaoState,
  formData: FormData,
): Promise<DoacaoState> {
  try {
    const parishId = await exigirAcesso();
    const title = texto(formData, "title");
    const description = texto(formData, "description");
    if (!title) return { error: "Informe o título." };
    if (!description) return { error: "Escreva uma frase explicando onde essa doação ajuda." };
    if (title.length > 80) return { error: "O título ficou longo demais." };
    if (description.length > 400) return { error: "O texto ficou longo demais." };

    const dados = {
      title,
      description,
      icon: iconeValido(texto(formData, "icon")),
      // Vazio é o normal: o cartão que só explica não vira pedido.
      finalidadeId: texto(formData, "finalidadeId") || null,
    };
    const id = texto(formData, "id");
    if (id) await updatePurpose(parishId, id, dados);
    else await createPurpose(parishId, dados);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  atualizarTelas();
  return { ok: "Finalidade salva." };
}

export async function salvarIniciativaAction(
  _prev: DoacaoState,
  formData: FormData,
): Promise<DoacaoState> {
  try {
    const parishId = await exigirAcesso();
    const title = texto(formData, "title");
    const description = texto(formData, "description");
    if (!title) return { error: "Informe o título." };
    if (!description) return { error: "Escreva o que a paróquia está realizando." };
    if (title.length > 120) return { error: "O título ficou longo demais." };
    if (description.length > 1500) return { error: "O texto ficou longo demais." };

    const arquivo = formData.get("imageFile");
    const enviada =
      arquivo instanceof File && arquivo.size > 0
        ? await uploadImagem(parishId, arquivo, "doacao")
        : null;

    const categoriaBruta = texto(formData, "category");
    const category = (
      categoriaBruta in CATEGORIAS_DE_INICIATIVA ? categoriaBruta : "outros"
    ) as DonationCategory;

    // Data só (sem hora) entra como meia-noite UTC — é assim que o resto do
    // app guarda @db.Date, e o formatador de data usa UTC para ler.
    const data = (campo: string) => {
      const v = texto(formData, campo);
      return v ? new Date(`${v}T00:00:00.000Z`) : null;
    };

    const dados = {
      title,
      description,
      imageUrl: enviada ?? texto(formData, "imageUrl") ?? null,
      icon: iconeValido(texto(formData, "icon")),
      category,
      // Vazio é o normal: a iniciativa que não pede dinheiro não vira pedido.
      finalidadeId: texto(formData, "finalidadeId") || null,
      startsOn: data("startsOn"),
      endsOn: data("endsOn"),
    };

    const id = texto(formData, "id");
    if (id) await updateInitiative(parishId, id, dados);
    else await createInitiative(parishId, dados);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  atualizarTelas();
  return { ok: "Iniciativa salva." };
}

/** Ligar/desligar, apagar e reordenar — ações de um clique, sem formulário. */
export async function acaoDeItemDoacaoAction(formData: FormData): Promise<void> {
  const parishId = await exigirAcesso();

  const tabela = texto(formData, "tabela") === "iniciativa" ? "iniciativa" : "finalidade";
  const id = texto(formData, "id");
  const acao = texto(formData, "acao");
  if (!id) return;

  const modelo = tabela === "iniciativa" ? "donationInitiative" : "donationPurpose";

  if (acao === "cima" || acao === "baixo") {
    await moverItem(parishId, modelo, id, acao);
  } else if (acao === "ativar" || acao === "desativar") {
    const ativo = acao === "ativar";
    if (tabela === "iniciativa") await setInitiativeActive(parishId, id, ativo);
    else await setPurposeActive(parishId, id, ativo);
  } else if (acao === "excluir") {
    if (tabela === "iniciativa") await deleteInitiative(parishId, id);
    else await deletePurpose(parishId, id);
  }

  atualizarTelas();
}
