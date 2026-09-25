import "server-only";
import type { TipoDeIntencao } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";

/**
 * Intenções de missa: o fluxo mais diário do balcão da secretaria.
 *
 * SEM VALOR. Intenção de missa não tem preço, nem opcional — decisão do
 * usuário em 18/09/2026, anotada na memória do projeto. Não existe aqui
 * campo de dinheiro, Pix ou espórtula; quem quiser ofertar usa o Ofertar.
 *
 * Dois caminhos de entrada, e um só rol:
 * - o FIEL pede pelo app, e a intenção fica "pedida" até a secretaria
 *   conferir — é ela quem sabe se a missa ainda cabe mais nomes;
 * - a SECRETARIA registra no balcão, já confirmada.
 * O rol de cada missa, pronto para imprimir e ler no ambão, só traz as
 * confirmadas, agrupadas por tipo na ordem em que costumam ser lidas.
 */

export const ROTULO_DA_INTENCAO: Record<TipoDeIntencao, string> = {
  sufragio: "Pelas almas",
  setimo_dia: "Missa de 7º dia",
  trigesimo_dia: "Missa de 30º dia",
  acao_de_gracas: "Em ação de graças",
  saude: "Pela saúde",
  aniversario: "Pelo aniversário",
  outra: "Outras intenções",
};

/** A ordem de leitura no ambão: primeiro os que partiram, depois os vivos. */
export const ORDEM_DE_LEITURA: TipoDeIntencao[] = [
  "setimo_dia",
  "trigesimo_dia",
  "sufragio",
  "acao_de_gracas",
  "aniversario",
  "saude",
  "outra",
];

const TIPOS = new Set<string>(ORDEM_DE_LEITURA);
const LIMITE_DO_TEXTO = 200;
/** Até quando se pode pedir: uma missa daqui a mais de dois meses ainda nem foi gerada. */
const DIAS_A_FRENTE = 60;

function validar(tipo: string, texto: string): { tipo: TipoDeIntencao; texto: string } {
  if (!TIPOS.has(tipo)) throw new ValidationError("Escolha o tipo da intenção.");
  const limpo = texto.trim().replace(/\s+/g, " ");
  if (limpo.length < 3) throw new ValidationError("Escreva os nomes ou o motivo da intenção.");
  if (limpo.length > LIMITE_DO_TEXTO) throw new ValidationError("A intenção cabe em até 200 letras.");
  return { tipo: tipo as TipoDeIntencao, texto: limpo };
}

/** As missas em que ainda se pode pôr intenção: futuras, não canceladas. */
export function missasParaIntencao(parishId: string, agora: Date) {
  const ate = new Date(agora.getTime() + DIAS_A_FRENTE * 86_400_000);
  return withTenantContext(parishId, (tx) =>
    tx.celebration.findMany({
      where: { parishId, type: "missa", canceledAt: null, startsAt: { gt: agora, lte: ate } },
      orderBy: { startsAt: "asc" },
      take: 80,
      select: { id: true, startsAt: true, title: true, location: true },
    }),
  );
}

async function missaValida(parishId: string, celebrationId: string, agora: Date) {
  const missa = await withTenantContext(parishId, (tx) =>
    tx.celebration.findFirst({
      where: { id: celebrationId, parishId, type: "missa", canceledAt: null },
      select: { id: true, startsAt: true },
    }),
  );
  if (!missa) throw new ValidationError("Escolha uma missa da lista.");
  if (missa.startsAt <= agora) throw new ValidationError("Essa missa já aconteceu. Escolha uma das próximas.");
  return missa;
}

/** O fiel pede pelo app. Fica "pedida" até a secretaria conferir. */
export async function pedirIntencao(
  parishId: string,
  userId: string,
  dados: { celebrationId: string; tipo: string; texto: string },
  agora = new Date(),
) {
  const { tipo, texto } = validar(dados.tipo, dados.texto);
  await missaValida(parishId, dados.celebrationId, agora);
  return withTenantContext(parishId, (tx) =>
    tx.intencaoDeMissa.create({
      data: { parishId, celebrationId: dados.celebrationId, tipo, texto, pedidoPorId: userId, estado: "pedida" },
    }),
  );
}

/** A secretaria registra no balcão — já confirmada. */
export async function registrarNoBalcao(
  parishId: string,
  registradaPor: string,
  dados: { celebrationId: string; tipo: string; texto: string; pedidoPorNome?: string | null },
  agora = new Date(),
) {
  const { tipo, texto } = validar(dados.tipo, dados.texto);
  await missaValida(parishId, dados.celebrationId, agora);
  return withTenantContext(parishId, (tx) =>
    tx.intencaoDeMissa.create({
      data: {
        parishId,
        celebrationId: dados.celebrationId,
        tipo,
        texto,
        pedidoPorNome: dados.pedidoPorNome?.trim() || null,
        estado: "confirmada",
        registradaPor,
      },
    }),
  );
}

export async function confirmarIntencao(parishId: string, intencaoId: string, por: string) {
  const { count } = await withTenantContext(parishId, (tx) =>
    tx.intencaoDeMissa.updateMany({
      where: { id: intencaoId, parishId, estado: "pedida" },
      data: { estado: "confirmada", registradaPor: por },
    }),
  );
  if (count === 0) throw new ValidationError("Essa intenção já foi conferida ou não existe mais.");
}

export function apagarIntencao(parishId: string, intencaoId: string) {
  return withTenantContext(parishId, (tx) => tx.intencaoDeMissa.deleteMany({ where: { id: intencaoId, parishId } }));
}

/** O fiel desiste do próprio pedido, enquanto ainda não foi conferido. */
export async function retirarMeuPedido(parishId: string, userId: string, intencaoId: string) {
  const { count } = await withTenantContext(parishId, (tx) =>
    tx.intencaoDeMissa.deleteMany({ where: { id: intencaoId, parishId, pedidoPorId: userId, estado: "pedida" } }),
  );
  if (count === 0) throw new ValidationError("Esse pedido já foi conferido pela secretaria. Fale com ela.");
}

export function minhasIntencoes(parishId: string, userId: string, agora: Date) {
  return withTenantContext(parishId, (tx) =>
    tx.intencaoDeMissa.findMany({
      where: { parishId, pedidoPorId: userId, celebration: { startsAt: { gt: agora } } },
      orderBy: { celebration: { startsAt: "asc" } },
      select: {
        id: true,
        tipo: true,
        texto: true,
        estado: true,
        celebration: { select: { startsAt: true, title: true } },
      },
    }),
  );
}

/** Para o painel: os pedidos a conferir e as próximas missas com o total do rol. */
export function intencoesDoPainel(parishId: string, agora: Date, dias = 14) {
  const ate = new Date(agora.getTime() + dias * 86_400_000);
  return withTenantContext(parishId, async (tx) => {
    const [pedidas, missas] = await Promise.all([
      tx.intencaoDeMissa.findMany({
        where: { parishId, estado: "pedida", celebration: { startsAt: { gt: agora } } },
        orderBy: { celebration: { startsAt: "asc" } },
        select: {
          id: true,
          tipo: true,
          texto: true,
          pedidoPor: { select: { fullName: true } },
          celebration: { select: { id: true, startsAt: true } },
        },
      }),
      tx.celebration.findMany({
        where: { parishId, type: "missa", canceledAt: null, startsAt: { gt: agora, lte: ate } },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          title: true,
          _count: { select: { intencoes: { where: { estado: "confirmada" } } } },
        },
      }),
    ]);
    return { pedidas, missas };
  });
}

/** O rol de uma missa: as confirmadas, na ordem em que o leitor as lê. */
export function rolDaMissa(parishId: string, celebrationId: string) {
  return withTenantContext(parishId, async (tx) => {
    const missa = await tx.celebration.findFirst({
      where: { id: celebrationId, parishId },
      select: { id: true, startsAt: true, title: true, location: true, parish: { select: { name: true } } },
    });
    if (!missa) return null;
    const intencoes = await tx.intencaoDeMissa.findMany({
      where: { parishId, celebrationId, estado: "confirmada" },
      orderBy: { createdAt: "asc" },
      select: { id: true, tipo: true, texto: true },
    });
    const grupos = ORDEM_DE_LEITURA.map((tipo) => ({
      tipo,
      rotulo: ROTULO_DA_INTENCAO[tipo],
      itens: intencoes.filter((i) => i.tipo === tipo).map((i) => ({ id: i.id, texto: i.texto })),
    })).filter((g) => g.itens.length > 0);
    return { missa, grupos, total: intencoes.length };
  });
}
