import { z } from "zod";

export const LITURGICAL_ROLES = ["leitor", "salmista", "ministro", "acolhida", "musica", "outro"] as const;

export const createAvailabilityInputSchema = z.object({
  roleType: z.enum(LITURGICAL_ROLES),
  weekdayPref: z.coerce.number().int().min(0).max(6).optional(),
  notes: z.string().trim().max(280).optional(),
});
export type CreateAvailabilityInput = z.infer<typeof createAvailabilityInputSchema>;

export const createScheduleInputSchema = z.object({
  roleType: z.enum(LITURGICAL_ROLES),
  userId: z.string().uuid(),
});
export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;
