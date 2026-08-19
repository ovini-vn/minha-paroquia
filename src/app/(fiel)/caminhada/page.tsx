import { getSessionContext } from "@/server/auth/session";
import {
  listMyMassParticipations,
  listMySacraments,
  listMyConfessions,
} from "@/server/modules/caminhada/service";
import { registerConfessionAction } from "@/server/actions/caminhada-actions";
import { Card } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SACRAMENT_TYPE_LABELS, SACRAMENT_STATUS_LABELS } from "@/lib/caminhada-labels";
import { formatDateOnly } from "@/lib/date";

export default async function CaminhadaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="🙏"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const parishId = session.membership.parishId;
  const [participations, sacraments, confessions] = await Promise.all([
    listMyMassParticipations(parishId, session.userId, 5),
    listMySacraments(parishId, session.userId),
    listMyConfessions(parishId, session.userId, 5),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">Minha Caminhada</h1>
        <p className="mt-1 text-sm text-muted">Uma memória pessoal da sua fé — só você vê o que escreve aqui.</p>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-primary">Missas</p>
          <LinkButton href="/caminhada/missa/nova" variant="secondary">
            Registrar participação
          </LinkButton>
        </div>
        {participations.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhuma participação registrada ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {participations.map((p) => (
              <Card key={p.id}>
                <p className="text-sm font-medium text-foreground">{formatDateOnly(p.participatedAt)}</p>
                {p.reflectionText ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{p.reflectionText}</p>
                ) : (
                  <p className="mt-1 text-sm text-muted">Sem reflexão registrada.</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-primary">Sacramentos</p>
          <LinkButton href="/caminhada/sacramentos/novo" variant="secondary">
            Adicionar
          </LinkButton>
        </div>
        {sacraments.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhum sacramento registrado ainda.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {sacraments.map((s) => (
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{SACRAMENT_TYPE_LABELS[s.type]}</p>
                  <p className="text-xs text-muted">
                    {formatDateOnly(s.date)}
                    {s.location ? ` · ${s.location}` : ""}
                    {s.priestProfile ? ` · ${s.priestProfile.user.fullName}` : ""}
                  </p>
                </div>
                <Badge>{SACRAMENT_STATUS_LABELS[s.status]}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-primary">Confissão</p>
        <Card>
          <form action={registerConfessionAction} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="text-sm font-medium text-muted">
                Data
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                max={new Date().toISOString().slice(0, 10)}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
              />
            </div>
            <Button type="submit" variant="secondary">
              Registrar confissão
            </Button>
          </form>
          {confessions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {confessions.map((c) => (
                <Badge key={c.id}>{formatDateOnly(c.date)}</Badge>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
