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
