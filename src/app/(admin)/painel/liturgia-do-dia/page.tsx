import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listUpcomingLiturgy } from "@/server/modules/liturgia/liturgy-of-the-day-service";
import { deleteLiturgyAction } from "@/server/actions/liturgy-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { PublishLiturgyForm } from "./PublishLiturgyForm";

const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const metadata: Metadata = { title: "Leituras do dia" };

export default async function PainelLiturgiaDoDiaPage() {
  const session = await requirePermissionForPage(PERMISSIONS.AVISOS_MANAGE);
  if (!session.membership) return null;

  const today = new Date();
  const upcoming = await listUpcomingLiturgy(session.membership.parishId, today);
  const defaultDate = today.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leituras do dia"
        description="Publique as referências das leituras e, se quiser, uma reflexão para a comunidade."
      />

      <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
        <Eyebrow className="text-[#8a6b24] dark:text-gold">Importante</Eyebrow>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Publique apenas a <span className="font-medium text-foreground">referência</span> das
          leituras (ex.: &ldquo;Mt 20, 1-16&rdquo;) e reflexões escritas por você. O texto bíblico
          das edições publicadas — Ave Maria, CNBB, Edição Pastoral, Jerusalém — é protegido por
          direito autoral e não deve ser copiado aqui.
        </p>
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Publicar</p>
        <PublishLiturgyForm defaultDate={defaultDate} />
      </Card>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Já publicadas
        </Eyebrow>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nada publicado de hoje em diante"
            description="Publique acima as leituras do dia — elas aparecem na aba Palavra para toda a comunidade."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {upcoming.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-start gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] capitalize text-muted">
                    {DAY_FORMATTER.format(entry.date)}
                  </p>
                  <p className="mt-0.5 text-[14.5px] font-medium text-foreground">
                    {entry.gospelReference}
                  </p>
                  {entry.gospelTitle && (
                    <p className="mt-0.5 text-[12.5px] text-muted">{entry.gospelTitle}</p>
                  )}
                  {entry.reflection && (
                    <Badge tone="gold">
                      <span className="normal-case">Com reflexão</span>
                    </Badge>
                  )}
                </div>
                <form action={deleteLiturgyAction}>
                  <input
                    type="hidden"
                    name="date"
                    value={entry.date.toISOString().slice(0, 10)}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    Remover
                  </Button>
                </form>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
