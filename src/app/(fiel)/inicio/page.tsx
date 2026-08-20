import Link from "next/link";
import { getSessionContext } from "@/server/auth/session";
import { getNextCelebration } from "@/server/modules/celebrations/service";
import { getLatestPost } from "@/server/modules/posts/service";
import { listPublishedAvisos } from "@/server/modules/avisos/service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { Church, HeartHandshake, Mic, HandHeart } from "lucide-react";

const POST_PREVIEW_LABEL: Record<string, string> = {
  audio: "Novo áudio disponível — toque para ouvir.",
  video: "Novo vídeo disponível — toque para assistir.",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function HomePage() {
  const session = await getSessionContext();
  const firstName = session?.fullName.split(" ")[0] ?? "";

  if (!session?.membership) {
    return (
      <EmptyState
        icon={Church}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const [nextCelebration, latestPost, latestAvisos] = await Promise.all([
    getNextCelebration(session.membership.parishId),
    getLatestPost(session.membership.parishId),
    listPublishedAvisos(session.membership.parishId, 1),
  ]);
  const latestAviso = latestAvisos[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl text-foreground">
          {greeting()}, {firstName}
        </h1>
      </div>

      <Link href="/comunidade">
        <Card>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-primary">
            <Mic className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Palavra do Padre
          </p>
          {latestPost ? (
            <p className="mt-1 line-clamp-3 text-sm text-muted">
              {latestPost.mediaType === "texto"
                ? latestPost.contentText
                : POST_PREVIEW_LABEL[latestPost.mediaType]}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Ainda não há publicações — em breve, aqui.</p>
          )}
        </Card>
      </Link>

      <Card>
        <p className="text-xs uppercase tracking-wide text-primary">Seu próximo compromisso</p>
        {nextCelebration ? (
          <p className="mt-1 text-sm text-muted">
            {nextCelebration.title || CELEBRATION_TYPE_LABELS[nextCelebration.type]} ·{" "}
            {formatDateTime(nextCelebration.startsAt)}
            {nextCelebration.location ? ` · ${nextCelebration.location}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Nenhum compromisso agendado ainda.</p>
        )}
      </Card>

      <LinkButton href="/servir" className="w-full gap-2 text-base">
        <HeartHandshake className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        Eu posso ajudar
      </LinkButton>

      <Card>
        <p className="text-xs uppercase tracking-wide text-primary">Avisos</p>
        {latestAviso ? (
          <>
            <p className="mt-1 text-sm font-medium text-foreground">{latestAviso.title}</p>
            <p className="mt-1 text-sm text-muted">{latestAviso.body}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Nenhum aviso por enquanto.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/comunidade">
          <Card className="flex flex-col items-center gap-1 text-center">
            <Church className="h-6 w-6 text-primary" strokeWidth={1.5} aria-hidden />
            <p className="mt-1 text-sm font-medium text-foreground">Minha Comunidade</p>
          </Card>
        </Link>
        <Link href="/caminhada">
          <Card className="flex flex-col items-center gap-1 text-center">
            <HandHeart className="h-6 w-6 text-primary" strokeWidth={1.5} aria-hidden />
            <p className="mt-1 text-sm font-medium text-foreground">Minha Caminhada</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
