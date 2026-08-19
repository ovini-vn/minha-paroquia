import { z } from "zod";

export const setContributionInputSchema = z.object({
  userId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período inválido (use AAAA-MM)."),
  contributed: z.coerce.boolean(),
});
export type SetContributionInput = z.infer<typeof setContributionInputSchema>;
