import { z } from "zod";

const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2100;

export const criarPlanoSchema = z.object({
  ano: z.coerce.number().int().min(ANO_MINIMO).max(ANO_MAXIMO),
  titulo: z.string().trim().min(3, "Dê um título ao plano.").max(160),
  introducao: z.string().trim().max(4000).optional(),
});

export const editarPlanoSchema = criarPlanoSchema.extend({
  planoId: z.string().uuid(),
});

export const criarSecaoSchema = z.object({
  planoId: z.string().uuid(),
  rotulo: z.string().trim().max(60).optional(),
  titulo: z.string().trim().min(2, "Dê um título à seção.").max(200),
  /*
   * Sem teto baixo de propósito: os cinco eixos da arquidiocese de Londrina
   * têm objetivo, estratégia e linhas de ação num bloco só, e cortar em mil
   * caracteres obrigaria a picar um texto que se lê inteiro.
   */
  corpo: z.string().trim().min(2, "Escreva o conteúdo da seção.").max(20_000),
});

export const editarSecaoSchema = criarSecaoSchema.omit({ planoId: true }).extend({
  secaoId: z.string().uuid(),
});

export type CriarPlanoInput = z.infer<typeof criarPlanoSchema>;
export type EditarPlanoInput = z.infer<typeof editarPlanoSchema>;
export type CriarSecaoInput = z.infer<typeof criarSecaoSchema>;
export type EditarSecaoInput = z.infer<typeof editarSecaoSchema>;
