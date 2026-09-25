import "server-only";
import { prisma } from "@/server/db/prisma";
import { withOwnMembershipLookup, withPlatformContext, withTenantContext } from "@/server/db/tenant-context";
import { generateOpaqueToken, hashToken } from "@/server/auth/tokens";
import { ValidationError } from "@/server/shared/errors";
import { ensurePriestProfile, isPriestRole } from "@/server/modules/priests/ensure-priest-profile";
import { registrar, ACOES } from "@/server/modules/auditoria/service";

/**
 * Implantação de uma paróquia: o que acontece antes de ela ter gente.
 *
 * Nasceu da Rocio, em 21/09/2026: a paróquia foi criada e configurada pela
 * plataforma, e parou na porta — não havia como o pároco entrar. O único
 * caminho era `prisma/bootstrap-founder.ts`, rodado com o banco de
 * produção na mão.
 */

/** Os papéis que um primeiro acesso pode ter: quem vai administrar. */
export const PAPEIS_DO_PRIMEIRO_ACESSO = ["PAROCO", "ADMINISTRADOR_PAROQUIAL", "SECRETARIA"] as const;
export type PapelDoPrimeiroAcesso = (typeof PAPEIS_DO_PRIMEIRO_ACESSO)[number];

/** Uma semana para definir a senha: o pároco pode abrir o link só no domingo. */
const VALIDADE_DO_LINK_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type PrimeiroAcesso = {
  caminho: string;
  nome: string;
  expiraEm: Date;
  /** A pessoa já tinha conta no app — o link serve para ela entrar, não para criar. */
  jaTinhaConta: boolean;
};

/**
 * Cria o acesso de quem vai administrar uma paróquia e devolve o link de
 * definir senha.
 *
 * A pessoa pode já ter conta. Se estiver sem paróquia, entra nesta com o
 * papel pedido. Se estiver noutra, a função RECUSA: mudar alguém de
 * paróquia é decisão dela, e fazer isso por trás encerraria o vínculo que
 * ela tem — talvez como administradora de lá.
 *
 * O link reaproveita o de nova senha (a mesma tabela, a mesma página), com
 * validade de uma semana, e fica registrado na auditoria da paróquia.
 */
export async function criarPrimeiroAcesso(input: {
  parishId: string;
  nome: string;
  email: string;
  papel: string;
  criadoPor: string;
}): Promise<PrimeiroAcesso> {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  if (nome.length < 3 || !nome.includes(" ")) {
    throw new ValidationError("Informe o nome completo, com sobrenome.");
  }
  if (!EMAIL.test(email)) throw new ValidationError("Informe um e-mail válido.");
  if (!(PAPEIS_DO_PRIMEIRO_ACESSO as readonly string[]).includes(input.papel)) {
    throw new ValidationError("Escolha o papel: pároco, administração ou secretaria.");
  }

  const paroquia = await withPlatformContext((tx) =>
    tx.parish.findUnique({ where: { id: input.parishId }, select: { id: true, name: true } }),
  );
  if (!paroquia) throw new ValidationError("Paróquia não encontrada.");

  const role = await withPlatformContext((tx) => tx.role.findUniqueOrThrow({ where: { code: input.papel } }));

  const existente = await prisma.user.findUnique({ where: { email } });
  const usuario = existente ?? (await prisma.user.create({ data: { email, fullName: nome, passwordHash: null } }));

  const vinculo = await withOwnMembershipLookup(usuario.id, (tx) =>
    tx.parishMembership.findFirst({
      where: { userId: usuario.id, status: "active" },
      include: { parish: { select: { name: true } } },
    }),
  );
  if (vinculo && vinculo.parishId !== input.parishId) {
    throw new ValidationError(
      `Essa pessoa já pertence à ${vinculo.parish.name}. Para vir para esta, ela mesma precisa mudar de paróquia no app.`,
    );
  }

  const token = generateOpaqueToken();
  const expiraEm = new Date(Date.now() + VALIDADE_DO_LINK_MS);

  await withTenantContext(input.parishId, async (tx) => {
    if (vinculo) {
      await tx.parishMembership.update({ where: { id: vinculo.id }, data: { roleId: role.id } });
    } else {
      await tx.parishMembership.create({
        data: { userId: usuario.id, parishId: input.parishId, roleId: role.id, status: "active" },
      });
    }
    if (isPriestRole(input.papel)) {
      await ensurePriestProfile(tx, { userId: usuario.id, parishId: input.parishId, roleCode: input.papel });
    }
    await tx.passwordResetToken.create({
      data: { userId: usuario.id, tokenHash: hashToken(token), expiresAt: expiraEm },
    });
    await registrar(tx, {
      parishId: input.parishId,
      atorId: input.criadoPor,
      acao: ACOES.PRIMEIRO_ACESSO_CRIADO,
      alvoTipo: "membro",
      alvoId: usuario.id,
    });
  });

  return {
    caminho: `/recuperar-acesso/redefinir?token=${token}`,
    nome: usuario.fullName,
    expiraEm,
    jaTinhaConta: Boolean(existente),
  };
}

// ---- o que falta configurar ----------------------------------------------

export type ItemDaImplantacao = {
  chave: string;
  titulo: string;
  porQue: string;
  feito: boolean;
  href: string;
};

/**
 * O que uma paróquia precisa ter para o fiel encontrar vida ao chegar.
 *
 * A ordem é a do que o fiel vê primeiro: a missa, o contato, quem é o
 * pároco. Tudo aqui é conferido no banco — nada é marcado à mão, para a
 * lista não mentir.
 */
export async function listaDaImplantacao(parishId: string): Promise<ItemDaImplantacao[]> {
  return withTenantContext(parishId, async (tx) => {
    const [paroquia, horarios, expediente, avisos, pastorais, sacerdotes, pessoas] = await Promise.all([
      tx.parish.findUnique({
        where: { id: parishId },
        select: {
          phone: true,
          whatsapp: true,
          address: true,
          historia: true,
          parocoNome: true,
          logoUrl: true,
        },
      }),
      tx.celebrationSchedule.count({ where: { parishId, active: true } }),
      tx.parishOfficeHours.count({ where: { parishId } }),
      tx.aviso.count({ where: { parishId } }),
      tx.pastoralGroup.count({ where: { parishId, status: "ativa" } }),
      tx.priestProfile.count({ where: { parishId } }),
      tx.parishMembership.count({ where: { parishId, status: "active" } }),
    ]);

    return [
      {
        chave: "horarios",
        titulo: "Horários das missas",
        porQue: "É a primeira coisa que o fiel procura.",
        feito: horarios > 0,
        href: "/painel/missas",
      },
      {
        chave: "contato",
        titulo: "Telefone, WhatsApp e endereço",
        porQue: "Para ligar, mandar mensagem e chegar.",
        feito: Boolean(paroquia?.address && (paroquia.phone || paroquia.whatsapp)),
        href: "/painel/paroquia",
      },
      {
        chave: "expediente",
        titulo: "Horário da secretaria",
        porQue: "O Contato diz se está aberta agora.",
        feito: expediente > 0,
        href: "/painel/expediente",
      },
      {
        chave: "paroco",
        titulo: "Nosso Pároco",
        porQue: "A comunidade precisa saber quem a conduz.",
        feito: Boolean(paroquia?.parocoNome),
        href: "/painel/paroco",
      },
      {
        chave: "sacerdotes",
        titulo: "Sacerdotes",
        porQue: "Para o fiel pedir uma conversa ou uma confissão.",
        feito: sacerdotes > 0,
        href: "/painel/sacerdotes",
      },
      {
        chave: "historia",
        titulo: "Nossa História",
        porQue: "É o que faz a paróquia ser esta, e não outra.",
        feito: Boolean(paroquia?.historia),
        href: "/painel/historia",
      },
      {
        chave: "logo",
        titulo: "Logo",
        porQue: "Aparece no topo do app de todos.",
        feito: Boolean(paroquia?.logoUrl),
        href: "/painel/paroquia",
      },
      {
        chave: "pastorais",
        titulo: "Pastorais e grupos",
        porQue: "Onde o fiel pode servir — o convite do app inteiro.",
        feito: pastorais > 0,
        href: "/painel/pastorais",
      },
      {
        chave: "aviso",
        titulo: "O primeiro aviso",
        porQue: "Um recado real da semana faz o app nascer com vida.",
        feito: avisos > 0,
        href: "/painel/avisos",
      },
      {
        chave: "pessoas",
        titulo: "Os primeiros fiéis",
        porQue: "Divulgue o link da paróquia: quem entra por ele já cai aqui.",
        feito: pessoas > 1,
        href: "/painel/paroquia#link-da-paroquia",
      },
    ];
  });
}
