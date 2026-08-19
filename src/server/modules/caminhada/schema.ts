import { z } from "zod";

export const registerMassParticipationInputSchema = z.object({
  participatedAt: z.coerce.date(),
  reflectionText: z.string().trim().max(1000).optional(),
});
export type RegisterMassParticipationInput = z.infer<typeof registerMassParticipationInputSchema>;

export const SACRAMENT_TYPES = ["batismo", "primeira_eucaristia", "crisma", "matrimonio", "outro"] as const;

export const registerSacramentInputSchema = z.object({
  type: z.enum(SACRAMENT_TYPES),
  date: z.coerce.date(),
  location: z.string().trim().max(160).optional(),
  priestProfileId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});
export type RegisterSacramentInput = z.infer<typeof registerSacramentInputSchema>;

export const registerConfessionInputSchema = z.object({
  date: z.coerce.date(),
});
export type RegisterConfessionInput = z.infer<typeof registerConfessionInputSchema>;
