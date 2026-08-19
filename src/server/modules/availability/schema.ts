import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createAvailabilityInputSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_RE, "Horário inválido."),
    endTime: z.string().regex(TIME_RE, "Horário inválido."),
    type: z.enum(["atendimento", "confissao"]).default("atendimento"),
    slotMinutes: z.coerce.number().int().min(10).max(120).default(30),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "O horário final precisa ser depois do inicial.",
    path: ["endTime"],
  });
export type CreateAvailabilityInput = z.infer<typeof createAvailabilityInputSchema>;
