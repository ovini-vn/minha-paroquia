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
  // O tema do itinerário, quando a turma segue um. String vazia vira
  // undefined no action, porque <select> sem escolha manda "".
  itinerarioTemaId: z.string().uuid().optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const createRiteInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do rito."),
  scheduledAt: z.coerce.date().optional(),
});
export type CreateRiteInput = z.infer<typeof createRiteInputSchema>;

export const criarItinerarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome para o itinerário."),
  descricao: z.string().trim().max(400).optional(),
  ordem: z.coerce.number().int().min(0).max(99).optional(),
});
export type CriarItinerarioInput = z.infer<typeof criarItinerarioSchema>;

export const criarTemaSchema = z.object({
  titulo: z.string().trim().min(2, "Informe o tema do encontro."),
  // O material é digitado pela paróquia, e cada arquidiocese escreve o seu —
  // por isso texto livre e generoso, em vez de uma lista fechada.
  descricao: z.string().trim().max(2000).optional(),
  ordem: z.coerce.number().int().min(0).max(999).optional(),
});
export type CriarTemaInput = z.infer<typeof criarTemaSchema>;

export const criarRitoDaTurmaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do rito."),
  scheduledAt: z.coerce.date().optional(),
});
export type CriarRitoDaTurmaInput = z.infer<typeof criarRitoDaTurmaSchema>;

export const concluirComSacramentoSchema = z.object({
  type: z.enum(["batismo", "primeira_eucaristia", "crisma", "matrimonio", "outro"]),
  date: z.coerce.date(),
  location: z.string().trim().max(160).optional(),
  note: z.string().trim().max(400).optional(),
});
export type ConcluirComSacramentoInput = z.infer<typeof concluirComSacramentoSchema>;
