import { z } from "zod";

export const createEventInputSchema = z.object({
  title: z.string().trim().min(2, "Informe um título."),
  description: z.string().trim().max(500).optional(),
  startsAt: z.coerce.date(),
  location: z.string().trim().max(160).optional(),
});
export type CreateEventInput = z.infer<typeof createEventInputSchema>;
