import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { medidasDaAdesao, type Semana } from "@/server/modules/adesao/service";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Eyebrow } from "@/components/ui/Typography";

export const metadata: Metadata = { title: "Adesão da comunidade" };

const pct = (parte: number, todo: number) => (todo === 0 ? "—" : `${Math.round((parte / todo) * 100)}%`);
const DIA_MES = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

function tempoLegivel(horas: number | null): string {
  if (horas === null) return "—";
  if (horas < 1) return "menos de 1 h";
  if (horas < 48) return `${Math.round(horas)} h`;
  return `${Math.round(horas / 24)} dias`;
}

/**
 * O app está fazendo mais gente participar? Quatro respostas, com número.
 *
 * Contagens da comunidade, nunca de uma pessoa: a tela serve para a
 * paróquia ver se o caminho funciona, não para vigiar quem não foi.
 */
export default async function AdesaoPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;
  const m = await medidasDaAdesao(session.membership.parishId);

  return (
    <div className="flex flex-col gap-7">
      <section>
        <Eyebrow tone="accent" className="mb-2">
          Chegada
        </Eyebrow>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Fiéis no app" value={m.fieis} />
          <Stat label="Terminaram as boas-vindas" value={pct(m.concluiram, m.fieis)} />
          <Stat label="Chegaram nas últimas 8 semanas" value={m.cadastrosPorSemana.reduce((s, c) => s + c.valor, 0)} />
        </div>
        <Barras titulo="Cadastros por semana" semanas={m.cadastrosPorSemana} />
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-2">
          Quem se oferece é respondido?
        </Eyebrow>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ofereceram-se a uma pastoral" value={m.interesses.total} />
          <Stat label="Foram respondidos" value={pct(m.interesses.respondidos, m.interesses.total)} />
          <Stat label="Tempo típico de resposta" value={tempoLegivel(m.interesses.medianaEmHoras)} />
          <Stat label="Esperam há mais de 7 dias" value={m.interesses.esperandoHaMaisDeUmaSemana} />
        </div>
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-2">
          Presença nos encontros
        </Eyebrow>
        <Barras
          titulo="Presentes, pela chamada da coordenação"
          semanas={m.presencaPorSemana}
          rotulo={(s) => (s.de ? pct(s.valor, s.de) : "")}
          proporcao
        />
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-2">
          Compromisso
        </Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Fiéis com ao menos um compromisso" value={m.comCompromisso} />
          <Stat label="Da comunidade" value={pct(m.comCompromisso, m.fieis)} />
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Compromisso é participar de uma pastoral ou grupo, estar numa escala da liturgia nos próximos 30 dias ou ter
          assumido uma tarefa de encontro.
        </p>
      </section>
    </div>
  );
}

function Barras({
  titulo,
  semanas,
  rotulo,
  proporcao = false,
}: {
  titulo: string;
  semanas: Semana[];
  rotulo?: (s: Semana) => string;
  /** Barra pela proporção (presentes/marcados) em vez do número absoluto. */
  proporcao?: boolean;
}) {
  const altura = (s: Semana) => {
    if (proporcao) return s.de ? s.valor / s.de : 0;
    const maior = Math.max(1, ...semanas.map((x) => x.valor));
    return s.valor / maior;
  };
  const vazio = semanas.every((s) => (proporcao ? !s.de : s.valor === 0));

  return (
    <Card className="mt-3 p-4">
      <p className="mb-3 text-[13px] font-medium text-foreground">{titulo}</p>
      {vazio ? (
        <p className="text-[13px] text-muted">Nada registrado nas últimas 8 semanas.</p>
      ) : (
        <div className="grid grid-cols-8 items-end gap-1.5" role="list">
          {semanas.map((s) => (
            <div key={s.inicio.toISOString()} className="flex flex-col items-center gap-1" role="listitem">
              <span className="text-[11.5px] tabular-nums text-muted">{rotulo ? rotulo(s) : s.valor}</span>
              <div className="flex h-24 w-full items-end rounded-sm bg-sunken">
                <div
                  className="w-full rounded-sm bg-primary"
                  style={{ height: `${Math.round(altura(s) * 100)}%` }}
                  aria-hidden
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted">{DIA_MES.format(s.inicio)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
