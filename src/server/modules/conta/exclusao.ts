import "server-only";
import { withPlatformContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { ACOES, registrar } from "@/server/modules/auditoria/service";

/** O que a pessoa digita para confirmar — uma palavra, sem ambiguidade. */
export const PALAVRA_DE_CONFIRMACAO = "EXCLUIR";

/** O nome que fica no lugar do dela, onde a paróquia precisa guardar o registro. */
export const NOME_DE_QUEM_SAIU = "Pessoa que excluiu a conta";

const PAPEIS_QUE_RESPONDEM_PELA_PAROQUIA = ["PAROCO", "ADMINISTRADOR_PAROQUIAL"];

/**
 * Excluir a própria conta (LGPD, art. 18).
 *
 * O que é SÓ da pessoa sai de verdade: sessões, login social, notificações,
 * orações, reflexões, missas e confissões marcadas, pedidos de oração,
 * grupos, respostas, disponibilidades, interesses.
 *
 * O que a PARÓQUIA precisa guardar fica, sem o nome: os sacramentos
 * (espelho do livro de tombo), as contribuições (a contabilidade não pode
 * ter buraco) e o registro de auditoria. A conta vira um registro anônimo —
 * e-mail impossível, sem senha, sem telefone, sem data de nascimento — e
 * ninguém mais entra por ela.
 *
 * Não apaga a linha do usuário porque sacramentos e contribuições apontam
 * para ela; apagar levaria esses registros junto (cascata) ou os deixaria
 * órfãos. Anonimizar é o que a lei pede e o que o livro da paróquia aguenta.
 */
export async function excluirMinhaConta(userId: string, confirmacao: string, agora = new Date()): Promise<void> {
  if (confirmacao.trim().toUpperCase() !== PALAVRA_DE_CONFIRMACAO) {
    throw new ValidationError(`Digite ${PALAVRA_DE_CONFIRMACAO} para confirmar.`);
  }

  await withPlatformContext(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        isPlatformAdmin: true,
        memberships: {
          where: { status: "active" },
          select: { id: true, parishId: true, role: { select: { code: true } } },
        },
      },
    });
    if (!user) throw new ValidationError("Conta não encontrada.");
    if (user.isPlatformAdmin) {
      throw new ValidationError("A conta de administração da plataforma não pode ser excluída por aqui.");
    }

    // Quem responde pela paróquia não pode deixá-la sem ninguém à frente.
    for (const m of user.memberships) {
      if (!PAPEIS_QUE_RESPONDEM_PELA_PAROQUIA.includes(m.role.code)) continue;
      const outros = await tx.parishMembership.count({
        where: {
          parishId: m.parishId,
          status: "active",
          userId: { not: userId },
          role: { code: { in: PAPEIS_QUE_RESPONDEM_PELA_PAROQUIA } },
        },
      });
      if (outros === 0) {
        throw new ValidationError(
          "Você é a única pessoa que administra a paróquia. Passe a administração para alguém antes de excluir a conta.",
        );
      }
    }

    const doUsuario = { userId };
    await tx.session.deleteMany({ where: doUsuario });
    await tx.oAuthAccount.deleteMany({ where: doUsuario });
    await tx.passwordResetToken.deleteMany({ where: doUsuario });
    await tx.webPushSubscription.deleteMany({ where: doUsuario });
    await tx.notification.deleteMany({ where: doUsuario });
    await tx.notificationPreference.deleteMany({ where: doUsuario });
    await tx.novenaAndamento.deleteMany({ where: doUsuario });
    await tx.massParticipation.deleteMany({ where: doUsuario });
    await tx.confessionLog.deleteMany({ where: doUsuario });
    await tx.prayerRequest.deleteMany({ where: { requesterUserId: userId } });
    await tx.volunteerProfile.deleteMany({ where: doUsuario });
    await tx.serviceInterest.deleteMany({ where: doUsuario });
    await tx.pastoralGroupInterest.deleteMany({ where: doUsuario });
    await tx.membroDoGrupo.deleteMany({ where: doUsuario });
    await tx.presencaNoEncontro.deleteMany({ where: doUsuario });
    await tx.respostaAoEncontro.deleteMany({ where: doUsuario });
    await tx.respostaAoEvento.deleteMany({ where: doUsuario });
    await tx.liturgicalAvailability.deleteMany({ where: doUsuario });
    await tx.tarefaDoEncontro.updateMany({ where: { responsavelId: userId }, data: { responsavelId: null } });
    // Atendimentos que ainda iam acontecer: o padre não deve esperar ninguém.
    await tx.appointment.updateMany({
      where: { fielUserId: userId, status: { in: ["solicitado", "confirmado"] }, scheduledAt: { gt: agora } },
      data: { status: "cancelado" },
    });
    // Intenção pedida e ainda não conferida sai; a conferida já está no rol
    // da missa e fica, sem o vínculo.
    await tx.intencaoDeMissa.deleteMany({ where: { pedidoPorId: userId, estado: "pedida" } });
    await tx.intencaoDeMissa.updateMany({ where: { pedidoPorId: userId }, data: { pedidoPorId: null } });
    // Contribuições ficam — a contabilidade não pode ter buraco — sem a pessoa.
    await tx.contribuicao.updateMany({ where: doUsuario, data: { userId: null } });
    await tx.pixDeContribuicao.updateMany({ where: doUsuario, data: { userId: null } });

    for (const m of user.memberships) {
      await registrar(tx, {
        parishId: m.parishId,
        atorId: userId,
        acao: ACOES.CONTA_EXCLUIDA,
        alvoTipo: "usuario",
        alvoId: userId,
      });
    }
    await tx.parishMembership.updateMany({ where: { userId, status: "active" }, data: { status: "inactive", leftAt: agora } });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: `excluida-${userId}@conta-excluida.invalid`,
        passwordHash: null,
        fullName: NOME_DE_QUEM_SAIU,
        photoUrl: null,
        phone: null,
        birthDate: null,
        compartilhaDatas: false,
      },
    });
  });
}
