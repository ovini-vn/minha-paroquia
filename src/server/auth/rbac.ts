/**
 * Catálogo de papéis e permissões — fonte única de verdade, lida pelo seed
 * para popular roles/role_permissions no banco (ver prisma/seed.ts).
 * Adicionar uma permissão nova é editar este arquivo + rodar o seed de novo,
 * nunca uma migração estrutural (docs/FUNDACAO.md, Fase 3).
 *
 * ADMIN_PLATFORM não aparece aqui: não é um papel de paróquia, é o atributo
 * users.isPlatformAdmin.
 */

export const ROLE_CODES = [
  "FIEL",
  "RESPONSAVEL_FAMILIAR",
  "CATEQUISTA",
  "SACERDOTE",
  "PAROCO",
  "SECRETARIA",
  "COORDENADOR_PASTORAL",
  "COORDENADOR_LITURGIA",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_NAMES: Record<RoleCode, string> = {
  FIEL: "Fiel",
  RESPONSAVEL_FAMILIAR: "Responsável familiar",
  CATEQUISTA: "Catequista",
  SACERDOTE: "Sacerdote",
  PAROCO: "Pároco",
  SECRETARIA: "Secretaria",
  COORDENADOR_PASTORAL: "Coordenador de Pastoral",
  COORDENADOR_LITURGIA: "Coordenador de Liturgia",
};

export const PERMISSIONS = {
  INVITATIONS_CREATE: "invitations.create",
  INVITATIONS_VIEW: "invitations.view",
  MEMBERS_VIEW: "members.view",
  DASHBOARD_PARISH_VIEW: "dashboard.parish.view",
  AGENDA_MANAGE: "agenda.manage",
  POSTS_CREATE: "posts.create",
  AVAILABILITY_MANAGE: "availability.manage",
  OPPORTUNITIES_MANAGE: "opportunities.manage",
  CATEQUESE_MANAGE: "catequese.manage",
  CATEQUESE_TEACH: "catequese.teach",
  LITURGIA_MANAGE: "liturgia.manage",
  DIZIMO_MANAGE: "dizimo.manage",
  SACRAMENTS_VALIDATE: "sacraments.validate",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  PAROCO: [
    PERMISSIONS.INVITATIONS_CREATE,
    PERMISSIONS.INVITATIONS_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DASHBOARD_PARISH_VIEW,
    PERMISSIONS.AGENDA_MANAGE,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.AVAILABILITY_MANAGE,
    PERMISSIONS.OPPORTUNITIES_MANAGE,
    PERMISSIONS.CATEQUESE_MANAGE,
    PERMISSIONS.LITURGIA_MANAGE,
    PERMISSIONS.DIZIMO_MANAGE,
    PERMISSIONS.SACRAMENTS_VALIDATE,
  ],
  SECRETARIA: [
    PERMISSIONS.INVITATIONS_CREATE,
    PERMISSIONS.INVITATIONS_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DASHBOARD_PARISH_VIEW,
    PERMISSIONS.AGENDA_MANAGE,
    PERMISSIONS.OPPORTUNITIES_MANAGE,
    PERMISSIONS.CATEQUESE_MANAGE,
    PERMISSIONS.LITURGIA_MANAGE,
    PERMISSIONS.DIZIMO_MANAGE,
    PERMISSIONS.SACRAMENTS_VALIDATE,
  ],
  SACERDOTE: [PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.POSTS_CREATE, PERMISSIONS.AVAILABILITY_MANAGE],
  FIEL: [],
  RESPONSAVEL_FAMILIAR: [],
  CATEQUISTA: [PERMISSIONS.CATEQUESE_TEACH],
  COORDENADOR_PASTORAL: [PERMISSIONS.OPPORTUNITIES_MANAGE],
  COORDENADOR_LITURGIA: [PERMISSIONS.LITURGIA_MANAGE],
};

/**
 * "Vê tudo, de qualquer ministério" vs. "vê só o que é seu". Usado em
 * Servir: Pároco/Secretaria têm supervisão geral; Coordenador de Pastoral
 * só enxerga as oportunidades (e interesses) que ele mesmo criou — ver
 * src/server/modules/opportunities/service.ts.
 */
export function isFullAdmin(roleCode: RoleCode): boolean {
  return roleCode === "PAROCO" || roleCode === "SECRETARIA";
}
