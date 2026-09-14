import { Headphones } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

/**
 * O botão da Palavra do Padre no Início e na aba Palavra — que só existe
 * quando a mensagem é ÁUDIO.
 *
 * Antes era um "Ler mensagem" com ícone de microfone em todo post que não
 * fosse vídeo, levando para a Comunidade. Nos dois casos ele enganava:
 *
 * No TEXTO, aparecia embaixo da mensagem já inteira na tela. Quem tocava
 * ia para outra aba reler o que tinha acabado de ler — e o microfone
 * prometia uma leitura em voz alta que não existe.
 *
 * No ÁUDIO, o cartão dizia "toque para ouvir" e o botão levava para a
 * Comunidade, onde a pessoa ainda precisava achar o post e tocar de novo.
 *
 * Agora texto não tem botão (as anteriores continuam em "Ver todas", no
 * título da seção), e áudio abre o áudio. Abre fora, como no `PostCard`:
 * o link é de onde o padre hospedou, e não há player próprio para ele.
 *
 * Mora aqui, e não repetido nas duas telas, porque as duas mostram o mesmo
 * post — a mesma razão de `POST_PREVIEW_LABEL` viver num lugar só.
 */
export function OuvirAudioDoPost({
  mediaType,
  mediaUrl,
}: {
  mediaType: string;
  mediaUrl: string | null;
}) {
  if (mediaType !== "audio" || !mediaUrl) return null;

  return (
    <LinkButton
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      variant="gold"
      size="sm"
      className="mt-3.5"
    >
      <Headphones className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      Ouvir mensagem
    </LinkButton>
  );
}
