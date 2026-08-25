import { Headphones, Video } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateTime } from "@/lib/date";

type Post = {
  id: string;
  mediaType: string;
  contentText: string | null;
  mediaUrl: string | null;
  publishedAt: Date;
};

/** Quem assina — nem sempre é o dono da conta que publicou. */
export type Assinatura = { nome: string; titulo: string };

const MEDIA: Record<string, { label: string; icon: typeof Headphones }> = {
  audio: { label: "Ouvir áudio", icon: Headphones },
  video: { label: "Assistir vídeo", icon: Video },
};

export function PostCard({ post, assinatura }: { post: Post; assinatura: Assinatura }) {
  const media = MEDIA[post.mediaType];

  return (
    // A hairline dourada no topo marca o conteúdo editorial do padre.
    <Card className="relative overflow-hidden before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
      <div className="flex items-center gap-3">
        <Avatar name={assinatura.nome} size="sm" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">{assinatura.nome}</p>
          <p className="text-xs text-muted">
            {assinatura.titulo} · {formatDateTime(post.publishedAt)}
          </p>
        </div>
      </div>

      {post.mediaType === "texto" ? (
        <p className="mt-3 whitespace-pre-wrap font-serif text-[17px] leading-[1.62] text-foreground">
          {post.contentText}
        </p>
      ) : (
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
    </Card>
  );
}
