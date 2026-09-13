import { withPlatformContext } from "@/server/db/tenant-context";
import { AppError } from "@/server/shared/errors";
import { registrar, ACOES } from "@/server/modules/auditoria/service";

/**
 * Devolver uma conta ao estado de quem acabou de chegar.
 *
 * Existia só como script (`scripts/resetar-onboarding.ts`), o que servia
 * para o banco de desenvolvimento e não servia para produção: rodá-lo lá
 * exigiria a `DATABASE_URL` de produção na máquina de alguém, que é
 * justamente o que este projeto evita. Quem precisa disso em produção é
 * quem está testando o onboarding — e precisa de novo, e de novo.
 *
 * O uso que NÃO é teste, e que sozinho já justificaria a tela: alguém que
 * entrou na paróquia errada. Hoje isso só se desfaz por script.
 *
 * DOIS PORTÕES, e derrubar um só testa metade do fluxo (ver
 * `src/app/(fiel)/layout.tsx`): sem vínculo o app manda para
 * /escolher-paroquia; sem `onboardedAt` manda para /bem-vindo.
 *
 * PRECISA DO CONTEXTO DE PLATAFORMA. `parish_memberships` tem RLS com
 * FORCE e a conexão do app é `app_user`: um cliente comum enxerga zero
 * vínculos, apaga zero e devolve sucesso. Foi assim que a primeira versão
 * do script anunciou "feito" enquanto a paróquia seguia colada na conta.
 */

/** O que impede reiniciar esta conta, em palavras que a tela mostra. */
export type Impedimento = string;

async function impedimentosDe(
  tx: Parameters<Parameters<typeof withPlatformContext>[0]>[0],
  userId: string,
): Promise<Impedimento[]> {
  const [atendimentos, oracoes, familiares, guardioes] = await Promise.all([
    tx.appointment.count({ where: { fielUserId: userId } }),
    tx.prayerRequest.count({ where: { requesterUserId: userId } }),
    tx.familyMember.count({ where: { responsibleUserId: userId } }),
    tx.familyMemberGuardian.count({ where: { userId } }),
  ]);

  const partes: Impedimento[] = [];
  if (atendimentos) partes.push(`${atendimentos} atendimento(s)`);
  if (oracoes) partes.push(`${oracoes} pedido(s) de oração`);
  if (familiares) partes.push(`${familiares} pessoa(s) da família`);
  if (guardioes) partes.push(`${guardioes} vínculo(s) de guardião`);
  return partes;
}

export type ContaReiniciavel = {
  id: string;
  nome: string;
  email: string;
  jaViuAsBoasVindas: boolean;
  /** Vazio quer dizer que dá para reiniciar. */
  impedimentos: Impedimento[];
};

/**
 * Quem desta paróquia pode ser devolvido ao começo.
 *
 * Traz os impedimentos junto para a tela já mostrar por que uma conta não
 * pode — descobrir a regra errando é o que se quer evitar.
 *
 * Não há filtro de "pertence a duas paróquias": o banco tem um índice
 * parcial único em `user_id` para status ativo/pendente (ver o comentário
 * do modelo em schema.prisma), então uma conta tem no máximo um vínculo
 * vivo. Filtrar por isso seria código que nunca roda — e a versão que eu
 * escrevi antes contava vínculos INATIVOS junto, recusando justamente
 * quem um dia saiu de outra paróquia.
 */
export function listarContasReiniciaveis(parishId: string): Promise<ContaReiniciavel[]> {
  return withPlatformContext(async (tx) => {
    const daParoquia = await tx.parishMembership.findMany({
      where: { parishId, status: "active" },
      select: { userId: true, user: { select: { fullName: true, email: true, onboardedAt: true } } },
      orderBy: { user: { fullName: "asc" } },
    });
    if (daParoquia.length === 0) return [];

    const contas: ContaReiniciavel[] = [];
    for (const m of daParoquia) {
      contas.push({
        id: m.userId,
        nome: m.user.fullName,
        email: m.user.email,
        jaViuAsBoasVindas: m.user.onboardedAt !== null,
        impedimentos: await impedimentosDe(tx, m.userId),
      });
    }
    return contas;
  });
}

/**
 * Reinicia, e CONFERE depois de apagar.
 *
 * A conferência não é zelo: é o que teria denunciado o defeito da RLS, em
 * que o `deleteMany` não alcançava nada e ninguém ficava sabendo.
 */
export async function reiniciarOnboarding(
  parishId: string,
  userId: string,
  atorId: string,
): Promise<{ nome: string }> {
  return withPlatformContext(async (tx) => {
    const aqui = await tx.parishMembership.findFirst({
      where: { userId, parishId, status: "active" },
      select: { id: true },
    });
    if (!aqui) throw new AppError("Esta conta não é um membro ativo desta paróquia.", "NAO_E_MEMBRO");

    const impedimentos = await impedimentosDe(tx, userId);
    if (impedimentos.length > 0) {
      throw new AppError(
        `Esta conta tem histórico — ${impedimentos.join(", ")}. Apagar o vínculo deixaria esses registros órfãos.`,
        "TEM_HISTORICO",
      );
    }

    const pessoa = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { fullName: true },
    });

    /*
     * Apaga o vínculo DESTA paróquia, e não todos.
     *
     * Quem já saiu de outra paróquia carrega um vínculo inativo, que é o
     * registro de que esteve lá. Apagar tudo reescreveria esse histórico
     * para resolver um problema que é só desta paróquia.
     */
    await tx.volunteerProfile.deleteMany({ where: { userId, parishId } });
    await tx.parishMembership.deleteMany({ where: { userId, parishId } });
    await tx.user.update({ where: { id: userId }, data: { onboardedAt: null } });

    const sobraram = await tx.parishMembership.count({ where: { userId, parishId } });
    if (sobraram > 0) {
      // Dentro da transação: lançar aqui desfaz tudo.
      throw new AppError("Os vínculos não foram apagados. Nada foi alterado.", "RLS_BLOQUEOU");
    }

    await registrar(tx, {
      parishId,
      atorId,
      acao: ACOES.ONBOARDING_REINICIADO,
      alvoTipo: "user",
      alvoId: userId,
      detalhe: `Reiniciou o cadastro de ${pessoa.fullName}`,
    });

    return { nome: pessoa.fullName };
  });
}
