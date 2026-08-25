import { withTenantContext } from "@/server/db/tenant-context";
import type { DonationCategory, DizimoCtaTipo } from "@prisma/client";

/**
 * Área de doação da paróquia.
 *
 * Tudo passa por withTenantContext: o isolamento entre paróquias é do
 * Postgres, via RLS, e não de um `where` que alguém pode esquecer. Vale
 * dobrado aqui, onde o dado é financeiro.
 */

export function getDonationSettings(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationSettings.findUnique({ where: { parishId } }),
  );
}

export type DonationSettingsInput = {
  pixKey: string | null;
  pixKeyType: string | null;
  pixPayload: string | null;
  dizimoAtivo: boolean;
  dizimoTitulo: string | null;
  dizimoTexto: string | null;
  dizimoCtaLabel: string | null;
  dizimoCtaTipo: DizimoCtaTipo | null;
  dizimoCtaValor: string | null;
};

export function upsertDonationSettings(parishId: string, dados: DonationSettingsInput) {
  return withTenantContext(parishId, (tx) =>
    tx.donationSettings.upsert({
      where: { parishId },
      create: { parishId, ...dados },
      update: dados,
    }),
  );
}

/** Para o fiel: só o que está ativo, na ordem que a paróquia definiu. */
export function listPurposesForFiel(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationPurpose.findMany({
      where: { parishId, active: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
  );
}

/** Para o painel: também o que está desativado, senão não dá para reativar. */
export function listPurposesForAdmin(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationPurpose.findMany({
      where: { parishId },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
  );
}

export function listInitiativesForFiel(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationInitiative.findMany({
      where: { parishId, active: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
  );
}

export function listInitiativesForAdmin(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationInitiative.findMany({
      where: { parishId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
  );
}

/** Novo item entra no fim da fila, sem empurrar ninguém. */
async function proximaOrdem(
  tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
  tabela: "donationPurpose" | "donationInitiative",
  parishId: string,
): Promise<number> {
  const ultimo = await (tx[tabela] as typeof tx.donationPurpose).findFirst({
    where: { parishId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  return (ultimo?.displayOrder ?? -1) + 1;
}

export function createPurpose(
  parishId: string,
  dados: { title: string; description: string; icon: string },
) {
  return withTenantContext(parishId, async (tx) =>
    tx.donationPurpose.create({
      data: { parishId, ...dados, displayOrder: await proximaOrdem(tx, "donationPurpose", parishId) },
    }),
  );
}

export function updatePurpose(
  parishId: string,
  id: string,
  dados: { title: string; description: string; icon: string },
) {
  // O parishId no where fecha a porta para editar item de outra paróquia
  // mandando um id de fora no formulário — mesmo antes da RLS entrar.
  return withTenantContext(parishId, (tx) =>
    tx.donationPurpose.updateMany({ where: { id, parishId }, data: dados }),
  );
}

export function setPurposeActive(parishId: string, id: string, active: boolean) {
  return withTenantContext(parishId, (tx) =>
    tx.donationPurpose.updateMany({ where: { id, parishId }, data: { active } }),
  );
}

export function deletePurpose(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationPurpose.deleteMany({ where: { id, parishId } }),
  );
}

export type InitiativeInput = {
  title: string;
  description: string;
  imageUrl: string | null;
  icon: string;
  category: DonationCategory;
  startsOn: Date | null;
  endsOn: Date | null;
};

export function createInitiative(parishId: string, dados: InitiativeInput) {
  return withTenantContext(parishId, async (tx) =>
    tx.donationInitiative.create({
      data: {
        parishId,
        ...dados,
        displayOrder: await proximaOrdem(tx, "donationInitiative", parishId),
      },
    }),
  );
}

export function updateInitiative(parishId: string, id: string, dados: InitiativeInput) {
  return withTenantContext(parishId, (tx) =>
    tx.donationInitiative.updateMany({ where: { id, parishId }, data: dados }),
  );
}

export function setInitiativeActive(parishId: string, id: string, active: boolean) {
  return withTenantContext(parishId, (tx) =>
    tx.donationInitiative.updateMany({ where: { id, parishId }, data: { active } }),
  );
}

export function deleteInitiative(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.donationInitiative.deleteMany({ where: { id, parishId } }),
  );
}

/**
 * Sobe ou desce um item, trocando de lugar com o vizinho.
 *
 * Troca em vez de renumerar tudo: duas linhas mudam, e a ordem dos outros
 * fica onde estava. Dentro de uma transação, para não existir instante em
 * que dois itens dividem a mesma posição.
 */
export function moverItem(
  parishId: string,
  tabela: "donationPurpose" | "donationInitiative",
  id: string,
  direcao: "cima" | "baixo",
) {
  return withTenantContext(parishId, async (tx) => {
    const modelo = tx[tabela] as typeof tx.donationPurpose;

    const atual = await modelo.findFirst({ where: { id, parishId } });
    if (!atual) return;

    const vizinho = await modelo.findFirst({
      where: {
        parishId,
        displayOrder: direcao === "cima" ? { lt: atual.displayOrder } : { gt: atual.displayOrder },
      },
      orderBy: { displayOrder: direcao === "cima" ? "desc" : "asc" },
    });
    // Já está na ponta: nada a fazer, e nada de erro na cara de quem clicou.
    if (!vizinho) return;

    await modelo.update({ where: { id: atual.id }, data: { displayOrder: vizinho.displayOrder } });
    await modelo.update({ where: { id: vizinho.id }, data: { displayOrder: atual.displayOrder } });
  });
}
