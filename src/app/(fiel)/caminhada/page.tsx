import type { Metadata } from "next";
import { HandHeart, Footprints, ScrollText } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import {
  listMyMassParticipations,
  listMySacraments,
  listMyConfessions,
} from "@/server/modules/caminhada/service";
import { registerConfessionAction } from "@/server/actions/caminhada-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle, PageHeader, Eyebrow } from "@/components/ui/Typography";
import { Path, PathItem } from "@/components/ui/Path";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { SACRAMENT_TYPE_LABELS, SACRAMENT_STATUS_LABELS } from "@/lib/caminhada-labels";
import { formatDateOnly } from "@/lib/date";
import { LidoAoAbrir } from "@/components/domain/LidoAoAbrir";
import { hojeEmBrasilia } from "@/lib/brasilia";

export const metadata: Metadata = { title: "Minha Caminhada" };

export default async function CaminhadaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HandHeart}
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

  const today = hojeEmBrasilia();

  return (
    <div className="flex flex-col">
      <LidoAoAbrir caminho="/caminhada" />
      <PageHeader
        title="Minha Caminhada"
        description="Uma memória pessoal da sua fé. Parte fica só com você — veja abaixo o que é de cada um."
      />

      <section>
        <SectionTitle
          eyebrow="Sacramentos"
          title="Os marcos do caminho"
          actionLabel="Adicionar"
          actionHref="/caminhada/sacramentos/novo"
        />
        {sacraments.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nenhum sacramento registrado"
            description="Batismo, Primeira Eucaristia, Crisma — registre os marcos da sua vida de fé."
          />
        ) : (
          <Card>
            <Path>
              {sacraments.map((s) => (
                <PathItem key={s.id} filled={s.status === "validated"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-semibold leading-tight text-foreground">
                        {SACRAMENT_TYPE_LABELS[s.type]}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {formatDateOnly(s.date)}
                        {s.location ? ` · ${s.location}` : ""}
                        {s.priestProfile ? ` · ${s.priestProfile.user.fullName}` : ""}
                      </p>
                    </div>
                    <Badge tone={s.status === "validated" ? "success" : "muted"}>
                      {SACRAMENT_STATUS_LABELS[s.status]}
                    </Badge>
                  </div>
                </PathItem>
              ))}
            </Path>
          </Card>
        )}
      </section>

      <section className="pt-7">
        <SectionTitle
          eyebrow="Missas"
          title="Participações e reflexões"
          actionLabel="Registrar"
          actionHref="/caminhada/missa/nova"
        />
        {participations.length === 0 ? (
          <EmptyState
            icon={Footprints}
            title="Nenhuma participação registrada"
            description="Registre uma missa e, se quiser, guarde o que ela deixou em você."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {participations.map((p) => (
              <Card key={p.id}>
                <Eyebrow>{formatDateOnly(p.participatedAt)}</Eyebrow>
                {p.reflectionText ? (
                  <p className="mt-2 whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-foreground">
                    {p.reflectionText}
                  </p>
                ) : (
                  <p className="mt-2 text-[13.5px] text-muted">Sem reflexão registrada.</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="pt-7">
        <SectionTitle eyebrow="Confissão" title="Registrar uma confissão" />
        <Card>
          <form action={registerConfessionAction} className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="date"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
              >
                Data
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={today}
                max={today}
                className={INPUT_CLASSES}
              />
            </div>
            <Button type="submit" variant="ghost">
              Registrar
            </Button>
          </form>
          {confessions.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <Eyebrow className="mb-2">Últimas confissões</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {confessions.map((c) => (
                  <Badge key={c.id} tone="muted">
                    {formatDateOnly(c.date)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Quem vê o quê, dito por extenso.
          A pessoa registra confissão e missa numa tela da paróquia, dentro
          do app da paróquia. É razoável supor que a paróquia esteja
          olhando — e a suposição errada, aqui, é a que faz alguém não
          registrar nada. Dizer só "é privado" não basta: privado de quem,
          e o que então NÃO é. */}
      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Quem vê o quê
        </Eyebrow>
        <Card className="border-gold/45 bg-gold/[0.07]">
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="text-[14px] font-semibold text-foreground">
                Missas e confissões: só você
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Nem o pároco, nem a secretaria, nem ninguém da paróquia vê quais missas você
                marcou ou quando você se confessou. Isto é seu, para o seu controle.
              </p>
            </div>

            <div className="border-t border-gold/25 pt-3.5">
              <p className="text-[14px] font-semibold text-foreground">
                O que você escreve nas reflexões não sai daqui
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                O texto é só seu. A paróquia enxerga apenas um número da comunidade inteira —
                quantas participações foram registradas no mês —, sem nome e sem uma palavra do
                que foi escrito.
              </p>
            </div>

            <div className="border-t border-gold/25 pt-3.5">
              <p className="text-[14px] font-semibold text-foreground">
                Sacramentos: a paróquia vê, e é para isso que servem
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Batismo, Primeira Eucaristia, Crisma e Casamento ficam visíveis para o pároco e a
                secretaria — junto com a sua data de nascimento, se você a preencheu. É assim que
                eles confirmam o registro e lembram do seu aniversário e das suas datas.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
