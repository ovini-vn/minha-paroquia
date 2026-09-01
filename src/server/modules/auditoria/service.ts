import "server-only";
import type { Prisma } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";

/**
 * Registro de quem fez o quê nas operações que dão ou tiram acesso.
 *
 * A regra que sustenta tudo: `registrar` recebe a TRANSAÇÃO de quem chama, e
 * grava dentro dela. Ou a mudança e o registro acontecem juntos, ou nenhum
 * acontece. Um log escrito depois, do lado de fora, produziria mudança sem
 * registro no dia em que algo falhasse no meio — e log com buraco não serve
 * para responder nada.
 *
 * O que NÃO entra aqui: conteúdo. `detalhe` guarda ids, códigos de papel e
 * de permissão. O texto de um pedido de oração ou de um aviso nunca é
 * copiado — o log diz que algo foi moderado, não o que estava escrito.
 */

/** Códigos estáveis. O rótulo legível fica separado, e pode mudar sem migração. */
export const ACOES = {
  PAPEL_TROCADO: "papel.trocado",
  PERMISSAO_CONCEDIDA: "permissao.concedida",
  PERMISSAO_REVOGADA: "permissao.revogada",
  PERMISSAO_REMOVIDA: "permissao.removida",
  SENHA_LINK_GERADO: "senha.link_gerado",
  AVISO_APAGADO: "aviso.apagado",
  ORACAO_MODERADA: "oracao.moderada",
  TURMA_APAGADA: "turma.apagada",
} as const;

export type Acao = (typeof ACOES)[keyof typeof ACOES];

export const ROTULO_DA_ACAO: Record<Acao, string> = {
  [ACOES.PAPEL_TROCADO]: "Trocou o papel de alguém",
  [ACOES.PERMISSAO_CONCEDIDA]: "Concedeu uma permissão",
  [ACOES.PERMISSAO_REVOGADA]: "Revogou uma permissão",
  [ACOES.PERMISSAO_REMOVIDA]: "Removeu a permissão avulsa",
  [ACOES.SENHA_LINK_GERADO]: "Gerou link de nova senha",
  [ACOES.AVISO_APAGADO]: "Apagou um aviso",
  [ACOES.TURMA_APAGADA]: "Excluiu uma turma de catequese",
  [ACOES.ORACAO_MODERADA]: "Moderou um pedido de oração",
};

export type Entrada = {
  parishId: string;
  atorId: string;
  acao: Acao;
  alvoTipo?: string;
  alvoId?: string;
  detalhe?: Prisma.InputJsonValue;
};

/** Grava DENTRO da transação de quem chama. Ver o comentário do módulo. */
export async function registrar(tx: Prisma.TransactionClient, entrada: Entrada): Promise<void> {
  await tx.auditLog.create({
    data: {
      parishId: entrada.parishId,
      atorId: entrada.atorId,
      acao: entrada.acao,
      alvoTipo: entrada.alvoTipo ?? null,
      alvoId: entrada.alvoId ?? null,
      detalhe: entrada.detalhe,
    },
  });
}

export type LinhaDoRegistro = {
  id: string;
  acao: string;
  atorNome: string;
  alvoNome: string | null;
  detalhe: Prisma.JsonValue;
  createdAt: Date;
};

/**
 * O histórico da paróquia, do mais recente.
 *
 * Os nomes são resolvidos na leitura, e não guardados na gravação: guardar
 * o nome congelaria quem casou e mudou de sobrenome. Quem sumiu do sistema
 * aparece como "conta removida" — o registro sobrevive à conta, que é o
 * ponto de existir um log.
 */
export async function listar(
  parishId: string,
  filtro: { limite?: number; acao?: string; desde?: Date } = {},
): Promise<LinhaDoRegistro[]> {
  return withTenantContext(parishId, async (tx) => {
    /*
     * O filtro vai ao BANCO, e não à lista já carregada.
     *
     * A consulta traz as cem últimas. Filtrar essas cem responderia "não
     * houve troca de papel" quando houve, só porque a troca é a
     * centésima-primeira — e num registro de auditoria essa resposta é pior
     * do que resposta nenhuma.
     */
    const linhas = await tx.auditLog.findMany({
      where: {
        parishId,
        ...(filtro.acao ? { acao: filtro.acao } : {}),
        ...(filtro.desde ? { createdAt: { gte: filtro.desde } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filtro.limite ?? 100,
    });

    const ids = [...new Set(linhas.flatMap((l) => [l.atorId, l.alvoId].filter(Boolean) as string[]))];
    const pessoas = await tx.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
    const nomePor = new Map(pessoas.map((p) => [p.id, p.fullName]));

    return linhas.map((l) => ({
      id: l.id,
      acao: l.acao,
      atorNome: nomePor.get(l.atorId) ?? "conta removida",
      alvoNome: l.alvoId ? (nomePor.get(l.alvoId) ?? "conta removida") : null,
      detalhe: l.detalhe,
      createdAt: l.createdAt,
    }));
  });
}

/**
 * Quantas vezes cada ação aconteceu, no registro INTEIRO.
 *
 * Existe para as tarjas do filtro oferecerem só o que de fato há, e com o
 * número ao lado. Sai de um `groupBy`, que é uma consulta de contagem — não
 * carrega linha nenhuma, e por isso pode olhar o log todo sem custo.
 */
export function contarPorAcao(parishId: string): Promise<{ acao: string; quantos: number }[]> {
  return withTenantContext(parishId, async (tx) => {
    const grupos = await tx.auditLog.groupBy({
      by: ["acao"],
      where: { parishId },
      _count: { _all: true },
    });
    return (
      grupos
        .map((g) => ({ acao: g.acao, quantos: g._count._all }))
        /*
         * Mais frequente primeiro, e o rótulo desempata.
         *
         * Sem o desempate a ordem vinha do agrupamento do banco, que não
         * promete ordem nenhuma: duas ações com a mesma contagem trocariam
         * de lugar entre um carregamento e outro, e uma barra de filtro que
         * se mexe sozinha faz a pessoa reler tudo a cada visita.
         */
        .sort(
          (a, b) =>
            b.quantos - a.quantos ||
            (ROTULO_DA_ACAO[a.acao as Acao] ?? a.acao).localeCompare(
              ROTULO_DA_ACAO[b.acao as Acao] ?? b.acao,
              "pt-BR",
            ),
        )
    );
  });
}
