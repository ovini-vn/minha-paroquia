import { Headphones, Video } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Retrato } from "@/components/ui/Retrato";
import { formatDateTime } from "@/lib/date";
import { VideoDoPost } from "@/components/domain/VideoDoPost";

type Post = {
  id: string;
  mediaType: string;
  contentText: string | null;
  mediaUrl: string | null;
  publishedAt: Date;
};

import type { Assinatura } from "@/server/modules/parishes/paroco";

export type { Assinatura };

const MEDIA: Record<string, { label: string; icon: typeof Headphones }> = {
  audio: { label: "Ouvir áudio", icon: Headphones },
  video: { label: "Assistir vídeo", icon: Video },
};

export function PostCard({
  post,
  assinatura,
  gestao,
}: {
  post: Post;
  assinatura: Assinatura;
  /**
   * O que quem pode mexer vê no pé do cartão.
   *
   * Vem de fora porque o cartão não decide permissão: ele mostra a Palavra,
   * e quem sabe se esta pessoa pode corrigir esta publicação é a página que
   * tem a sessão na mão.
   */
  gestao?: ReactNode;
}) {
  const media = MEDIA[post.mediaType];

  return (
    // A hairline dourada no topo marca o conteúdo editorial do padre.
    <Card className="relative overflow-hidden before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
      <div className="flex items-center gap-3">
        <Retrato nome={assinatura.nome} fotoUrl={assinatura.fotoUrl} size="sm" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">{assinatura.nome}</p>
          <p className="text-xs text-muted">
            {assinatura.titulo} · {formatDateTime(post.publishedAt)}
          </p>
        </div>
      </div>

      {post.mediaType === "texto" && (
        <p className="mt-3 whitespace-pre-wrap font-serif text-[17px] leading-[1.62] text-foreground">
          {post.contentText}
        </p>
      )}

      {/* Vídeo se assiste aqui dentro; áudio e o resto continuam abrindo fora. */}
      {post.mediaType === "video" && post.mediaUrl && (
        <VideoDoPost url={post.mediaUrl} titulo={assinatura.nome} />
      )}

      {post.mediaType !== "texto" && post.mediaType !== "video" && (
        <a
          href={post.mediaUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/45 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-gold"
        >
          {media && <media.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
          {media?.label ?? "Abrir"}
        </a>
      )}

      {gestao}
    </Card>
  );
}
