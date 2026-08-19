import { z } from "zod";

export const createPrayerRequestInputSchema = z.object({
  contentText: z.string().trim().min(2, "Escreva seu pedido.").max(1000),
  visibility: z.enum(["padre", "comunidade"]).default("padre"),
  isAnonymous: z.coerce.boolean().default(false),
});
export type CreatePrayerRequestInput = z.infer<typeof createPrayerRequestInputSchema>;
