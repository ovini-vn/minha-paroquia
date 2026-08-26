/**
 * O que se lê no lugar do texto quando a Palavra do Padre é áudio ou vídeo.
 *
 * O post traz mídia e não parágrafo, mas o cartão precisa dizer alguma
 * coisa — deixar em branco faria parecer que a mensagem não carregou.
 *
 * Vive aqui, e não dentro de uma tela, porque o Início e a Palavra mostram
 * o mesmo post: se cada um tivesse a sua frase, um dia elas divergiriam.
 */
export const POST_PREVIEW_LABEL: Record<string, string> = {
  audio: "Novo áudio disponível — toque para ouvir.",
  video: "Novo vídeo disponível — toque para assistir.",
};
