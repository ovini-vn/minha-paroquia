import { z } from "zod";

/**
 * Teto de um Pix gerado no app: R$ 50.000.
 *
 * Não é regra do Pix — é anteparo contra o dedo escorregando. Quem quer
 * contribuir com mais que isso fala com a secretaria, e é melhor assim.
 */
export const TETO_EM_CENTAVOS = 5_000_000;

/**
 * Lê "150", "150,50", "R$ 1.234,56" e devolve centavos inteiros.
 *
 * Centavos porque dinheiro em ponto flutuante perde centavo, e um relatório
 * que não fecha por um centavo é um relatório em que ninguém confia.
 */
export function paraCentavos(texto: string): number | null {
  const limpo = texto.replace(/[R$\s.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

const valorOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? paraCentavos(v) : null))
  .refine((c) => c === null || (Number.isInteger(c) && c > 0 && c <= TETO_EM_CENTAVOS), {
    message: "Informe um valor entre R$ 0,01 e R$ 50.000,00 — ou deixe em branco.",
  });

export const gerarPixSchema = z.object({
  finalidadeId: z.string().uuid("Escolha a finalidade."),
  valor: valorOpcional,
});

export const criarFinalidadeSchema = z.object({
  nome: z.string().trim().min(2, "Dê um nome à finalidade.").max(80),
  descricao: z.string().trim().max(400).optional(),
  icone: z.string().trim().max(40).default("igreja"),
  ehDizimo: z.boolean().default(false),
});

export const editarFinalidadeSchema = criarFinalidadeSchema.extend({
  finalidadeId: z.string().uuid(),
  ativa: z.boolean().default(true),
});

/**
 * O lançamento à mão: envelope, coleta, dinheiro.
 *
 * Aqui a finalidade e a pessoa vêm de quem digita — é o único jeito
 * honesto, porque não há identificador nenhum a que recorrer.
 */
export const lancarContribuicaoSchema = z.object({
  finalidadeId: z.string().uuid("Escolha a finalidade."),
  /** Nulo quando é a coleta da missa, que não tem nome. */
  userId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  valor: z
    .string()
    .trim()
    .transform((v) => paraCentavos(v))
    .refine((c) => c !== null && c > 0 && c <= TETO_EM_CENTAVOS, {
      message: "Informe um valor entre R$ 0,01 e R$ 50.000,00.",
    }),
  recebidaEm: z.coerce.date(),
  forma: z.enum(["dinheiro", "envelope", "transferencia", "pix_avulso", "outro"]),
  observacao: z.string().trim().max(400).optional(),
});

export type GerarPixInput = z.infer<typeof gerarPixSchema>;
export type CriarFinalidadeInput = z.infer<typeof criarFinalidadeSchema>;
export type EditarFinalidadeInput = z.infer<typeof editarFinalidadeSchema>;
export type LancarContribuicaoInput = z.infer<typeof lancarContribuicaoSchema>;
