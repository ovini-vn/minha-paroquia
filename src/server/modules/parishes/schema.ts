import { z } from "zod";

export const updateParishProfileInputSchema = z.object({
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  logoUrl: z.string().trim().url("Informe uma URL válida.").optional(),
});
export type UpdateParishProfileInput = z.infer<typeof updateParishProfileInputSchema>;
