import type { CelebrationType } from "@prisma/client";

export const CELEBRATION_TYPE_LABELS: Record<CelebrationType, string> = {
  missa: "Missa",
  confissao: "Confissão",
  adoracao: "Adoração",
  batizado: "Batizado",
  casamento: "Casamento",
  outro: "Celebração",
};
