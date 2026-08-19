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
  AVISOS_MANAGE: "avisos.manage",
  PRAYER_REQUESTS_VIEW_PRIVATE: "prayer_requests.view_private",
  PERMISSION_OVERRIDES_MANAGE: "permission_overrides.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_NAMES: Record<PermissionCode, string> = {
  [PERMISSIONS.INVITATIONS_CREATE]: "Criar convites",
  [PERMISSIONS.INVITATIONS_VIEW]: "Ver convites",
  [PERMISSIONS.MEMBERS_VIEW]: "Ver membros",
  [PERMISSIONS.DASHBOARD_PARISH_VIEW]: "Ver painel da paróquia",
  [PERMISSIONS.AGENDA_MANAGE]: "Gerenciar agenda e eventos",
  [PERMISSIONS.POSTS_CREATE]: "Publicar Palavra do Padre",
  [PERMISSIONS.AVAILABILITY_MANAGE]: "Gerenciar disponibilidade de atendimento",
  [PERMISSIONS.OPPORTUNITIES_MANAGE]: "Gerenciar oportunidades de servir",
  [PERMISSIONS.CATEQUESE_MANAGE]: "Gerenciar catequese",
  [PERMISSIONS.CATEQUESE_TEACH]: "Lecionar catequese",
  [PERMISSIONS.LITURGIA_MANAGE]: "Gerenciar liturgia",
  [PERMISSIONS.DIZIMO_MANAGE]: "Gerenciar dízimo",
  [PERMISSIONS.SACRAMENTS_VALIDATE]: "Validar sacramentos",
  [PERMISSIONS.AVISOS_MANAGE]: "Gerenciar avisos",
  [PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE]: "Ver pedidos de oração privados",
  [PERMISSIONS.PERMISSION_OVERRIDES_MANAGE]: "Delegar permissões",
};

// PERMISSION_OVERRIDES_MANAGE só existe para PAROCO, de propósito — é
// autoridade sobre o próprio sistema de permissões (quem pode conceder
// mais permissão a quem), e Secretaria concedendo a si mesma seria um
// loop de escalação de privilégio.
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
    PERMISSIONS.AVISOS_MANAGE,
    PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE,
    PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
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
    PERMISSIONS.AVISOS_MANAGE,
  ],
  SACERDOTE: [
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.AVAILABILITY_MANAGE,
    PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE,
  ],
  FIEL: [],
  RESPONSAVEL_FAMILIAR: [],
  CATEQUISTA: [PERMISSIONS.CATEQUESE_TEACH],
  COORDENADOR_PASTORAL: [PERMISSIONS.OPPORTUNITIES_MANAGE],
  COORDENADOR_LITURGIA: [PERMISSIONS.LITURGIA_MANAGE],
};

/**
 * Delegação fina (P2, ambiguidade #7): aplica os overrides do usuário por
 * cima das permissões fixas do papel — granted=true concede mesmo que o
 * papel não tenha, granted=false revoga mesmo que o papel tenha. Extraída
 * como função pura (usada por getSessionContext) para poder testar a
 * regra sem precisar simular cookies/sessão.
 */
export function computeEffectivePermissions(
  rolePermissions: PermissionCode[],
  overrides: { permissionCode: string; granted: boolean }[],
): PermissionCode[] {
  const effective = new Set(rolePermissions);
  for (const override of overrides) {
    if (override.granted) effective.add(override.permissionCode as PermissionCode);
    else effective.delete(override.permissionCode as PermissionCode);
  }
  return Array.from(effective);
}

/**
 * "Vê tudo, de qualquer ministério" vs. "vê só o que é seu". Usado em
 * Servir: Pároco/Secretaria têm supervisão geral; Coordenador de Pastoral
 * só enxerga as oportunidades (e interesses) que ele mesmo criou — ver
 * src/server/modules/opportunities/service.ts.
 */
export function isFullAdmin(roleCode: RoleCode): boolean {
  return roleCode === "PAROCO" || roleCode === "SECRETARIA";
}
