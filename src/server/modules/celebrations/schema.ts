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

export const RECURRENCE_FREQUENCIES = ["semanal", "mensal"] as const;

export const createCelebrationScheduleInputSchema = z
  .object({
    type: z.enum(CELEBRATION_TYPES).default("missa"),
    title: z.string().trim().max(120).optional(),
    location: z.string().trim().max(160).optional(),
    priestProfileId: z.string().uuid().optional(),
    frequency: z.enum(RECURRENCE_FREQUENCIES),
    weekday: z.coerce.number().int().min(0).max(6),
    weekOfMonth: z.coerce.number().int().min(1).max(5).optional(),
    // Minutos desde a meia-noite, horário de Brasília.
    timeMinutes: z.coerce.number().int().min(0).max(24 * 60 - 1),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date().optional(),
  })
  .refine((v) => v.frequency !== "mensal" || v.weekOfMonth !== undefined, {
    message: "Escolha qual semana do mês.",
    path: ["weekOfMonth"],
  })
  .refine((v) => !v.endsOn || v.endsOn >= v.startsOn, {
    message: "O fim da vigência não pode ser antes do início.",
    path: ["endsOn"],
  });
export type CreateCelebrationScheduleInput = z.infer<typeof createCelebrationScheduleInputSchema>;
