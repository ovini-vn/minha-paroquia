import { z } from "zod";

export const createEventInputSchema = z.object({
  title: z.string().trim().min(2, "Informe um título."),
  description: z.string().trim().max(500).optional(),
  startsAt: z.coerce.date(),
  location: z.string().trim().max(160).optional(),
  // Só https: a URL vai para dentro de uma tag <img> servida ao fiel, e
  // http puro num app https quebra e ainda vira aviso de segurança.
  imageUrl: z
    .string()
    .trim()
    .url("Informe um endereço de imagem válido.")
    .startsWith("https://", "O endereço precisa começar com https://")
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const updateEventInputSchema = createEventInputSchema;
export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;
