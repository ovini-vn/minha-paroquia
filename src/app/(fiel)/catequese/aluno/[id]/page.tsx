import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, Sparkles, Church, Award } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  getEnrollmentProgress,
  getEnrollmentGroupId,
  getGroup,
} from "@/server/modules/catequese/service";
import { listMyChildrenEnrollments, listarSacramentosDoCatequizando } from "@/server/modules/catequese/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { Card } from "@/components/ui/Card";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";
import { ConcluirComSacramentoForm } from "../../_components/ConcluirComSacramentoForm";
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
  // Só a coordenação conclui, então só ela precisa da lista.
  const sacramentos = coordena ? await listarSacramentosDoCatequizando(parishId, id) : [];

  const { enrollment, encontros, presencaPorSessao, ritos, missas, resumo, caminhada } = progresso;
  const proximo = progresso.proximoRito;
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

      {/*
        A linha do tempo da caminhada.

        A ficha mostrava só o passado — presenças, missas, ritos recebidos. A
        família perguntava "onde estamos e quais os próximos passos", e a
        resposta não existia porque nada tinha sido previsto. Com o itinerário
        declarado pela paróquia, o próximo passo deixa de ser um campo a
        preencher e passa a ser uma conta.

        Vem ANTES dos números, de propósito: "3 de 6, agora o pão da vida" é o
        que a mãe quer saber; quantas missas o filho foi vem depois.
      */}
      {caminhada && caminhada.previstos > 0 && (
        <section className="pt-4">
          <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
            <Eyebrow className="mb-2">A caminhada</Eyebrow>
            <p className="text-[15px] font-medium text-foreground">
              Encontro {caminhada.concluidos} de {caminhada.previstos}
            </p>

            {/* A barra é aria-hidden e o texto acima diz o mesmo: quem usa
                leitor de tela não precisa ouvir "elemento gráfico". */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${Math.round((caminhada.concluidos / caminhada.previstos) * 100)}%`,
                }}
              />
            </div>

            {caminhada.proximo ? (
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                O próximo encontro é{" "}
                <span className="font-medium text-foreground">{caminhada.proximo.titulo}</span>.
              </p>
            ) : (
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                Todos os encontros previstos já foram dados.
              </p>
            )}

            {proximo && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[13.5px] leading-relaxed text-muted">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.6} aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{proximo.name}</span>
                  {proximo.scheduledAt ? ` em ${formatDateOnly(proximo.scheduledAt)}` : ""}.
                </span>
              </p>
            )}
          </Card>

          <Card className="mt-3 px-3.5 py-1.5">
            {caminhada.passos.map((passo, i) => (
              <div
                key={passo.temaId}
                className="flex items-start gap-3.5 border-b border-border py-3 last:border-b-0"
              >
                {/*
                  Três estados, três desenhos. O "agora" é o único cheio:
                  numa lista de dez linhas, a família precisa achar onde está
                  sem ler todas.
                */}
                <span
                  className={
                    passo.estado === "concluido"
                      ? "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary-tint text-[12px] font-semibold text-primary"
                      : passo.estado === "atual"
                        ? "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary text-[12px] font-semibold text-white dark:bg-primary-light"
                        : "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-border-strong text-[12px] font-semibold text-muted"
                  }
                >
                  {passo.estado === "concluido" ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={
                      passo.estado === "previsto"
                        ? "text-[14px] text-muted"
                        : "text-[14px] font-medium text-foreground"
                    }
                  >
                    {passo.titulo}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {passo.estado === "atual" && "É o próximo"}
                    {passo.estado === "previsto" && "Ainda vem"}
                    {passo.estado === "concluido" && passo.data && formatDateOnly(passo.data)}
                    {/* Presença desconhecida NÃO vira falta: a chamada pode
                        simplesmente não ter sido lançada. */}
                    {passo.estado === "concluido" && passo.presente === true && " · esteve"}
                    {passo.estado === "concluido" && passo.presente === false && " · faltou"}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

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
                      {encontro.tema?.titulo || encontro.topic || "Encontro"}
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
      {/*
        O fim da caminhada.

        Só para quem coordena: sacramento é registro do livro da paróquia, e
        quem responde por ele não é quem dá a aula.

        O registro pende do CATEQUIZANDO, e não de uma conta — a criança de
        sete anos não usa o aplicativo, e era isso que faltava para a
        catequese poder terminar dentro da ferramenta.
      */}
      {coordena && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Concluir a caminhada
          </Eyebrow>

          {sacramentos.length > 0 && (
            <Card className="mb-3 border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent px-3.5 py-1.5">
              {sacramentos.map((sac) => (
                <div
                  key={sac.id}
                  className="flex items-center gap-3.5 border-b border-border py-3 last:border-b-0"
                >
                  <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
                    <Award className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-foreground">
                      {SACRAMENT_TYPE_LABELS[sac.type]}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {formatDateOnly(sac.date)}
                      {sac.location ? ` · ${sac.location}` : ""}
                      {sac.note ? ` · ${sac.note}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}

          <Card>
            <p className="mb-3 text-[13px] leading-relaxed text-muted">
              Registre o sacramento recebido. Ele passa a constar na paróquia mesmo que a família
              não use o aplicativo, e é dele que sai o certificado.
            </p>
            <ConcluirComSacramentoForm enrollmentId={id} />
          </Card>
        </section>
      )}

    </div>
  );
}
