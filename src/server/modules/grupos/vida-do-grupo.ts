import "server-only";
import type { PapelNoGrupo } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { withOwnMembershipLookup, withPlatformContext, withTenantContext } from "@/server/db/tenant-context";
import { generateOpaqueToken } from "@/server/auth/tokens";
import { ValidationError } from "@/server/shared/errors";
import { notifyManyUsers, registrarEnvio } from "@/server/modules/notifications/service";
import { sendToUsers } from "@/server/modules/push/service";
import { incluirNoGrupo } from "./service";

/**
 * A vida de um grupo entre um encontro e outro.
 *
 * Fase 1 da revisão de 25/09/2026. A coordenação falava com o grupo pelo
 * WhatsApp, marcava presença de cabeça e distribuía o lanche no grito — e
 * nada disso ficava em lugar nenhum. Aqui está o que um grupo precisa para
 * se organizar sem depender da memória de quem coordena:
 *
 * - RECADOS da coordenação, que chegam a cada membro;
 * - CHAMADA dos encontros, e o alerta de quem está se afastando;
 * - TAREFAS de cada encontro, com responsável;
 * - o CONVITE do grupo por link, para quem não se acha pelo nome;
 * - o lembrete de INTERESSE parado, para ninguém ficar sem resposta.
 */

// ---- recados ---------------------------------------------------------------

const LIMITE_DO_RECADO = 2000;

export async function publicarRecado(parishId: string, groupId: string, autorId: string, texto: string) {
  const limpo = texto.trim();
  if (!limpo) throw new ValidationError("Escreva o recado.");
  if (limpo.length > LIMITE_DO_RECADO) throw new ValidationError("O recado passou de 2.000 letras. Resuma.");

  const { grupo, destinatarios } = await withTenantContext(parishId, async (tx) => {
    const grupo = await tx.pastoralGroup.findFirst({ where: { id: groupId, parishId }, select: { name: true } });
    if (!grupo) throw new ValidationError("Grupo não encontrado.");
    await tx.recadoDoGrupo.create({ data: { parishId, groupId, autorId, texto: limpo } });

    const membros = await tx.membroDoGrupo.findMany({ where: { parishId, groupId }, select: { userId: true } });
    const destinatarios = membros.map((m) => m.userId).filter((id) => id !== autorId);
    await notifyManyUsers(
      tx,
      parishId,
      destinatarios,
      "pastoral",
      `Recado de ${grupo.name}`,
      limpo.length > 140 ? `${limpo.slice(0, 137)}…` : limpo,
      `/comunidade/pastorais/${groupId}`,
    );
    return { grupo, destinatarios };
  });

  // O push depois da transação: aparelho fora do ar não desfaz o recado.
  await sendToUsers(destinatarios, {
    title: `Recado de ${grupo.name}`,
    body: limpo.length > 140 ? `${limpo.slice(0, 137)}…` : limpo,
    url: `/comunidade/pastorais/${groupId}`,
    tag: `recado-${groupId}`,
  });
  return { avisados: destinatarios.length };
}

export function listarRecados(parishId: string, groupId: string, limite = 20) {
  return withTenantContext(parishId, (tx) =>
    tx.recadoDoGrupo.findMany({
      where: { parishId, groupId },
      orderBy: { createdAt: "desc" },
      take: limite,
      select: { id: true, texto: true, createdAt: true, autor: { select: { fullName: true } } },
    }),
  );
}

export function apagarRecado(parishId: string, groupId: string, recadoId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.recadoDoGrupo.deleteMany({ where: { id: recadoId, parishId, groupId } }),
  );
}

// ---- chamada ---------------------------------------------------------------

/** Faltas seguidas que acendem o alerta de "se afastando". */
export const FALTAS_PARA_ALERTA = 3;

/**
 * Quem está se afastando: as últimas N chamadas feitas em que a pessoa
 * aparece são todas faltas.
 *
 * Pura, para ser testada sem banco. Recebe, por pessoa, as presenças em
 * ordem do encontro MAIS RECENTE para o mais antigo.
 */
export function estaSeAfastando(presencasRecentes: boolean[], faltas = FALTAS_PARA_ALERTA): boolean {
  if (presencasRecentes.length < faltas) return false;
  return presencasRecentes.slice(0, faltas).every((presente) => !presente);
}

/** A chamada de um encontro: cada membro, e se já foi marcado. */
export function chamadaDoEncontro(parishId: string, groupId: string, encontroId: string) {
  return withTenantContext(parishId, async (tx) => {
    const [membros, presencas] = await Promise.all([
      tx.membroDoGrupo.findMany({
        where: { parishId, groupId },
        select: { userId: true, papel: true, user: { select: { fullName: true } } },
      }),
      tx.presencaNoEncontro.findMany({ where: { parishId, encontroId }, select: { userId: true, presente: true } }),
    ]);
    const marcada = new Map(presencas.map((p) => [p.userId, p.presente]));
    return membros
      .map((m) => ({ userId: m.userId, fullName: m.user.fullName, papel: m.papel, presente: marcada.get(m.userId) ?? null }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  });
}

/**
 * Salva a chamada de um encontro e avisa a coordenação de quem acabou de
 * completar a sequência de faltas.
 *
 * O aviso sai UMA vez por pessoa e por encontro (registro de envio): refazer
 * a chamada do mesmo domingo não repete o alerta.
 */
export async function salvarChamada(
  parishId: string,
  groupId: string,
  encontroId: string,
  marcadaPor: string,
  presencas: { userId: string; presente: boolean }[],
): Promise<{ salvas: number; seAfastando: string[] }> {
  return withTenantContext(parishId, async (tx) => {
    const encontro = await tx.encontroDoGrupo.findFirst({
      where: { id: encontroId, parishId, groupId },
      select: { id: true, group: { select: { name: true } } },
    });
    if (!encontro) throw new ValidationError("Encontro não encontrado.");

    const membros = new Set(
      (await tx.membroDoGrupo.findMany({ where: { parishId, groupId }, select: { userId: true } })).map((m) => m.userId),
    );
    const validas = presencas.filter((p) => membros.has(p.userId));

    for (const p of validas) {
      await tx.presencaNoEncontro.upsert({
        where: { encontroId_userId: { encontroId, userId: p.userId } },
        update: { presente: p.presente, marcadaPor },
        create: { parishId, encontroId, userId: p.userId, presente: p.presente, marcadaPor },
      });
    }

    const ausentes = validas.filter((p) => !p.presente).map((p) => p.userId);
    const seAfastando: string[] = [];
    for (const userId of ausentes) {
      const historico = await tx.presencaNoEncontro.findMany({
        where: { parishId, userId, encontro: { groupId } },
        orderBy: [{ encontro: { data: "desc" } }, { createdAt: "desc" }],
        take: FALTAS_PARA_ALERTA,
        select: { presente: true },
      });
      if (estaSeAfastando(historico.map((h) => h.presente))) seAfastando.push(userId);
    }

    if (seAfastando.length > 0) {
      const coordenacao = await tx.membroDoGrupo.findMany({
        where: { parishId, groupId, papel: "coordenador" },
        select: { userId: true },
      });
      const nomes = await tx.user.findMany({ where: { id: { in: seAfastando } }, select: { id: true, fullName: true } });
      for (const pessoa of nomes) {
        if (!(await registrarEnvio(tx, parishId, `afastando:${encontroId}:${pessoa.id}`))) continue;
        await notifyManyUsers(
          tx,
          parishId,
          coordenacao.map((c) => c.userId),
          "pastoral",
          `${pessoa.fullName} faltou aos últimos ${FALTAS_PARA_ALERTA} encontros`,
          `Talvez valha uma palavra — em ${encontro.group.name}, ninguém some sem que alguém perceba.`,
          `/comunidade/pastorais/${groupId}#coordenacao`,
        );
      }
    }

    return { salvas: validas.length, seAfastando };
  });
}

/** Quem está se afastando agora, para a página da coordenação. */
export function quemEstaSeAfastando(parishId: string, groupId: string) {
  return withTenantContext(parishId, async (tx) => {
    const membros = await tx.membroDoGrupo.findMany({
      where: { parishId, groupId },
      select: { userId: true, user: { select: { fullName: true } } },
    });
    const resultado: { userId: string; fullName: string }[] = [];
    for (const m of membros) {
      const historico = await tx.presencaNoEncontro.findMany({
        where: { parishId, userId: m.userId, encontro: { groupId } },
        orderBy: [{ encontro: { data: "desc" } }, { createdAt: "desc" }],
        take: FALTAS_PARA_ALERTA,
        select: { presente: true },
      });
      if (estaSeAfastando(historico.map((h) => h.presente))) resultado.push({ userId: m.userId, fullName: m.user.fullName });
    }
    return resultado;
  });
}

// ---- tarefas ---------------------------------------------------------------

export async function criarTarefa(
  parishId: string,
  groupId: string,
  encontroId: string,
  descricao: string,
  responsavelId: string | null,
) {
  const limpa = descricao.trim();
  if (!limpa) throw new ValidationError("Diga qual é a tarefa.");
  if (limpa.length > 120) throw new ValidationError("A tarefa cabe em até 120 letras.");

  return withTenantContext(parishId, async (tx) => {
    const encontro = await tx.encontroDoGrupo.findFirst({ where: { id: encontroId, parishId, groupId }, select: { id: true } });
    if (!encontro) throw new ValidationError("Encontro não encontrado.");
    if (responsavelId) {
      const membro = await tx.membroDoGrupo.findUnique({ where: { groupId_userId: { groupId, userId: responsavelId } } });
      if (!membro) throw new ValidationError("A tarefa só pode ficar com alguém do grupo.");
    }
    return tx.tarefaDoEncontro.create({ data: { parishId, encontroId, descricao: limpa, responsavelId } });
  });
}

export function apagarTarefa(parishId: string, groupId: string, tarefaId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.tarefaDoEncontro.deleteMany({ where: { id: tarefaId, parishId, encontro: { groupId } } }),
  );
}

/** Um membro assume uma tarefa sem dono — "deixa que eu levo o lanche". */
export async function assumirTarefa(parishId: string, groupId: string, tarefaId: string, userId: string) {
  return withTenantContext(parishId, async (tx) => {
    const membro = await tx.membroDoGrupo.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!membro) throw new ValidationError("Só quem é do grupo assume tarefa.");
    const { count } = await tx.tarefaDoEncontro.updateMany({
      where: { id: tarefaId, parishId, responsavelId: null, encontro: { groupId } },
      data: { responsavelId: userId },
    });
    if (count === 0) throw new ValidationError("Essa tarefa já tem alguém.");
  });
}

export function tarefasDosEncontros(parishId: string, encontroIds: string[]) {
  if (encontroIds.length === 0) return Promise.resolve([]);
  return withTenantContext(parishId, (tx) =>
    tx.tarefaDoEncontro.findMany({
      where: { parishId, encontroId: { in: encontroIds } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        encontroId: true,
        descricao: true,
        responsavelId: true,
        responsavel: { select: { fullName: true } },
      },
    }),
  );
}

// ---- entrar no grupo -------------------------------------------------------

/**
 * Gera (ou troca) o link de convite do grupo. O antigo para de valer: é o
 * jeito de fechar um link que circulou onde não devia.
 */
export async function gerarConviteDoGrupo(parishId: string, groupId: string): Promise<string> {
  const token = generateOpaqueToken().slice(0, 24);
  const { count } = await withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.updateMany({ where: { id: groupId, parishId }, data: { conviteToken: token } }),
  );
  if (count === 0) throw new ValidationError("Grupo não encontrado.");
  return token;
}

/**
 * Entrar no grupo pelo link que a coordenação mandou.
 *
 * O link É o gesto da coordenação — ela escolheu a quem mandar —, então
 * quem abre entra direto, como membro. Mas só quem é da mesma paróquia:
 * o link não serve de porta dos fundos para outra comunidade.
 */
export async function entrarPeloConvite(
  token: string,
  userId: string,
): Promise<{ groupId: string; nome: string; jaEra: boolean }> {
  const grupo = await withPlatformContext((tx) =>
    tx.pastoralGroup.findUnique({
      where: { conviteToken: token },
      select: { id: true, name: true, parishId: true, status: true, createdBy: true },
    }),
  );
  if (!grupo || grupo.status !== "ativa") throw new ValidationError("Este convite não vale mais. Peça um novo à coordenação.");

  const vinculo = await withOwnMembershipLookup(userId, (tx) =>
    tx.parishMembership.findFirst({ where: { userId, status: "active" }, select: { parishId: true } }),
  );
  if (vinculo?.parishId !== grupo.parishId) {
    throw new ValidationError("Este grupo é de outra paróquia. Para entrar, a sua paróquia no app precisa ser a dele.");
  }

  const { jaEra } = await withTenantContext(grupo.parishId, (tx) =>
    incluirNoGrupo(tx, grupo.parishId, grupo.id, userId, "membro", grupo.createdBy),
  );
  return { groupId: grupo.id, nome: grupo.name, jaEra };
}

/** Adicionar pelo e-mail — o caminho quando há duas pessoas com o mesmo nome. */
export async function adicionarMembroPorEmail(
  parishId: string,
  groupId: string,
  email: string,
  papel: PapelNoGrupo,
  addedBy: string,
): Promise<{ fullName: string; jaEra: boolean }> {
  const alvo = email.trim().toLowerCase();
  const usuario = await prisma.user.findUnique({ where: { email: alvo }, select: { id: true, fullName: true } });
  const ehDaParoquia = usuario
    ? await withTenantContext(parishId, (tx) =>
        tx.parishMembership.findFirst({ where: { parishId, userId: usuario.id, status: "active" } }),
      )
    : null;
  if (!usuario || !ehDaParoquia) {
    throw new ValidationError("Não achei ninguém da paróquia com esse e-mail. Confira como a pessoa se cadastrou.");
  }
  const { jaEra } = await withTenantContext(parishId, (tx) =>
    incluirNoGrupo(tx, parishId, groupId, usuario.id, papel, addedBy),
  );
  return { fullName: usuario.fullName, jaEra };
}

// ---- interesse parado ------------------------------------------------------

/** Dias sem resposta até a coordenação ser lembrada. */
export const DIAS_DE_INTERESSE_PARADO = 7;

/**
 * Lembra a coordenação dos interesses sem resposta há uma semana.
 *
 * Roda no robô diário, paróquia por paróquia, e lembra UMA vez por
 * interesse: a ideia é não deixar ninguém esquecido, e não virar insistência
 * diária sobre quem coordena.
 */
export async function lembrarInteressesParados(agora: Date): Promise<number> {
  const limite = new Date(agora.getTime() - DIAS_DE_INTERESSE_PARADO * 86_400_000);
  const paroquias = await prisma.parish.findMany({ select: { id: true } });
  let lembrados = 0;

  for (const { id: parishId } of paroquias) {
    lembrados += await withTenantContext(parishId, async (tx) => {
      const parados = await tx.pastoralGroupInterest.findMany({
        where: { parishId, status: "manifestado", createdAt: { lt: limite }, group: { status: "ativa" } },
        select: {
          id: true,
          groupId: true,
          user: { select: { fullName: true } },
          group: { select: { name: true, createdBy: true } },
        },
      });
      let n = 0;
      for (const interesse of parados) {
        if (!(await registrarEnvio(tx, parishId, `interesse-parado:${interesse.id}`))) continue;
        const coordenacao = await tx.membroDoGrupo.findMany({
          where: { parishId, groupId: interesse.groupId, papel: "coordenador" },
          select: { userId: true },
        });
        const destinatarios = [...new Set([interesse.group.createdBy, ...coordenacao.map((c) => c.userId)])];
        await notifyManyUsers(
          tx,
          parishId,
          destinatarios,
          "pastoral",
          `${interesse.user.fullName} ainda espera uma resposta`,
          `Faz uma semana que pediu para entrar em ${interesse.group.name}.`,
          `/comunidade/pastorais/${interesse.groupId}#coordenacao`,
        );
        n += 1;
      }
      return n;
    });
  }
  return lembrados;
}
