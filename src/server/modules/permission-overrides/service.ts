import { withTenantContext } from "@/server/db/tenant-context";
import type { PermissionCode } from "@/server/auth/rbac";
import { registrar, ACOES } from "@/server/modules/auditoria/service";

export function listOverrides(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.permissionOverride.findMany({
      where: { parishId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );
}

/** Concede ou revoga uma permissão específica para um usuário, por cima do que o papel dele já dá. */
export function setOverride(
  parishId: string,
  userId: string,
  permissionCode: PermissionCode,
  granted: boolean,
  grantedBy: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const resultado = await tx.permissionOverride.upsert({
      where: { userId_permissionCode: { userId, permissionCode } },
      update: { granted, grantedBy },
      create: { parishId, userId, permissionCode, granted, grantedBy },
    });

    // Conceder e revogar são ações diferentes no registro, ainda que o
    // código seja o mesmo: quem lê o histórico procura por uma ou por outra.
    await registrar(tx, {
      parishId,
      atorId: grantedBy,
      acao: granted ? ACOES.PERMISSAO_CONCEDIDA : ACOES.PERMISSAO_REVOGADA,
      alvoTipo: "membro",
      alvoId: userId,
      detalhe: { permissao: permissionCode },
    });

    return resultado;
  });
}

/**
 * Remove o override — o usuário volta a depender só das permissões do papel.
 *
 * `removidoPor` foi acrescentado junto com o log: sem saber quem executou,
 * o registro responderia "a permissão sumiu" e não "quem a tirou", que é a
 * pergunta que importa.
 */
export function removeOverride(
  parishId: string,
  userId: string,
  permissionCode: PermissionCode,
  removidoPor: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const resultado = await tx.permissionOverride.deleteMany({
      where: { parishId, userId, permissionCode },
    });

    // Só registra o que de fato existia: tentar remover algo que não estava
    // lá não é um evento, e encheria o histórico de ruído.
    if (resultado.count > 0) {
      await registrar(tx, {
        parishId,
        atorId: removidoPor,
        acao: ACOES.PERMISSAO_REMOVIDA,
        alvoTipo: "membro",
        alvoId: userId,
        detalhe: { permissao: permissionCode },
      });
    }

    return resultado;
  });
}
