import { z } from "zod";

export const CELEBRATION_TYPES = ["missa", "confissao", "adoracao", "batizado", "casamento", "outro"] as const;

export const createCelebrationInputSchema = z.object({
  type: z.enum(CELEBRATION_TYPES).default("missa"),
  title: z.string().trim().max(120).optional(),
  startsAt: z.coerce.date(),
  location: z.string().trim().max(160).optional(),
  priestProfileId: z.string().uuid().optional(),
});
export type CreateCelebrationInput = z.infer<typeof createCelebrationInputSchema>;
