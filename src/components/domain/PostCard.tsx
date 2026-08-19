import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/date";

type Post = {
  id: string;
  mediaType: string;
  contentText: string | null;
  mediaUrl: string | null;
  publishedAt: Date;
  priestProfile: { title: string; user: { fullName: string } };
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  texto: "Texto",
  audio: "Ouvir áudio",
  video: "Assistir vídeo",
};

export function PostCard({ post }: { post: Post }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-ink-900">{post.priestProfile.user.fullName}</p>
        <p className="text-xs text-ink-700">{formatDateTime(post.publishedAt)}</p>
      </div>
      {post.mediaType === "texto" ? (
        <p className="whitespace-pre-wrap text-sm text-ink-700">{post.contentText}</p>
      ) : (
        <a
          href={post.mediaUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-terracotta-700 underline"
        >
          {MEDIA_TYPE_LABEL[post.mediaType]}
        </a>
      )}
    </Card>
  );
}
