import { withTenantContext } from "@/server/db/tenant-context";
import { notifyManyUsers } from "@/server/modules/notifications/service";
import { ForbiddenError, NotFoundError } from "@/server/shared/errors";
import type { CreatePostInput, EditarPostInput } from "./schema";
import { POST_PREVIEW_LABEL } from "@/lib/post-labels";
import { resumir } from "@/lib/resumo";

/**
 * O que o aviso da Palavra do Padre DIZ.
 *
 * Era uma frase fixa — "O pároco publicou uma nova mensagem — confira na
 * Comunidade." — em toda publicação, todo dia. Numa paróquia que publica o
 * Evangelho diariamente isso empilha avisos idênticos: em 02/09/2026 a
 * conta do pároco em produção tinha nove seguidos, e nenhum deles dizia
 * qual mensagem era. Parecia repetição de conteúdo, e era só repetição de
 * carimbo — as mensagens embaixo eram cinco Evangelhos diferentes.
 *
 * É a regra que o módulo de avisos já seguia e este não: a notificação
 * carrega o começo do conteúdo, e não um "confira no app". Um aviso que
 * não diz o que chegou obriga a abrir para descobrir se importava.
 *
 * LIMITE HONESTO: quando a mensagem é só vídeo ou áudio, não temos título
 * nem transcrição — a passagem aparece na imagem do vídeo, que é pixel e
 * não dado nosso. Aí o melhor que dá é dizer o MEIO ("novo vídeo"), e o
 * que distingue um dia do outro continua sendo a data, que a linha da
 * notificação já mostra. Para diferenciar de verdade, a mensagem
 * precisaria de um título — e isso é campo novo, não texto novo.
 */
function avisoDaPalavra(post: { mediaType: string; contentText: string | null }): string {
  const texto = post.contentText?.trim();
  if (texto) return resumir(texto);
  return (
    POST_PREVIEW_LABEL[post.mediaType] ??
    "O pároco publicou uma nova mensagem — confira na Comunidade."
  );
}

export function createPost(
  input: CreatePostInput & { parishId: string; priestProfileId: string | null; createdBy: string },
) {
  return withTenantContext(input.parishId, async (tx) => {
    const post = await tx.post.create({
      data: {
        parishId: input.parishId,
        priestProfileId: input.priestProfileId,
        createdBy: input.createdBy,
        mediaType: input.mediaType,
        contentText: input.contentText ?? null,
        mediaUrl: input.mediaUrl ?? null,
      },
    });

    const members = await tx.parishMembership.findMany({
      where: { parishId: input.parishId, status: "active" },
      select: { userId: true },
    });
    await notifyManyUsers(
      tx,
      input.parishId,
      members.map((m) => m.userId),
      "espiritual",
      "Nova Palavra do Padre",
      avisoDaPalavra(post),
      "/comunidade",
    );

    return post;
  });
}

export function listRecentPosts(parishId: string, limit = 10) {
  return withTenantContext(parishId, (tx) =>
    tx.post.findMany({
      where: { parishId },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: {
        priestProfile: {
          select: {
            id: true,
            // Quem é o dono da assinatura — usado por `podeMexerNaPalavra`
            // para dizer se esta pessoa pode corrigir esta publicação.
            userId: true,
            title: true,
            photoUrl: true,
            user: { select: { fullName: true, photoUrl: true } },
          },
        },
      },
    }),
  );
}

export async function getLatestPost(parishId: string) {
  const [latest] = await listRecentPosts(parishId, 1);
  return latest ?? null;
}

/**
 * Quem pode corrigir ou apagar uma publicação.
 *
 * Duas portas, e a segunda existe porque a primeira não cobre tudo:
 *
 * 1. Quem escreveu. Vale pelo `createdBy` e também pelo perfil de sacerdote
 *    que assina — um padre que publicou antes de a coluna existir continua
 *    alcançando o que é dele.
 *
 * 2. Quem administra a paróquia (`posts.manage`). Sem isto, uma publicação
 *    antiga, ou a que entrou por importação, ficaria sem dono: ninguém no
 *    mundo poderia corrigi-la.
 *
 * A Palavra é assinada por uma pessoa, e por isso a primeira porta é
 * estreita de propósito: um sacerdote não edita o que o outro disse.
 */
export function podeMexerNaPalavra(
  post: { createdBy: string | null; priestProfile: { userId: string } | null },
  quem: { userId: string; administraPalavra: boolean },
): boolean {
  if (quem.administraPalavra) return true;
  if (post.createdBy && post.createdBy === quem.userId) return true;
  return post.priestProfile?.userId === quem.userId;
}

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];

/**
 * Recebe a transação de quem chamou, em vez de abrir a sua.
 *
 * Aninhar `withTenantContext` abriria uma segunda transação para ler o que a
 * primeira vai alterar — duas conexões e nenhuma atomicidade entre a
 * verificação e a escrita.
 */
async function exigirAcesso(
  tx: Tx,
  parishId: string,
  postId: string,
  quem: { userId: string; administraPalavra: boolean },
) {
  const post = await tx.post.findFirst({
    where: { id: postId, parishId },
    select: {
      id: true,
      createdBy: true,
      mediaType: true,
      priestProfile: { select: { userId: true } },
    },
  });
  if (!post) throw new NotFoundError("Publicação");
  if (!podeMexerNaPalavra(post, quem)) throw new ForbiddenError();
  return post;
}

/**
 * Corrige o texto de uma publicação.
 *
 * NÃO notifica ninguém, ao contrário de publicar. A notificação é do
 * anúncio — "o pároco publicou uma nova mensagem" —, e mandá-la de novo por
 * causa de uma vírgula acordaria a paróquia inteira para nada.
 *
 * O tipo de mídia não muda: um texto continua texto, um vídeo continua
 * vídeo. Trocar o tipo é outra publicação, e apagar esta e escrever outra
 * diz isso com mais honestidade do que uma edição que transforma a coisa.
 */
export function editarPost(
  input: EditarPostInput & { parishId: string; quem: { userId: string; administraPalavra: boolean } },
) {
  return withTenantContext(input.parishId, async (tx) => {
    const post = await exigirAcesso(tx, input.parishId, input.postId, input.quem);

    return tx.post.update({
      where: { id: post.id },
      data:
        post.mediaType === "texto"
          ? { contentText: input.contentText ?? null }
          : { mediaUrl: input.mediaUrl ?? null },
    });
  });
}

export function apagarPost(
  parishId: string,
  postId: string,
  quem: { userId: string; administraPalavra: boolean },
) {
  return withTenantContext(parishId, async (tx) => {
    const post = await exigirAcesso(tx, parishId, postId, quem);
    return tx.post.delete({ where: { id: post.id } });
  });
}
