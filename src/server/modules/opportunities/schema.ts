import { z } from "zod";

export const createOpportunityInputSchema = z.object({
  title: z.string().trim().min(2, "Informe um título."),
  description: z.string().trim().max(1000).optional(),
  startsAt: z.coerce.date().optional(),
});
export type CreateOpportunityInput = z.infer<typeof createOpportunityInputSchema>;

export const INTEREST_STATUS_TRANSITIONS = ["em_contato", "acolhido", "declinado"] as const;
export const updateInterestStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(INTEREST_STATUS_TRANSITIONS),
});
