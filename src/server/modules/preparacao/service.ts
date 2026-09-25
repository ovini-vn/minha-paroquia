import "server-only";
import type { SacramentType } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";

/**
 * A preparação dos sacramentos que a família procura por conta própria:
 * o batismo de um filho e o casamento.
 *
 * Quem escreve é a paróquia — cada uma pede documentos e encontros
 * diferentes, e um roteiro fixo aqui estaria errado para quase todas. O
 * app só guarda e mostra. SEM VALORES: taxa não é coisa que o app peça nem
 * mostre (ver o modelo PreparacaoDeSacramento).
 */

export const SACRAMENTOS_COM_PREPARACAO = ["batismo", "matrimonio"] as const;
export type SacramentoComPreparacao = (typeof SACRAMENTOS_COM_PREPARACAO)[number];

/** O endereço fala a língua de quem procura: "casamento", não "matrimonio". */
export const CAMINHO_DO_SACRAMENTO: Record<SacramentoComPreparacao, string> = {
  batismo: "batismo",
  matrimonio: "casamento",
};

export const NOME_DA_PREPARACAO: Record<SacramentoComPreparacao, string> = {
  batismo: "Batismo",
  matrimonio: "Casamento",
};

export function sacramentoDoCaminho(caminho: string): SacramentoComPreparacao | null {
  const achado = (Object.entries(CAMINHO_DO_SACRAMENTO) as [SacramentoComPreparacao, string][]).find(
    ([, c]) => c === caminho,
  );
  return achado ? achado[0] : null;
}

export function preparacaoDe(parishId: string, tipo: SacramentoComPreparacao) {
  return withTenantContext(parishId, (tx) =>
    tx.preparacaoDeSacramento.findUnique({ where: { parishId_tipo: { parishId, tipo } } }),
  );
}

export function preparacoesDaParoquia(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.preparacaoDeSacramento.findMany({ where: { parishId, tipo: { in: [...SACRAMENTOS_COM_PREPARACAO] } } }),
  );
}

/** Um documento por linha, sem linhas vazias nem repetidas. */
export function documentosDoTexto(texto: string): string[] {
  const vistos = new Set<string>();
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((l) => {
      const chave = l.toLowerCase();
      if (!l || vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .slice(0, 30);
}

export async function salvarPreparacao(
  parishId: string,
  tipo: SacramentType,
  dados: { orientacao: string; documentos: string; encontros: string },
) {
  if (!(SACRAMENTOS_COM_PREPARACAO as readonly string[]).includes(tipo)) {
    throw new ValidationError("Escolha batismo ou casamento.");
  }
  const orientacao = dados.orientacao.trim();
  if (orientacao.length < 10) throw new ValidationError("Escreva ao menos uma frase de orientação para a família.");
  if (orientacao.length > 4000) throw new ValidationError("A orientação cabe em até 4.000 letras.");
  const documentos = documentosDoTexto(dados.documentos);
  const encontros = dados.encontros.trim().slice(0, 2000) || null;
  return withTenantContext(parishId, (tx) =>
    tx.preparacaoDeSacramento.upsert({
      where: { parishId_tipo: { parishId, tipo } },
      create: { parishId, tipo, orientacao, documentos, encontros },
      update: { orientacao, documentos, encontros },
    }),
  );
}
