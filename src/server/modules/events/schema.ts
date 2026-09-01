import { z } from "zod";

const CATEGORIAS = [
  "missa",
  "oracao",
  "sacramento",
  "formacao",
  "comunidade",
  "festa",
  "outro",
] as const;

export const createEventInputSchema = z.object({
  title: z.string().trim().min(2, "Informe um título."),
  /*
   * A categoria dá a cor na agenda. O padrão é "comunidade", e não "outro":
   * evento lançado à mão por uma paróquia quase sempre é encontro de
   * pastoral, e um padrão que quase nunca acerta faz todo mundo esquecer de
   * trocar — e a agenda vira uma coluna cinza.
   */
  categoria: z.enum(CATEGORIAS).default("comunidade"),
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
