import { z } from "zod";

export const upsertVolunteerProfileInputSchema = z.object({
  hasTime: z.coerce.boolean(),
  timeAreas: z.array(z.string()),
  hasTalent: z.coerce.boolean(),
  talents: z.array(z.string()),
  wantsToServe: z.coerce.boolean(),
  serviceAreas: z.array(z.string()),
  availabilityNote: z.string().trim().max(280).optional(),
  freeText: z.string().trim().max(500).optional(),
});
export type UpsertVolunteerProfileInput = z.infer<typeof upsertVolunteerProfileInputSchema>;
