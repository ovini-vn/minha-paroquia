import { z } from "zod";

export const createInvitationInputSchema = z.object({
  type: z.enum(["link", "qrcode", "individual"]).default("link"),
  // FIEL é o padrão implícito (armazenado como null) — só quem tem
  // invitations.create pode escolher outro papel, ver invitation-actions.ts.
  // PAROCO não entra aqui de propósito: normalmente já existe um só, criar
  // outro via convite é caso raro demais para o MVP.
  role: z
    .enum(["FIEL", "SACERDOTE", "SECRETARIA", "COORDENADOR_PASTORAL", "CATEQUISTA", "COORDENADOR_LITURGIA"])
    .default("FIEL"),
  expiresInDays: z.number().int().positive().max(365).optional(),
  maxUses: z.number().int().positive().max(1000).optional(),
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

export const inviteCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Código de convite inválido.");
