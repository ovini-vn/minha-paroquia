import "server-only";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "./rbac";
import { requireSessionForPage } from "./guards";
import type { SessionContext } from "./session";

/**
 * O que uma pessoa alcança na área de gestão.
 *
 * Existe porque "gestão" não é uma permissão só: a catequista tem apenas
 * CATEQUESE_TEACH e nunca viu o painel; o bispo pode não ter paróquia
 * nenhuma. Antes cada tela decidia isso por conta própria e a porta de
 * entrada tinha que adivinhar — resultado, quem só dá catequese seria
 * expulso para o Início ao clicar no que o menu ofereceu.
 */
export type ManagementAccess = {
  /** Painel da paróquia: avisos, eventos, missas, convites, cadastro. */
  parishPanel: boolean;
  /** Turmas que a pessoa acompanha como catequista. */
  catequese: boolean;
  dioceses: boolean;
  provinces: boolean;
  national: boolean;
  platform: boolean;
  /** Se é falso, nem o acesso à área deve ser oferecido. */
  any: boolean;
};

export function getManagementAccess(session: SessionContext | null): ManagementAccess {
  if (!session) {
    return {
      parishPanel: false,
      catequese: false,
      dioceses: false,
      provinces: false,
      national: false,
      platform: false,
      any: false,
    };
  }

  const has = (code: string) => session.isPlatformAdmin || session.permissions.includes(code as never);

  const acesso = {
    parishPanel: has(PERMISSIONS.DASHBOARD_PARISH_VIEW),
    catequese: has(PERMISSIONS.CATEQUESE_TEACH) || has(PERMISSIONS.CATEQUESE_MANAGE),
    dioceses: session.dioceses.length > 0 || session.isPlatformAdmin,
    provinces: session.provinces.length > 0,
    national: session.national !== null || session.isPlatformAdmin,
    platform: session.isPlatformAdmin,
    any: false,
  };

  acesso.any =
    acesso.parishPanel ||
    acesso.catequese ||
    acesso.dioceses ||
    acesso.provinces ||
    acesso.national ||
    acesso.platform;

  return acesso;
}

/**
 * Guarda da área de gestão. Admite QUALQUER acesso de gestão, e não uma
 * permissão específica — cada seção da página se protege sozinha.
 */
export async function requireManagementPage(): Promise<{
  session: SessionContext;
  acesso: ManagementAccess;
}> {
  const session = await requireSessionForPage();
  const acesso = getManagementAccess(session);
  if (!acesso.any) redirect("/inicio");
  return { session, acesso };
}
