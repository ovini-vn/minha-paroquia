import {
  withTenantContext,
  withPlatformContext,
  withOwnMembershipLookup,
} from "@/server/db/tenant-context";
import { ROLES_QUE_ADMINISTRAM, type RoleCode } from "@/server/auth/rbac";
import { registrar, ACOES } from "@/server/modules/auditoria/service";
import { ValidationError } from "@/server/shared/errors";
import { slugify } from "@/server/shared/slug";
import { ensurePriestProfile, isPriestRole } from "@/server/modules/priests/ensure-priest-profile";
import {
  createParish,
  findParishBySlug,
  findParishById,
  updateParishProfile,
  updateParishHistoria as atualizarHistoria,
  updateParishParoco as atualizarParoco,
  updateParishDonationProfile as atualizarDoacao,
} from "./repository";
import type { UpdateParishProfileInput } from "./schema";

/**
 * Nomes de paróquia se repetem muito (padroeiros comuns, ex.: "Nossa
 * Senhora de Fátima" existe em várias cidades) — o slug incorpora a cidade
 * pra evitar colisão, e cai num sufixo numérico no caso raro de duas
 * paróquias com o mesmo nome *e* cidade.
 */
async function uniqueSlugFor(name: string, city?: string): Promise<string> {
  const base = slugify(city ? `${name}-${city}` : name);
  if (!base) {
    throw new ValidationError("Nome ou cidade inválidos.");
  }

  let slug = base;
  let attempt = 2;
  while (await findParishBySlug(slug)) {
    slug = `${base}-${attempt}`;
    attempt += 1;
  }
  return slug;
}

export async function registerParish(input: { name: string; city?: string; state?: string }) {
  const slug = await uniqueSlugFor(input.name, input.city);
  return createParish({ name: input.name, slug, city: input.city, state: input.state });
}

export function getParish(parishId: string) {
  return findParishById(parishId);
}

export function updateOwnParishProfile(parishId: string, input: UpdateParishProfileInput) {
  return updateParishProfile(parishId, {
    city: input.city || null,
    state: input.state || null,
    address: input.address || null,
    phone: input.phone || null,
    description: input.description || null,
    logoUrl: input.logoUrl || null,
    whatsapp: input.whatsapp || null,
    facebookUrl: input.facebookUrl || null,
    instagramUrl: input.instagramUrl || null,
  });
}


/**
 * Os números do painel.
 *
 * Contava convite emitido e convite usado, o que media o esforço da
 * secretaria e não o tamanho da comunidade: convite gerado e nunca aberto
 * inflava a conta, e quem entrou escolhendo a paróquia sozinho não aparecia
 * em lugar nenhum. Agora conta gente.
 *
 * `fielCount` conta quem escolheu esta paróquia no aplicativo — não quem
 * recebeu convite. É a medida que o pároco pediu: gente que chegou, não
 * código distribuído.
 */
export async function getParishDashboardCounts(parishId: string) {
  return withTenantContext(parishId, async (tx) => {
    const [fielCount, sacerdoteCount, sairam] = await Promise.all([
      tx.parishMembership.count({ where: { parishId, status: "active" } }),
      /*
       * Sacerdote se conta pelo PERFIL, não pela filiação.
       *
       * Contava filiação com papel de sacerdote — e desde que existe padre
       * sem conta no aplicativo (02/09/2026) isso deixou de bater com a
       * realidade: quem não tem conta não tem filiação. O painel dizia
       * "0 Sacerdotes" enquanto listava um três dedos abaixo, e "Falar com
       * um sacerdote" mostrava o mesmo padre ao fiel. Visto em produção.
       *
       * O perfil é o que TODA tela usa para exibir sacerdote, então é o
       * número honesto: se aparece para o fiel, conta aqui.
       */
      tx.priestProfile.count({ where: { parishId } }),
      // Vínculo inativo nesta paróquia é quem escolheu outra depois: quando
      // alguém troca, o vínculo antigo é desativado, não apagado.
      tx.parishMembership.count({ where: { parishId, status: "inactive" } }),
    ]);

    return { fielCount, sacerdoteCount, sairam };
  });
}

/** Membros ativos com um papel específico — usado para escolher catequista ao criar uma turma. */
export function listMembersByRole(parishId: string, roleCode: string) {
  return withTenantContext(parishId, (tx) =>
    tx.parishMembership.findMany({
      where: { parishId, status: "active", role: { code: roleCode } },
      include: { user: { select: { id: true, fullName: true } } },
    }),
  );
}

/**
 * Ids de quem tem uma permissão nesta paróquia, pelo papel.
 *
 * Serve para avisar "o responsável" sem depender de UMA pessoa: quem criou
 * a oportunidade pode ter saído da paróquia, e aí o aviso não chegaria a
 * ninguém — que é exatamente o problema que a notificação existe para
 * resolver.
 *
 * Não considera overrides individuais de propósito: aqui a pergunta é "quem
 * responde por isso", e responsabilidade vem do papel.
 */
export async function listUserIdsWithPermission(parishId: string, permissionCode: string) {
  const membros = await withTenantContext(parishId, (tx) =>
    tx.parishMembership.findMany({
      where: {
        parishId,
        status: "active",
        role: { rolePermissions: { some: { permission: { code: permissionCode } } } },
      },
      select: { userId: true },
    }),
  );
  return membros.map((m) => m.userId);
}

/**
 * Todos os membros ativos. É a LISTA INTEIRA da paróquia — só pode ser
 * chamada por telas que exigem permissão de gestão da paróquia inteira
 * (dízimo, membros e papéis, delegar permissões).
 *
 * Para vincular uma pessoa a um cadastro, use findMemberByExactName: ela
 * não devolve lista nenhuma, exige o nome completo, e por isso não permite
 * descobrir quem frequenta a paróquia.
 */
export function listActiveMembers(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.parishMembership.findMany({
      where: { parishId, status: "active" },
      include: { user: { select: { id: true, fullName: true } }, role: { select: { name: true, code: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
  );
}

/**
 * Troca o papel de alguém que JÁ pertence à paróquia.
 *
 * Faltava por inteiro: roleId só era definido uma vez, ao aceitar o convite.
 * Quem entrou por um link genérico de fiel nunca podia virar catequista — e
 * delegar permissão avulsa não resolvia, porque o formulário de turma
 * procura catequistas POR PAPEL, então a pessoa nunca aparecia na lista.
 */
export async function changeMemberRole(
  parishId: string,
  targetUserId: string,
  roleCode: string,
  actingUserId: string,
) {
  return withTenantContext(parishId, async (tx) => {
    if (targetUserId === actingUserId) {
      // Sem isso, um pároco distraído se rebaixa a fiel e perde o acesso ao
      // painel — inclusive à tela que desfaria o engano.
      throw new ValidationError("Você não pode alterar o seu próprio papel. Peça a outra pessoa.");
    }

    const role = await tx.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ValidationError("Papel desconhecido.");

    const membership = await tx.parishMembership.findFirst({
      where: { parishId, userId: targetUserId, status: "active" },
      include: { role: true, user: { select: { isPlatformAdmin: true } } },
    });
    if (!membership) throw new ValidationError("Esta pessoa não pertence à paróquia.");
    if (membership.roleId === role.id) return membership;

    // A paróquia não pode ficar sem ninguém que administre.
    //
    // A conta não é "sem Pároco": pároco é o cargo eclesial, e a paróquia
    // pode ser administrada por quem não é padre. O que não pode faltar é
    // alguém capaz de mexer nos papéis dos outros — seja pelo papel que
    // tem, seja por administrar a plataforma inteira.
    const administraHoje =
      ROLES_QUE_ADMINISTRAM.includes(membership.role.code as RoleCode) ||
      membership.user.isPlatformAdmin;
    const continuaAdministrando =
      ROLES_QUE_ADMINISTRAM.includes(roleCode as RoleCode) || membership.user.isPlatformAdmin;

    if (administraHoje && !continuaAdministrando) {
      const outros = await tx.parishMembership.count({
        where: {
          parishId,
          status: "active",
          userId: { not: targetUserId },
          OR: [
            { role: { code: { in: ROLES_QUE_ADMINISTRAM } } },
            { user: { isPlatformAdmin: true } },
          ],
        },
      });
      if (outros === 0) {
        throw new ValidationError(
          "Esta é a única conta que administra a paróquia. Defina outro Pároco ou Administrador da paróquia antes de mudar este.",
        );
      }
    }

    // Deixar de ser sacerdote: o perfil não pode simplesmente sumir.
    //
    // appointments e posts têm priest_profile_id em onDelete Cascade, então
    // apagar o perfil levaria junto os atendimentos marcados E a Palavra do
    // Padre já publicada; celebrações e sacramentos perderiam o vínculo.
    // Só removo o perfil que não deixou rastro nenhum.
    if (isPriestRole(membership.role.code) && !isPriestRole(roleCode)) {
      const perfil = await tx.priestProfile.findUnique({
        where: { userId_parishId: { userId: targetUserId, parishId } },
        include: {
          _count: {
            select: { appointments: true, celebrations: true, sacraments: true, posts: true },
          },
        },
      });

      if (perfil) {
        // Nomear o que trava vale mais que uma frase genérica: quem lê
        // precisa saber o que ir resolver.
        const rastros = [
          [perfil._count.appointments, "atendimento(s) marcado(s)"],
          [perfil._count.celebrations, "celebração(ões)"],
          [perfil._count.sacraments, "sacramento(s)"],
          [perfil._count.posts, "publicação(ões) da Palavra do Padre"],
        ] as const;
        const impedimentos = rastros.filter(([n]) => n > 0).map(([n, o]) => `${n} ${o}`);

        if (impedimentos.length > 0) {
          throw new ValidationError(
            `Este sacerdote tem ${impedimentos.join(", ")}. Esses registros seriam perdidos ao mudar o papel — reatribua, conclua ou remova antes.`,
          );
        }
        await tx.priestProfile.delete({ where: { id: perfil.id } });
      }
    }

    const atualizado = await tx.parishMembership.update({
      where: { id: membership.id },
      data: { roleId: role.id },
    });

    // Na MESMA transação da troca: ou os dois acontecem, ou nenhum. Trocar
    // papel é dar ou tirar acesso, e essa é a pergunta que um log de
    // auditoria precisa saber responder meses depois.
    await registrar(tx, {
      parishId,
      atorId: actingUserId,
      acao: ACOES.PAPEL_TROCADO,
      alvoTipo: "membro",
      alvoId: targetUserId,
      detalhe: { de: membership.role.code, para: roleCode },
    });

    // Virar sacerdote cria o perfil, igual ao aceite de convite — senão a
    // pessoa teria o papel sem aparecer em "Sacerdotes" nem poder atender.
    await ensurePriestProfile(tx, { userId: targetUserId, parishId, roleCode });

    return atualizado;
  });
}

/**
 * Normaliza um nome para comparação: sem acento, sem caixa, sem espaço
 * sobrando. "José  da SILVA" e "Jose da Silva" viram a mesma coisa.
 */
function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type BuscaPorNome =
  | { situacao: "encontrado"; userId: string; fullName: string }
  | { situacao: "nao_encontrado" }
  | { situacao: "ambiguo" };

/**
 * Acha um membro pelo nome COMPLETO e exato.
 *
 * Existe no lugar de listar a paróquia inteira. Antes, qualquer pessoa
 * logada recebia o nome de todos os membros (era o seletor de "adicionar
 * responsável"), o que transformava a lista de quem frequenta a paróquia em
 * informação disponível a quem entrasse.
 *
 * Aqui é preciso JÁ SABER o nome inteiro para vincular alguém. Quem não
 * sabe não descobre: não há busca parcial, não há lista, não há sugestão.
 *
 * A comparação acontece no servidor e a lista nunca sai daqui — só o
 * resultado de um nome específico.
 *
 * Nome repetido devolve "ambiguo" em vez de escolher um: vincular a pessoa
 * errada a uma criança é pior do que pedir ajuda à secretaria.
 */
export async function findMemberByExactName(
  parishId: string,
  nomeDigitado: string,
): Promise<BuscaPorNome> {
  const alvo = normalizarNome(nomeDigitado);
  // Nome completo de verdade tem sobrenome. Exigir isso evita que "ana"
  // vire uma varredura barata por quem se chama Ana.
  if (alvo.length < 5 || !alvo.includes(" ")) return { situacao: "nao_encontrado" };

  const membros = await withTenantContext(parishId, (tx) =>
    tx.parishMembership.findMany({
      where: { parishId, status: "active" },
      select: { userId: true, user: { select: { fullName: true } } },
    }),
  );

  const iguais = membros.filter((m) => normalizarNome(m.user.fullName) === alvo);
  if (iguais.length === 0) return { situacao: "nao_encontrado" };
  if (iguais.length > 1) return { situacao: "ambiguo" };

  return {
    situacao: "encontrado",
    userId: iguais[0]!.userId,
    fullName: iguais[0]!.user.fullName,
  };
}

/**
 * Paróquias que alguém pode escolher ao entrar no app.
 *
 * Diferente de listActiveMembers: paróquia é entidade pública — nome, cidade
 * e estado estão na placa da igreja. Listar não expõe ninguém.
 *
 * `busca` filtra por nome ou cidade. Sem busca, devolve as primeiras em
 * ordem alfabética, para quem só quer olhar.
 */
export function listParishesForJoin(busca?: string, limit = 30) {
  const termo = busca?.trim();
  return withPlatformContext((tx) =>
    tx.parish.findMany({
      where: termo
        ? {
            OR: [
              { name: { contains: termo, mode: "insensitive" } },
              { city: { contains: termo, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ city: "asc" }, { name: "asc" }],
      take: limit,
      select: { id: true, name: true, city: true, state: true },
    }),
  );
}

/**
 * A pessoa escolhe a paróquia e entra. Ponto — sem aprovação de ninguém.
 *
 * Já houve um estado intermediário aqui, "pendente", herdado do tempo em
 * que se entrava por código de convite. Ele não protegia nada que o papel
 * já não protegesse: FIEL não tem permissão nenhuma, e o mural de oração
 * agora passa por moderação antes de publicar qualquer nome. O que o
 * pendente fazia de fato era prender a pessoa num limbo — sem avisos, sem
 * resumo semanal, sem aparecer na contagem — enquanto esperava alguém que
 * não tinha sido avisado de que havia alguém esperando.
 *
 * Quem quer ver o horário da missa não deve esperar por ninguém.
 */
export async function joinParish(parishId: string, userId: string) {
  const paroquia = await withPlatformContext((tx) =>
    tx.parish.findUnique({ where: { id: parishId }, select: { id: true } }),
  );
  if (!paroquia) throw new ValidationError("Paróquia não encontrada.");

  const role = await withPlatformContext((tx) =>
    tx.role.findUniqueOrThrow({ where: { code: "FIEL" } }),
  );

  // O vínculo anterior pode ser de OUTRA paróquia, e dentro do contexto da
  // nova ele é invisível — o RLS filtra por parish_id. Por isso a leitura
  // acontece pelo caminho de "minhas próprias linhas", que é justamente o
  // que a política permite ler por user_id.
  const anterior = await withOwnMembershipLookup(userId, (tx) =>
    tx.parishMembership.findFirst({ where: { userId, status: "active" } }),
  );

  if (anterior?.parishId === parishId) return anterior;

  if (anterior) {
    // Uma paróquia por vez: entrar numa nova encerra a anterior, mesmo
    // comportamento do aceite de convite. A baixa acontece no contexto da
    // paróquia ANTIGA, senão o RLS recusa a escrita.
    await withTenantContext(anterior.parishId, (tx) =>
      tx.parishMembership.update({
        where: { id: anterior.id },
        data: { status: "inactive", leftAt: new Date() },
      }),
    );
  }

  return withTenantContext(parishId, (tx) =>
    tx.parishMembership.create({
      data: { userId, parishId, roleId: role.id, status: "active" },
    }),
  );
}

/** Faixas de expediente da secretaria, para a tela de Contato. */
export function listOfficeHours(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.parishOfficeHours.findMany({
      where: { parishId },
      orderBy: [{ weekday: "asc" }, { opensAt: "asc" }],
      select: { weekday: true, opensAt: true, closesAt: true },
    }),
  );
}

/**
 * Regrava o expediente inteiro: apaga e insere.
 *
 * Mais simples e mais correto que tentar casar faixa por faixa — a
 * secretaria edita a semana toda de uma vez, e não há nada apontando para
 * uma faixa específica que pudesse se perder.
 */
export function replaceOfficeHours(
  parishId: string,
  faixas: { weekday: number; opensAt: number; closesAt: number }[],
) {
  return withTenantContext(parishId, async (tx) => {
    await tx.parishOfficeHours.deleteMany({ where: { parishId } });
    if (faixas.length === 0) return { count: 0 };
    return tx.parishOfficeHours.createMany({
      data: faixas.map((f) => ({ parishId, ...f })),
    });
  });
}

/** Memorial histórico e foto atual da igreja. */
export function updateParishHistoria(
  parishId: string,
  dados: { historia: string | null; historiaFotoUrl: string | null },
) {
  return atualizarHistoria(parishId, dados);
}

/** Apresentação do pároco na tela "Nosso Pároco". */
export function updateParishParoco(
  parishId: string,
  dados: {
    parocoNome: string | null;
    parocoTitulo: string | null;
    parocoHistoria: string | null;
    parocoFotoUrl: string | null;
  },
) {
  return atualizarParoco(parishId, dados);
}

/** CNPJ e e-mail: identificam a paróquia na tela de doação. */
export function updateParishDonationProfile(
  parishId: string,
  dados: { cnpj: string | null; email: string | null },
) {
  return atualizarDoacao(parishId, dados);
}
