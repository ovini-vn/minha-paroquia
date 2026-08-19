import { z } from "zod";

export const RELATIONSHIPS = ["conjuge", "filho", "filha", "pai", "mae", "dependente", "outro"] as const;

export const createFamilyMemberInputSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo."),
  relationship: z.enum(RELATIONSHIPS),
  birthDate: z.coerce.date().optional(),
});
export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberInputSchema>;
