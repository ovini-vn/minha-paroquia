import { Sparkles, CalendarHeart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getUpcomingFeasts, daysUntil, relativeLabel } from "@/lib/liturgical-feasts";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * Próximas datas do calendário da Igreja. Solenidade ganha ícone dourado —
 * é a categoria mais alta e a que a comunidade precisa saber com
 * antecedência (costuma ter missa em horário próprio).
 */
export function FeastList({ from, limit = 4 }: { from: Date; limit?: number }) {
  const feasts = getUpcomingFeasts(from, limit);
  if (feasts.length === 0) return null;

  return (
    <Card className="px-3.5 py-1.5">
      {feasts.map((feast) => {
        const dias = daysUntil(feast, from);
        const relativo = relativeLabel(dias);
        const solene = feast.rank === "solenidade";

        return (
          <div
            key={`${feast.date.toISOString()}-${feast.name}`}
            className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
          >
            <span
              className={
                solene
                  ? "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold"
                  : "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary"
              }
            >
              {solene ? (
                <Sparkles className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              ) : (
                <CalendarHeart className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium leading-snug text-foreground">{feast.name}</p>
              {/* Sem `capitalize`: em português é "8 de setembro", não "8 De
                  Setembro" — o rótulo relativo já vem com maiúscula. */}
              <p className="mt-0.5 text-[12.5px] text-muted">
                {relativo ? `${relativo} · ` : ""}
                {DATE_FORMATTER.format(feast.date)}
              </p>
            </div>

            {feast.civilHoliday && (
              <Badge tone="muted">
                <span className="normal-case">Feriado</span>
              </Badge>
            )}
          </div>
        );
      })}
    </Card>
  );
}
