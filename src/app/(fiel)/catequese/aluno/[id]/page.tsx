import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, Sparkles, Church } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  getEnrollmentProgress,
  getEnrollmentGroupId,
  getGroup,
} from "@/server/modules/catequese/service";
import { listMyChildrenEnrollments } from "@/server/modules/catequese/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateOnly, formatDateTime } from "@/lib/date";
import { MassAttendanceForm } from "../../_components/MassAttendanceForm";

/**
 * A ficha do catequizando: o que foi dado, quem esteve presente, os ritos.
 *
 * É a mesma página para a família e para o catequista — muda só o que cada
 * um pode FAZER nela. A família vê o acompanhamento; o catequista lança
 * presença na missa.
 */
export default async function AlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionForPage();
  if (!session.membership) return null;
  const { id } = await params;

  const parishId = session.membership.parishId;
  const pode = (code: string) =>
    session.isPlatformAdmin || session.permissions.includes(code as never);
  const coordena = pode(PERMISSIONS.CATEQUESE_MANAGE);
  const leciona = pode(PERMISSIONS.CATEQUESE_TEACH);

  // Autoriza ANTES de buscar a ficha, e a ordem não é estética: o payload do
  // React Server Components carrega o que foi lido durante o render — mesmo
  // terminando em notFound(), o dado já buscado viaja na resposta. Buscar
  // primeiro e barrar depois entregaria o nome do catequizando a quem não
  // pode vê-lo. Aqui só o id da turma é lido, que não identifica ninguém.
  const groupId = await getEnrollmentGroupId(parishId, id);
  if (!groupId) notFound();

  const meusFilhos = await listMyChildrenEnrollments(parishId, session.userId);
  const ehResponsavel = meusFilhos.some((m) => m.id === id);
  const ehCatequistaDaTurma = leciona
    ? Boolean(await getGroup(parishId, groupId, session.userId))
    : false;
  if (!coordena && !ehCatequistaDaTurma && !ehResponsavel) notFound();

  const progresso = await getEnrollmentProgress(parishId, id);
  if (!progresso) notFound();

  const podeLancar = coordena || ehCatequistaDaTurma;
  const celebracoes = podeLancar ? await listUpcomingCelebrations(parishId, 10) : [];

  const { enrollment, encontros, presencaPorSessao, ritos, missas, resumo } = progresso;
  const hoje = new Date();

  return (
    <div className="flex flex-col">
      <div className="pb-2">
        <Link href="/catequese" className="text-[13px] text-muted hover:text-foreground">
          ← Catequese
        </Link>
        <h1 className="mt-1 font-serif text-[29px] font-semibold leading-tight text-foreground">
          {enrollment.familyMember.fullName}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {enrollment.group.name} · {enrollment.group.year}
          {enrollment.group.catechist ? ` · ${enrollment.group.catechist.fullName}` : ""}
        </p>
      </div>

      <section className="pt-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Encontros"
            value={`${resumo.presencas}/${resumo.encontrosRealizados}`}
          />
          <Stat label="Missas" value={String(resumo.missas)} />
          <Stat label="Ritos" value={String(ritos.filter((r) => r.completedAt).length)} />
        </div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
          Os encontros contam só os que já aconteceram — os marcados para frente não entram no
          total.
        </p>
      </section>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Encontros
        </Eyebrow>
        {encontros.length === 0 ? (
          <p className="text-sm text-muted">Nenhum encontro lançado ainda.</p>
        ) : (
          <Card className="px-3.5 py-1.5">
            {encontros.map((encontro) => {
              const futuro = encontro.date > hoje;
              const presente = presencaPorSessao.get(encontro.id);
              return (
                <div
                  key={encontro.id}
                  className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">
                      {encontro.topic || "Encontro"}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">{formatDateOnly(encontro.date)}</p>
                  </div>
                  {futuro ? (
                    <Badge tone="muted">A realizar</Badge>
                  ) : presente === true ? (
                    <Badge tone="success">
                      <Check className="h-3 w-3" strokeWidth={2} aria-hidden /> Presente
                    </Badge>
                  ) : presente === false ? (
                    <Badge tone="error">
                      <X className="h-3 w-3" strokeWidth={2} aria-hidden /> Faltou
                    </Badge>
                  ) : (
                    <Badge tone="muted">Sem chamada</Badge>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Missas
        </Eyebrow>
        {podeLancar && (
          <Card className="mb-3">
            <MassAttendanceForm
              enrollmentId={id}
              celebracoes={celebracoes.map((c) => ({
                id: c.id,
                label: `${c.title || "Missa"} · ${formatDateTime(c.startsAt)}`,
              }))}
            />
          </Card>
        )}
        {missas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma presença em missa registrada ainda.</p>
        ) : (
          <Card className="px-3.5 py-1.5">
            {missas.map((missa) => (
              <div
                key={missa.id}
                className="flex items-center gap-3.5 border-b border-border py-3 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Church className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <p className="min-w-0 flex-1 text-[14.5px] text-foreground">
                  {formatDateOnly(missa.attendedOn)}
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Ritos
        </Eyebrow>
        {ritos.length === 0 ? (
          <p className="text-sm text-muted">Nenhum rito registrado ainda.</p>
        ) : (
          <Card className="px-3.5 py-1.5">
            {ritos.map((rito) => (
              <div
                key={rito.id}
                className="flex items-center gap-3.5 border-b border-border py-3 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
                  <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{rito.name}</p>
                  {rito.scheduledAt && (
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {formatDateOnly(rito.scheduledAt)}
                    </p>
                  )}
                </div>
                {rito.completedAt ? <Badge tone="success">Realizado</Badge> : <Badge>Previsto</Badge>}
              </div>
            ))}
          </Card>
        )}
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
