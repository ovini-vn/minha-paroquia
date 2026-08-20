import { z } from "zod";

export const updateParishProfileInputSchema = z.object({
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().length(2, "Use a sigla do estado (2 letras).").toUpperCase().optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  logoUrl: z.string().trim().url("Informe uma URL válida.").optional(),
});
export type UpdateParishProfileInput = z.infer<typeof updateParishProfileInputSchema>;

export const registerParishInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da paróquia."),
  city: z.string().trim().min(2, "Informe a cidade."),
  state: z.string().trim().length(2, "Use a sigla do estado (2 letras).").toUpperCase(),
});
export type RegisterParishInput = z.infer<typeof registerParishInputSchema>;
