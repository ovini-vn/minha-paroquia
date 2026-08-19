import { z } from "zod";

export const createAvisoInputSchema = z.object({
  title: z.string().trim().min(2, "Informe um título."),
  body: z.string().trim().min(2, "Informe o texto do aviso.").max(1000),
});
export type CreateAvisoInput = z.infer<typeof createAvisoInputSchema>;

export const updateAvisoInputSchema = createAvisoInputSchema;
export type UpdateAvisoInput = z.infer<typeof updateAvisoInputSchema>;
