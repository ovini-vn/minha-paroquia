import type { PapelNoGrupo, Prisma } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { findMemberByExactName } from "@/server/modules/parishes/service";
import { notifyUser } from "@/server/modules/notifications/service";
import { ESPERANDO_CONTATO } from "@/server/modules/pastorais/service";
import {
  diaDoBanco,
  ehChaveDeIcone,
  emOrdem,
  lerCronograma,
  palpiteDeIcone,
  paraOBanco,
  proximoEncontro,
  type ErroDeLeitura,
} from "@/lib/grupos/cronograma";

/**
 * A vida de um grupo: quem faz parte e o cronograma de encontros.
 *
 * Nasceu do Colo de Mãe (CDM), o grupo de adolescentes que saíram da
 * catequese, mas não é dele: qualquer pastoral cadastrada em "Grupos e
 * pastorais" ganha membros e cronograma do mesmo jeito. O grupo continua
 * sendo o `PastoralGroup` de sempre — nome, coordenação, horário e local.
 *
 * QUEM GERE um grupo: quem gere as pastorais da paróquia (a permissão de
 * sempre, `opportunities.manage`) e os coordenadores DAQUELE grupo. Um
 * coordenador não alcança os outros grupos, nem nada da paróquia.
 *
 * O QUE CADA UM VÊ: o cronograma é de QUEM PARTICIPA. Um grupo não é um
 * mural da paróquia — é um grupo, como uma pastoral: quem está dentro
 * acompanha os encontros, quem está fora vê o convite e pede para entrar.
 * A lista de quem participa é mais restrita ainda: só a coordenação.
 */

/**
 * Quem enxerga o cronograma: quem faz parte do grupo, em qualquer papel, e
 * quem o administra (a coordenação dele e quem gere as pastorais).
 *
 * Função à parte, e testada, porque é regra de privacidade: espalhada pelas
 * telas, ela vira três versões que divergem no primeiro ajuste.
 */
export function podeVerOCronograma(papel: PapelNoGrupo | null, gereOGrupo: boolean): boolean {
  return gereOGrupo || papel !== null;
}

export type EncontroVisto = {
  id: string;
  data: string | null;
  dataFim: string | null;
  mesPrevisto: string | null;
  tema: string;
  complemento: string | null;
  pregador: string | null;
  destaque: boolean;
  icone: string | null;
};

type LinhaDeEncontro = {
  id: string;
  data: Date | null;
  dataFim: Date | null;
  mesPrevisto: string | null;
  tema: string;
  complemento: string | null;
  pregador: string | null;
  destaque: boolean;
  icone: string | null;
};

function visto(e: LinhaDeEncontro): EncontroVisto {
  return {
    id: e.id,
    data: e.data ? diaDoBanco(e.data) : null,
    dataFim: e.dataFim ? diaDoBanco(e.dataFim) : null,
    mesPrevisto: e.mesPrevisto,
    tema: e.tema,
    complemento: e.complemento,
    pregador: e.pregador,
    destaque: e.destaque,
    icone: e.icone,
  };
}

const CAMPOS_DO_ENCONTRO = {
  id: true,
  data: true,
  dataFim: true,
  mesPrevisto: true,
  tema: true,
  complemento: true,
  pregador: true,
  destaque: true,
  icone: true,
} as const;

// ---- o grupo -------------------------------------------------------------

export async function obterGrupo(parishId: string, groupId: string) {
  const grupo = await withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.findFirst({
      where: { id: groupId, parishId },
      include: { encontros: { select: CAMPOS_DO_ENCONTRO } },
    }),
  );
  if (!grupo) return null;
  const { encontros, ...resto } = grupo;
  return { ...resto, encontros: emOrdem(encontros.map(visto)) };
}

export async function papelNoGrupo(
  parishId: string,
  groupId: string,
  userId: string,
): Promise<PapelNoGrupo | null> {
  const membro = await withTenantContext(parishId, (tx) =>
    tx.membroDoGrupo.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { papel: true, parishId: true },
    }),
  );
  return membro && membro.parishId === parishId ? membro.papel : null;
}

/**
 * Pode mexer no grupo: quem gere as pastorais, ou quem coordena ESTE grupo.
 *
 * `gerePastorais` vem da sessão de quem chama (a permissão paroquial); o
 * papel no grupo vem do banco, porque é por grupo e não cabe na sessão.
 */
export async function podeGerirGrupo(
  parishId: string,
  groupId: string,
  userId: string,
  gerePastorais: boolean,
): Promise<boolean> {
  if (gerePastorais) return true;
  return (await papelNoGrupo(parishId, groupId, userId)) === "coordenador";
}

export type DadosDoGrupo = {
  name: string;
  description?: string | null;
  leaderName?: string | null;
  meetsWhen?: string | null;
  meetsWhere?: string | null;
};

/** O que o cartão do grupo diz: nome, descrição, coordenação, horário e local. */
export async function editarDadosDoGrupo(parishId: string, groupId: string, dados: DadosDoGrupo) {
  const name = dados.name.trim();
  if (!name) throw new ValidationError("Informe o nome do grupo.");
  const limpo = (v?: string | null) => v?.trim() || null;

  const { count } = await withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.updateMany({
      where: { id: groupId, parishId },
      data: {
        name,
        description: limpo(dados.description),
        leaderName: limpo(dados.leaderName),
        meetsWhen: limpo(dados.meetsWhen),
        meetsWhere: limpo(dados.meetsWhere),
      },
    }),
  );
  if (count === 0) throw new ValidationError("Grupo não encontrado.");
}

// ---- membros -------------------------------------------------------------

/** Quem faz parte, coordenação primeiro. Só para quem gere o grupo. */
export function listarMembros(parishId: string, groupId: string) {
  return withTenantContext(parishId, async (tx) => {
    const membros = await tx.membroDoGrupo.findMany({
      where: { parishId, groupId },
      select: { id: true, userId: true, papel: true, createdAt: true, user: { select: { fullName: true } } },
    });
    return membros
      .map((m) => ({ id: m.id, userId: m.userId, papel: m.papel, fullName: m.user.fullName, desde: m.createdAt }))
      .sort((a, b) =>
        a.papel === b.papel ? a.fullName.localeCompare(b.fullName, "pt-BR") : a.papel === "coordenador" ? -1 : 1,
      );
  });
}

/**
 * Quem pediu para entrar e ainda não entrou.
 *
 * O telefone vai junto porque é para isso que a lista existe: a
 * coordenação liga, conversa, e então acolhe. É o mesmo telefone que já ia
 * no aviso de "alguém quer entrar numa pastoral".
 */
export function listarInteressados(parishId: string, groupId: string) {
  return withTenantContext(parishId, async (tx) => {
    const [interesses, membros] = await Promise.all([
      tx.pastoralGroupInterest.findMany({
        where: { parishId, groupId, ...ESPERANDO_CONTATO },
        orderBy: { createdAt: "asc" },
        select: { userId: true, createdAt: true, user: { select: { fullName: true, phone: true } } },
      }),
      tx.membroDoGrupo.findMany({ where: { parishId, groupId }, select: { userId: true } }),
    ]);
    const jaSaoMembros = new Set(membros.map((m) => m.userId));
    return interesses
      .filter((i) => !jaSaoMembros.has(i.userId))
      .map((i) => ({ userId: i.userId, fullName: i.user.fullName, phone: i.user.phone, desde: i.createdAt }));
  });
}

/**
 * Põe alguém no grupo, ou muda o papel de quem já está.
 *
 * O interesse que a pessoa tinha manifestado vira "acolhido" — é a palavra
 * que a paróquia já usava para isso. E a pessoa é avisada: entrar num
 * grupo sem saber que entrou é descobrir por um lembrete de domingo.
 */
async function incluirNoGrupo(
  tx: Prisma.TransactionClient,
  parishId: string,
  groupId: string,
  userId: string,
  papel: PapelNoGrupo,
  addedBy: string,
): Promise<{ jaEra: boolean }> {
  const grupo = await tx.pastoralGroup.findFirst({ where: { id: groupId, parishId }, select: { name: true } });
  if (!grupo) throw new ValidationError("Grupo não encontrado.");

  const existente = await tx.membroDoGrupo.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (existente) {
    if (existente.papel !== papel) {
      await garantirOutroCoordenador(tx, parishId, groupId, existente.id, existente.papel, papel);
      await tx.membroDoGrupo.update({ where: { id: existente.id }, data: { papel } });
    }
    return { jaEra: true };
  }

  await tx.membroDoGrupo.create({ data: { parishId, groupId, userId, papel, addedBy } });
  await tx.pastoralGroupInterest.updateMany({
    where: { parishId, groupId, userId },
    data: { status: "acolhido" },
  });
  await notifyUser(tx, {
    parishId,
    userId,
    category: "pastoral",
    title: `Você agora faz parte de ${grupo.name}`,
    body:
      papel === "coordenador"
        ? "Você entrou na coordenação do grupo. O cronograma e quem participa estão na página dele."
        : "O próximo encontro aparece no seu Início, e o app avisa na véspera.",
    linkPath: `/comunidade/pastorais/${groupId}`,
  });
  return { jaEra: false };
}

/**
 * Um grupo que tinha coordenação não pode ficar sem.
 *
 * Sem isto, quem coordena sozinho se rebaixa por engano e perde o acesso à
 * própria página de gestão — e só a secretaria desfaz. Grupo que nunca teve
 * coordenador (cuidado direto pela paróquia) segue podendo não ter.
 */
async function garantirOutroCoordenador(
  tx: Prisma.TransactionClient,
  parishId: string,
  groupId: string,
  membroId: string,
  papelAtual: PapelNoGrupo,
  papelNovo: PapelNoGrupo | null,
): Promise<void> {
  if (papelAtual !== "coordenador" || papelNovo === "coordenador") return;
  const outros = await tx.membroDoGrupo.count({
    where: { parishId, groupId, papel: "coordenador", id: { not: membroId } },
  });
  if (outros === 0) {
    throw new ValidationError(
      "O grupo ficaria sem coordenação. Ponha outra pessoa como coordenadora antes.",
    );
  }
}

/**
 * Adiciona pelo NOME COMPLETO de quem já está no app, na paróquia.
 *
 * Não há lista para escolher, de propósito: o coordenador de um grupo não
 * é a secretaria, e a lista de quem frequenta a paróquia não é dele (ver
 * `findMemberByExactName`). Quem sabe o nome inteiro de quem está no grupo
 * é quem convive com essa pessoa.
 */
export async function adicionarMembroPorNome(
  parishId: string,
  groupId: string,
  nome: string,
  papel: PapelNoGrupo,
  addedBy: string,
): Promise<{ fullName: string; jaEra: boolean }> {
  const busca = await findMemberByExactName(parishId, nome);
  if (busca.situacao === "nao_encontrado") {
    throw new ValidationError(
      "Não achei ninguém na paróquia com esse nome completo. Confira como a pessoa escreveu o nome dela no app — e se ela já entrou na paróquia.",
    );
  }
  if (busca.situacao === "ambiguo") {
    throw new ValidationError(
      "Há mais de uma pessoa com esse nome na paróquia. Peça para ela manifestar interesse no grupo, e acolha pela lista.",
    );
  }

  const { jaEra } = await withTenantContext(parishId, (tx) =>
    incluirNoGrupo(tx, parishId, groupId, busca.userId, papel, addedBy),
  );
  return { fullName: busca.fullName, jaEra };
}

/** Acolhe quem manifestou interesse — o caminho comum de entrada. */
export async function acolherInteressado(parishId: string, groupId: string, userId: string, addedBy: string) {
  return withTenantContext(parishId, async (tx) => {
    const interesse = await tx.pastoralGroupInterest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!interesse || interesse.parishId !== parishId) {
      throw new ValidationError("Esta pessoa não pediu para entrar no grupo.");
    }
    return incluirNoGrupo(tx, parishId, groupId, userId, "membro", addedBy);
  });
}

/**
 * Tira alguém da lista de interessados sem pôr no grupo.
 *
 * Sem aviso à pessoa: a conversa sobre não entrar é de gente para gente, e
 * uma notificação dizendo "recusado" seria o jeito errado de tê-la.
 */
export function dispensarInteresse(parishId: string, groupId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroupInterest.updateMany({ where: { parishId, groupId, userId }, data: { status: "declinado" } }),
  );
}

export async function mudarPapel(parishId: string, groupId: string, membroId: string, papel: PapelNoGrupo) {
  await withTenantContext(parishId, async (tx) => {
    const membro = await tx.membroDoGrupo.findFirst({ where: { id: membroId, parishId, groupId } });
    if (!membro) throw new ValidationError("Esta pessoa não está no grupo.");
    if (membro.papel === papel) return;
    await garantirOutroCoordenador(tx, parishId, groupId, membro.id, membro.papel, papel);
    await tx.membroDoGrupo.update({ where: { id: membro.id }, data: { papel } });
  });
}

export async function removerMembro(parishId: string, groupId: string, membroId: string) {
  await withTenantContext(parishId, async (tx) => {
    const membro = await tx.membroDoGrupo.findFirst({ where: { id: membroId, parishId, groupId } });
    if (!membro) return;
    await garantirOutroCoordenador(tx, parishId, groupId, membro.id, membro.papel, null);
    await tx.membroDoGrupo.delete({ where: { id: membro.id } });
  });
}

/** Os grupos de que a pessoa faz parte, em qualquer papel. */
export function meusGrupos(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.membroDoGrupo.findMany({
      where: { parishId, userId, group: { status: "ativa" } },
      orderBy: { createdAt: "asc" },
      select: {
        papel: true,
        group: { select: { id: true, name: true, meetsWhen: true, meetsWhere: true, leaderName: true } },
      },
    }),
  );
}

/** Os grupos que a pessoa coordena — a entrada dela em Gestão. */
export async function gruposQueCoordeno(parishId: string, userId: string) {
  const meus = await meusGrupos(parishId, userId);
  return meus.filter((m) => m.papel === "coordenador").map((m) => m.group);
}

// ---- encontros -----------------------------------------------------------

export type DadosDoEncontro = {
  data?: string | null;
  dataFim?: string | null;
  mesPrevisto?: string | null;
  tema: string;
  complemento?: string | null;
  pregador?: string | null;
  destaque?: boolean;
  icone?: string | null;
};

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Confere e limpa um encontro antes de gravar.
 *
 * As mesmas regras das travas do banco (data final depois da inicial, mês
 * previsto só sem data), ditas antes, em português — a trava do banco é a
 * rede, e não a mensagem.
 */
function encontroValido(dados: DadosDoEncontro) {
  const tema = dados.tema.trim();
  if (!tema) throw new ValidationError("Informe o tema do encontro.");
  if (tema.length > 200) throw new ValidationError("O tema ficou longo demais. Resuma em até 200 letras.");

  const data = dados.data?.trim() || null;
  const dataFim = data ? dados.dataFim?.trim() || null : null;
  if (data && !DIA.test(data)) throw new ValidationError("Data inválida.");
  if (dataFim) {
    if (!DIA.test(dataFim)) throw new ValidationError("Último dia inválido.");
    if (dataFim <= data!) throw new ValidationError("O último dia precisa vir depois do primeiro.");
  }
  const mesPrevisto = data ? null : dados.mesPrevisto?.trim() || null;
  if (mesPrevisto && !MES.test(mesPrevisto)) throw new ValidationError("Mês previsto inválido.");

  const complemento = dados.complemento?.trim() || null;
  const pregador = dados.pregador?.trim() || null;
  if ((complemento?.length ?? 0) > 120 || (pregador?.length ?? 0) > 120) {
    throw new ValidationError("Complemento e pregador cabem em até 120 letras.");
  }

  const destaque = Boolean(dados.destaque);
  const icone = destaque
    ? dados.icone && ehChaveDeIcone(dados.icone)
      ? dados.icone
      : palpiteDeIcone(tema, complemento)
    : null;

  return {
    data: data ? paraOBanco(data) : null,
    dataFim: dataFim ? paraOBanco(dataFim) : null,
    mesPrevisto,
    tema,
    complemento,
    pregador,
    destaque,
    icone,
  };
}

export async function criarEncontro(parishId: string, groupId: string, createdBy: string, dados: DadosDoEncontro) {
  const limpo = encontroValido(dados);
  return withTenantContext(parishId, async (tx) => {
    const grupo = await tx.pastoralGroup.findFirst({ where: { id: groupId, parishId }, select: { id: true } });
    if (!grupo) throw new ValidationError("Grupo não encontrado.");
    return tx.encontroDoGrupo.create({ data: { parishId, groupId, createdBy, ...limpo } });
  });
}

export async function editarEncontro(parishId: string, groupId: string, encontroId: string, dados: DadosDoEncontro) {
  const limpo = encontroValido(dados);
  const { count } = await withTenantContext(parishId, (tx) =>
    tx.encontroDoGrupo.updateMany({ where: { id: encontroId, parishId, groupId }, data: limpo }),
  );
  if (count === 0) throw new ValidationError("Encontro não encontrado.");
}

export function apagarEncontro(parishId: string, groupId: string, encontroId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.encontroDoGrupo.deleteMany({ where: { id: encontroId, parishId, groupId } }),
  );
}

/** O cronograma colado tinha linhas que não deu para ler. Nada foi gravado. */
export class ErroNoCronograma extends ValidationError {
  constructor(public readonly erros: ErroDeLeitura[]) {
    super(
      erros.length === 1
        ? "Uma linha não deu para ler. Nada foi gravado."
        : `${erros.length} linhas não deram para ler. Nada foi gravado.`,
    );
  }
}

function chaveDeRepeticao(e: { data: Date | string | null; mesPrevisto: string | null; tema: string }): string {
  const dia = e.data ? (typeof e.data === "string" ? e.data : diaDoBanco(e.data)) : `sem:${e.mesPrevisto ?? ""}`;
  const tema = e.tema
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${dia}|${tema}`;
}

/**
 * Grava de uma vez o cronograma colado.
 *
 * Colar o mesmo texto duas vezes não duplica: um encontro no mesmo dia e
 * com o mesmo tema já existe e é pulado. É o que deixa a coordenação colar
 * de novo depois de acrescentar três linhas no fim, sem limpar antes.
 */
export async function importarCronograma(
  parishId: string,
  groupId: string,
  createdBy: string,
  texto: string,
): Promise<{ adicionados: number; repetidos: number }> {
  const { encontros, erros } = lerCronograma(texto);
  if (erros.length > 0) throw new ErroNoCronograma(erros);
  if (encontros.length === 0) {
    throw new ValidationError("Cole ao menos uma linha, como em 06/09/26 — Quem sou eu de verdade?");
  }

  return withTenantContext(parishId, async (tx) => {
    const grupo = await tx.pastoralGroup.findFirst({ where: { id: groupId, parishId }, select: { id: true } });
    if (!grupo) throw new ValidationError("Grupo não encontrado.");

    const existentes = await tx.encontroDoGrupo.findMany({
      where: { parishId, groupId },
      select: { data: true, mesPrevisto: true, tema: true },
    });
    const vistos = new Set(existentes.map(chaveDeRepeticao));

    const novos = encontros.filter((e) => {
      const chave = chaveDeRepeticao(e);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });

    if (novos.length > 0) {
      await tx.encontroDoGrupo.createMany({
        data: novos.map((e) => ({
          parishId,
          groupId,
          createdBy,
          data: e.data ? paraOBanco(e.data) : null,
          dataFim: e.dataFim ? paraOBanco(e.dataFim) : null,
          mesPrevisto: e.mesPrevisto,
          tema: e.tema,
          complemento: e.complemento,
          destaque: e.destaque,
          icone: e.icone,
        })),
      });
    }
    return { adicionados: novos.length, repetidos: encontros.length - novos.length };
  });
}

/**
 * O próximo encontro de cada grupo de que a pessoa faz parte — o cartão do
 * Início. Só grupos ativos, e só quem tem encontro marcado adiante.
 */
export async function proximosEncontrosDosMeusGrupos(parishId: string, userId: string, hoje: string) {
  const dia = paraOBanco(hoje);
  return withTenantContext(parishId, async (tx) => {
    const membros = await tx.membroDoGrupo.findMany({
      where: { parishId, userId, group: { status: "ativa" } },
      orderBy: { createdAt: "asc" },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            meetsWhen: true,
            meetsWhere: true,
            encontros: {
              where: { OR: [{ data: { gte: dia } }, { dataFim: { gte: dia } }] },
              orderBy: { data: "asc" },
              take: 3,
              select: CAMPOS_DO_ENCONTRO,
            },
          },
        },
      },
    });

    return membros.flatMap(({ group }) => {
      const encontro = proximoEncontro(group.encontros.map(visto), hoje);
      if (!encontro) return [];
      return [
        {
          grupo: { id: group.id, name: group.name, meetsWhen: group.meetsWhen, meetsWhere: group.meetsWhere },
          encontro,
        },
      ];
    });
  });
}
