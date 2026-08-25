import { z } from "zod";

/**
 * Campo de URL que aceita vazio.
 *
 * Vazio precisa passar para que dé para APAGAR um link errado: o serviço
 * converte "" em null. Sem isso, um Instagram digitado torto ficaria lá para
 * sempre, porque o formulário só conseguiria trocar, nunca limpar.
 */
const urlOuVazio = (rotulo: string) =>
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), `Informe o endereço completo do ${rotulo}, começando com https://`)
    .optional();

export const updateParishProfileInputSchema = z.object({
  city: z.string().trim().max(100).optional(),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || v.length === 2, "Use a sigla do estado (2 letras).")
    .optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  logoUrl: urlOuVazio("logo"),
  facebookUrl: urlOuVazio("Facebook"),
  instagramUrl: urlOuVazio("Instagram"),
});
export type UpdateParishProfileInput = z.infer<typeof updateParishProfileInputSchema>;

export const registerParishInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da paróquia."),
  city: z.string().trim().min(2, "Informe a cidade."),
  state: z.string().trim().length(2, "Use a sigla do estado (2 letras).").toUpperCase(),
});
export type RegisterParishInput = z.infer<typeof registerParishInputSchema>;
