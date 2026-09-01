import { z } from "zod";

export const createPostInputSchema = z
  .object({
    mediaType: z.enum(["texto", "audio", "video"]).default("texto"),
    contentText: z.string().trim().min(1).max(4000).optional(),
    mediaUrl: z.string().trim().url("Informe uma URL válida.").optional(),
  })
  .refine((data) => (data.mediaType === "texto" ? !!data.contentText : !!data.mediaUrl), {
    message: "Preencha o conteúdo de acordo com o tipo escolhido.",
  });
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

/**
 * A correção de uma publicação.
 *
 * Sem `mediaType`: o tipo não muda numa edição. Um dos dois campos vem
 * preenchido, conforme o que a publicação já é, e o serviço escolhe qual
 * gravar a partir do tipo guardado — e não do que o formulário mandar.
 */
export const editarPostSchema = z
  .object({
    postId: z.string().uuid(),
    contentText: z.string().trim().min(1).max(4000).optional(),
    mediaUrl: z.string().trim().url("Informe uma URL válida.").optional(),
  })
  .refine((data) => Boolean(data.contentText || data.mediaUrl), {
    message: "Escreva o conteúdo da publicação.",
  });
export type EditarPostInput = z.infer<typeof editarPostSchema>;
