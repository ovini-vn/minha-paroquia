import { z } from "zod";

export const APPOINTMENT_CATEGORIES = [
  "confissao",
  "direcao_espiritual",
  "conversa",
  "questao_familiar",
  "sacramento",
  "outro",
] as const;

export const createAppointmentInputSchema = z.object({
  category: z.enum(APPOINTMENT_CATEGORIES),
  scheduledAt: z.coerce.date(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>;

export const APPOINTMENT_STATUS_TRANSITIONS = ["confirmado", "cancelado", "concluido"] as const;
export const updateAppointmentStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(APPOINTMENT_STATUS_TRANSITIONS),
});
