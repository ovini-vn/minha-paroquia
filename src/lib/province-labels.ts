import type { ProvinceRole, NationalRole } from "@prisma/client";

export const PROVINCE_ROLE_LABELS: Record<ProvinceRole, string> = {
  ARCEBISPO_METROPOLITA: "Arcebispo Metropolita",
  ADMINISTRADOR_PROVINCIAL: "Administrador provincial",
};

export const NATIONAL_ROLE_LABELS: Record<NationalRole, string> = {
  PRESIDENTE_CNBB: "Presidente da CNBB",
  OBSERVADOR_NACIONAL: "Observador nacional",
};
