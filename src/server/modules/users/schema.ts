import { z } from "zod";

export const registerInputSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const updateProfileInputSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo."),
  phone: z.string().trim().max(30).optional(),
  birthDate: z.coerce.date().optional(),
  photoUrl: z.string().trim().url("Informe uma URL válida.").optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
