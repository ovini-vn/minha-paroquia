import { z } from "zod";

export const createGroupInputSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome para a turma."),
  year: z.coerce.number().int().min(2020).max(2100),
  catechistUserId: z.string().uuid().optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

export const enrollInputSchema = z.object({
  familyMemberId: z.string().uuid(),
});

export const createSessionInputSchema = z.object({
  date: z.coerce.date(),
  topic: z.string().trim().max(160).optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const createRiteInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do rito."),
  scheduledAt: z.coerce.date().optional(),
});
export type CreateRiteInput = z.infer<typeof createRiteInputSchema>;
