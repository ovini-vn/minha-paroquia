import type { DioceseRole } from "@prisma/client";

export const DIOCESE_ROLE_LABELS: Record<DioceseRole, string> = {
  BISPO: "Bispo",
  ADMINISTRADOR_DIOCESANO: "Administrador diocesano",
};
