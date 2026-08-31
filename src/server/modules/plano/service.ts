import { withTenantContext } from "@/server/db/tenant-context";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import type { CriarPlanoInput, CriarSecaoInput, EditarPlanoInput, EditarSecaoInput } from "./schema";

/**
 * O plano que o fiel lê: o mais recente que está publicado.
 *
 * Mais recente, e não "o do ano corrente": em janeiro a paróquia ainda está
 * escrevendo o plano novo, e mostrar tela vazia porque o ano virou apagaria
 * o rumo que ainda vale.
 */
export function obterPlanoPublicado(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.planoPastoral.findFirst({
      where: { parishId, publicado: true },
      orderBy: { ano: "desc" },
      include: { secoes: { orderBy: { ordem: "asc" } } },
    }),
  );
}

/**
 * Existe plano publicado?
 *
 * Separado de `obterPlanoPublicado` porque a pergunta da tela Comunidade é
 * só "mostro o link?", e carregar vinte seções para responder um sim ou não
 * seria pagar o plano inteiro numa página que não vai exibi-lo.
 */
export async function temPlanoPublicado(parishId: string): Promise<boolean> {
  const achado = await withTenantContext(parishId, (tx) =>
    tx.planoPastoral.findFirst({ where: { parishId, publicado: true }, select: { id: true } }),
  );
  return achado !== null;
}

/** Todos os planos, publicados ou não — tela de quem escreve. */
export function listarPlanos(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.planoPastoral.findMany({
      where: { parishId },
      orderBy: { ano: "desc" },
      include: { secoes: { orderBy: { ordem: "asc" } } },
    }),
  );
}

export function criarPlano(input: CriarPlanoInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    const jaTem = await tx.planoPastoral.findFirst({
      where: { parishId: input.parishId, ano: input.ano },
      select: { id: true },
    });
    if (jaTem) {
      throw new ValidationError(
        `A paróquia já tem um plano de ${input.ano}. Edite o que existe em vez de criar outro.`,
      );
    }

    return tx.planoPastoral.create({
      data: {
        parishId: input.parishId,
        ano: input.ano,
        titulo: input.titulo,
        introducao: input.introducao || null,
        createdBy: input.createdBy,
      },
    });
  });
}

export function editarPlano(input: EditarPlanoInput & { parishId: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    await exigirPlano(tx, input.parishId, input.planoId);
    return tx.planoPastoral.update({
      where: { id: input.planoId },
      data: { ano: input.ano, titulo: input.titulo, introducao: input.introducao || null },
    });
  });
}

/**
 * Publica ou volta para rascunho.
 *
 * Publicar um plano sem seção nenhuma daria ao fiel uma página com título e
 * mais nada — o tipo de tela vazia que faz a pessoa achar que o app quebrou.
 */
export function definirPublicacao(parishId: string, planoId: string, publicado: boolean) {
  return withTenantContext(parishId, async (tx) => {
    const plano = await exigirPlano(tx, parishId, planoId);
    if (publicado && plano.secoes === 0) {
      throw new ValidationError("Escreva ao menos uma seção antes de publicar o plano.");
    }
    return tx.planoPastoral.update({ where: { id: planoId }, data: { publicado } });
  });
}

export function apagarPlano(parishId: string, planoId: string) {
  return withTenantContext(parishId, async (tx) => {
    await exigirPlano(tx, parishId, planoId);
    // As seções vão junto por ON DELETE CASCADE.
    return tx.planoPastoral.delete({ where: { id: planoId } });
  });
}

export function criarSecao(input: CriarSecaoInput & { parishId: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    await exigirPlano(tx, input.parishId, input.planoId);

    /*
     * A nova seção entra no fim. `ordem` não é única de propósito: renumerar
     * um documento inteiro a cada inserção é o tipo de aritmética que erra
     * calada, e o plano é lido em ordem, não indexado por posição.
     */
    const ultima = await tx.planoSecao.findFirst({
      where: { planoId: input.planoId },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    return tx.planoSecao.create({
      data: {
        parishId: input.parishId,
        planoId: input.planoId,
        ordem: (ultima?.ordem ?? 0) + 1,
        rotulo: input.rotulo || null,
        titulo: input.titulo,
        corpo: input.corpo,
      },
    });
  });
}

export function editarSecao(input: EditarSecaoInput & { parishId: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    await exigirSecao(tx, input.parishId, input.secaoId);
    return tx.planoSecao.update({
      where: { id: input.secaoId },
      data: { rotulo: input.rotulo || null, titulo: input.titulo, corpo: input.corpo },
    });
  });
}

export function apagarSecao(parishId: string, secaoId: string) {
  return withTenantContext(parishId, async (tx) => {
    await exigirSecao(tx, parishId, secaoId);
    return tx.planoSecao.delete({ where: { id: secaoId } });
  });
}

/**
 * Sobe ou desce uma seção, trocando de lugar com a vizinha.
 *
 * Troca de pares em vez de renumerar tudo: o movimento que a pessoa fez é
 * exatamente um, e a operação sobre o banco também deve ser. Na ponta não
 * acontece nada — mover a primeira para cima é um clique sem efeito, e não
 * um erro.
 */
export function moverSecao(parishId: string, secaoId: string, direcao: "cima" | "baixo") {
  return withTenantContext(parishId, async (tx) => {
    const secao = await exigirSecao(tx, parishId, secaoId);

    const vizinha = await tx.planoSecao.findFirst({
      where:
        direcao === "cima"
          ? { planoId: secao.planoId, ordem: { lt: secao.ordem } }
          : { planoId: secao.planoId, ordem: { gt: secao.ordem } },
      orderBy: { ordem: direcao === "cima" ? "desc" : "asc" },
      select: { id: true, ordem: true },
    });
    if (!vizinha) return secao;

    await tx.planoSecao.update({ where: { id: secao.id }, data: { ordem: vizinha.ordem } });
    await tx.planoSecao.update({ where: { id: vizinha.id }, data: { ordem: secao.ordem } });
    return secao;
  });
}

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];

/**
 * Confirma que o plano é DESTA paróquia antes de mexer nele.
 *
 * O RLS já barra o acesso entre paróquias, mas ele responde com "não
 * existe", e um `update` cego sobre um id de fora falharia com erro de
 * banco em vez de mensagem. Aqui a resposta é a mesma que a pessoa veria se
 * o plano tivesse sido apagado, que é a verdade do ponto de vista dela.
 */
async function exigirPlano(tx: Tx, parishId: string, planoId: string) {
  const plano = await tx.planoPastoral.findFirst({
    where: { id: planoId, parishId },
    select: { id: true, _count: { select: { secoes: true } } },
  });
  if (!plano) throw new NotFoundError("Plano pastoral");
  return { id: plano.id, secoes: plano._count.secoes };
}

async function exigirSecao(tx: Tx, parishId: string, secaoId: string) {
  const secao = await tx.planoSecao.findFirst({
    where: { id: secaoId, parishId },
    select: { id: true, planoId: true, ordem: true },
  });
  if (!secao) throw new NotFoundError("Seção do plano");
  return secao;
}
