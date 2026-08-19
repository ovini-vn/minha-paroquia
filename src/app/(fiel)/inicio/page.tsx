import Link from "next/link";
import { getSessionContext } from "@/server/auth/session";
import { getNextCelebration } from "@/server/modules/celebrations/service";
import { getLatestPost } from "@/server/modules/posts/service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";

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
        icon="⛪"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const [nextCelebration, latestPost] = await Promise.all([
    getNextCelebration(session.membership.parishId),
    getLatestPost(session.membership.parishId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">
          {greeting()}, {firstName}
        </h1>
      </div>

      <Link href="/comunidade">
        <Card>
          <p className="text-xs uppercase tracking-wide text-terracotta-600">🎙️ Palavra do Padre</p>
          {latestPost ? (
            <p className="mt-1 line-clamp-3 text-sm text-ink-700">
              {latestPost.mediaType === "texto"
                ? latestPost.contentText
                : POST_PREVIEW_LABEL[latestPost.mediaType]}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-700">Ainda não há publicações — em breve, aqui.</p>
          )}
        </Card>
      </Link>

      <Card>
        <p className="text-xs uppercase tracking-wide text-terracotta-600">Seu próximo compromisso</p>
        {nextCelebration ? (
          <p className="mt-1 text-sm text-ink-700">
            {nextCelebration.title || CELEBRATION_TYPE_LABELS[nextCelebration.type]} ·{" "}
            {formatDateTime(nextCelebration.startsAt)}
            {nextCelebration.location ? ` · ${nextCelebration.location}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-700">Nenhum compromisso agendado ainda.</p>
        )}
      </Card>

      <LinkButton href="/servir" className="w-full text-base">
        ❤️ EU POSSO AJUDAR
      </LinkButton>

      <Card>
        <p className="text-xs uppercase tracking-wide text-terracotta-600">Avisos</p>
        <p className="mt-1 text-sm text-ink-700">Nenhum aviso por enquanto.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/comunidade">
          <Card className="text-center">
            <span className="text-2xl" aria-hidden>
              ⛪
            </span>
            <p className="mt-1 text-sm font-medium text-ink-900">Minha Comunidade</p>
          </Card>
        </Link>
        <Link href="/caminhada">
          <Card className="text-center">
            <span className="text-2xl" aria-hidden>
              🙏
            </span>
            <p className="mt-1 text-sm font-medium text-ink-900">Minha Caminhada</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
