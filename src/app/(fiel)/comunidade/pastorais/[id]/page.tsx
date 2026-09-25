import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock, MapPin, Mic, Phone, UserRound, Users } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { podeAlcancar } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  listarInteressados,
  listarMembros,
  obterGrupo,
  papelNoGrupo,
  podeVerOCronograma,
  type EncontroVisto,
} from "@/server/modules/grupos/service";
import { listMyGroupInterests } from "@/server/modules/pastorais/service";
import {
  expressPastoralInterestAction,
  withdrawPastoralInterestAction,
} from "@/server/actions/pastoral-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { ProximoEncontro } from "@/components/grupos/ProximoEncontro";
import { hojeEmBrasilia } from "@/lib/brasilia";
import { jaPassou, ladrilho, mesDoCronograma, proximoEncontro, quando } from "@/lib/grupos/cronograma";
import { iconeDeEncontro } from "@/lib/grupos/icones";
import { cn } from "@/lib/cn";
import { EditarEncontroForm, NovoEncontroForm } from "./_components/FormulariosDoEncontro";
import {
  ApagarRecado,
  ChamadaForm,
  ConviteDoGrupo,
  RecadoForm,
  TarefasDoEncontro,
} from "./_components/VidaDoGrupo";
import {
  chamadaDoEncontro,
  listarRecados,
  quemEstaSeAfastando,
  tarefasDosEncontros,
} from "@/server/modules/grupos/vida-do-grupo";
import { formatDateTime } from "@/lib/date";
import { VouNaoPosso } from "@/components/domain/VouNaoPosso";
import {
  minhaRespostaAoEncontro,
  respostasDosEncontros,
  type Contagem,
} from "@/server/modules/compromissos/service";
import {
  AcoesDoInteressado,
  AcoesDoMembro,
  AdicionarMembroForm,
  ColarCronogramaForm,
  DadosDoGrupoForm,
} from "./_components/GestaoDoGrupo";

export const metadata: Metadata = { title: "Grupo" };

/**
 * A página de um grupo: o cronograma para quem participa, a gestão para a
 * coordenação.
 *
 * Quem está de fora vê o convite — o que o grupo é, quando e onde se reúne,
 * quem coordena — e o botão de pedir para entrar. O cronograma dos
 * encontros é de dentro: um grupo não é mural de paróquia.
 *
 * A gestão mora aqui, e não no painel, porque quem coordena um grupo de
 * adolescentes normalmente não tem painel nenhum — mesma escolha da turma
 * de catequese, que a catequista cuida na própria tela da turma.
 */
export default async function GrupoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chamada?: string }>;
}) {
  const { id } = await params;
  const { chamada: chamadaPedida } = await searchParams;
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Users}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar a vida da comunidade."
      />
    );
  }

  const parishId = session.membership.parishId;
  const [grupo, papel] = await Promise.all([
    obterGrupo(parishId, id),
    papelNoGrupo(parishId, id, session.userId),
  ]);
  if (!grupo) notFound();

  const podeGerir = podeAlcancar(session, PERMISSIONS.OPPORTUNITIES_MANAGE) || papel === "coordenador";
  // Grupo encerrado some para quem não cuida dele, como na lista.
  if (grupo.status === "inativa" && !podeGerir) notFound();

  const [membros, interessados, meusInteresses] = await Promise.all([
    podeGerir ? listarMembros(parishId, id) : Promise.resolve([]),
    podeGerir ? listarInteressados(parishId, id) : Promise.resolve([]),
    papel ? Promise.resolve([]) : listMyGroupInterests(parishId, session.userId),
  ]);
  const temInteresse = meusInteresses.some((i) => i.groupId === id && i.status !== "declinado");

  const verCronograma = podeVerOCronograma(papel, podeGerir);
  const hoje = hojeEmBrasilia();
  const proximo = verCronograma ? proximoEncontro(grupo.encontros, hoje) : null;
  const souDoGrupo = papel !== null;

  /*
   * A vida do grupo entre os encontros (ver modules/grupos/vida-do-grupo).
   * A chamada é dos encontros que já aconteceram — os oito mais recentes,
   * do mais novo para trás —, e abre no último, a menos que a coordenação
   * escolha outro.
   */
  const encontrosDaChamada = podeGerir
    ? grupo.encontros.filter((e) => e.data !== null && e.data <= hoje).slice(-8).reverse()
    : [];
  const encontroDaChamada = encontrosDaChamada.find((e) => e.id === chamadaPedida) ?? encontrosDaChamada[0] ?? null;
  const [recados, tarefasDoProximo, linhasDaChamada, afastando, minhaResposta, contagens] = await Promise.all([
    verCronograma ? listarRecados(parishId, id, 5) : Promise.resolve([]),
    proximo ? tarefasDosEncontros(parishId, [proximo.id]) : Promise.resolve([]),
    podeGerir && encontroDaChamada ? chamadaDoEncontro(parishId, id, encontroDaChamada.id) : Promise.resolve([]),
    podeGerir ? quemEstaSeAfastando(parishId, id) : Promise.resolve([]),
    proximo && souDoGrupo ? minhaRespostaAoEncontro(parishId, session.userId, proximo.id) : Promise.resolve(null),
    // A coordenação vê quantos vão a cada encontro que ainda vai acontecer.
    podeGerir
      ? respostasDosEncontros(
          parishId,
          grupo.encontros.filter((e) => e.data !== null && e.data >= hoje).map((e) => e.id),
        )
      : Promise.resolve(new Map<string, Contagem>()),
  ]);

  const passados = grupo.encontros.filter((e) => jaPassou(e, hoje));
  const adiante = grupo.encontros.filter((e) => !jaPassou(e, hoje));

  // Agrupado por mês, na ordem em que os meses aparecem.
  const porMes = new Map<string, EncontroVisto[]>();
  for (const e of adiante) {
    const mes = mesDoCronograma(e);
    porMes.set(mes, [...(porMes.get(mes) ?? []), e]);
  }

  const detalhes = [
    grupo.leaderName ? { icon: UserRound, text: grupo.leaderName } : null,
    grupo.meetsWhen ? { icon: Clock, text: grupo.meetsWhen } : null,
    grupo.meetsWhere ? { icon: MapPin, text: grupo.meetsWhere } : null,
  ].filter((d): d is { icon: typeof UserRound; text: string } => d !== null);

  const linha = (e: EncontroVisto, passou: boolean) => (
    <LinhaDoEncontro
      key={e.id}
      encontro={e}
      passou={passou}
      contagem={contagens.get(e.id)}
      edicao={podeGerir ? <EditarEncontroForm groupId={id} encontroId={e.id} valores={e} /> : null}
    />
  );

  return (
    <div className="flex flex-col">
      <Eyebrow tone="accent">Grupo</Eyebrow>
      <h1 className="mt-1 font-serif text-[29px] font-semibold leading-tight text-foreground">{grupo.name}</h1>
      {grupo.description && (
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-muted">{grupo.description}</p>
      )}
      {detalhes.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {detalhes.map((d) => (
            <p key={d.text} className="flex items-center gap-2 text-[13.5px] text-muted">
              <d.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              {d.text}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4">
        {papel ? (
          <Badge tone="success">
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {papel === "coordenador" ? "Você coordena este grupo" : "Você faz parte deste grupo"}
          </Badge>
        ) : temInteresse ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Interesse registrado — a coordenação vai procurar você
            </Badge>
            <form action={withdrawPastoralInterestAction}>
              <input type="hidden" name="groupId" value={id} />
              <Button type="submit" variant="ghost" size="sm">
                Retirar
              </Button>
            </form>
          </div>
        ) : (
          grupo.status === "ativa" && (
            <form action={expressPastoralInterestAction}>
              <input type="hidden" name="groupId" value={id} />
              <Button type="submit" size="sm">
                Quero participar
              </Button>
            </form>
          )
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-8">
        <div className="flex flex-col">
          {proximo && (
            <section className="pt-7">
              <ProximoEncontro
                encontro={proximo}
                hoje={hoje}
                meetsWhen={grupo.meetsWhen}
                meetsWhere={grupo.meetsWhere}
              />
              {souDoGrupo && (
                <div className="mt-3">
                  <VouNaoPosso alvo="encontro" alvoId={proximo.id} vaiAtual={minhaResposta} />
                </div>
              )}
              <TarefasDoEncontro
                groupId={id}
                encontroId={proximo.id}
                tarefas={tarefasDoProximo.map((t) => ({
                  id: t.id,
                  descricao: t.descricao,
                  responsavelId: t.responsavelId,
                  responsavel: t.responsavel?.fullName ?? null,
                }))}
                souDoGrupo={souDoGrupo}
                coordeno={podeGerir}
                membros={membros.map((m) => ({ userId: m.userId, fullName: m.fullName }))}
              />
            </section>
          )}

          {recados.length > 0 && (
            <section className="pt-8">
              <SectionTitle eyebrow="Recados" title="Da coordenação" />
              <Card className="px-3.5 py-1">
                <ul>
                  {recados.map((r) => (
                    <li key={r.id} className="border-b border-border py-3 last:border-b-0">
                      <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-foreground">{r.texto}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[12.5px] text-muted">
                          {r.autor.fullName} · {formatDateTime(r.createdAt)}
                        </p>
                        {podeGerir && <ApagarRecado groupId={id} recadoId={r.id} />}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <section className="pt-8">
            <SectionTitle eyebrow="Cronograma" title="Os encontros" />
            {!verCronograma ? (
              /* De fora, o convite. O que o grupo faz e quando se reúne já
                 está no alto da página; aqui fica o caminho para entrar. */
              <EmptyState
                icon={CalendarDays}
                title="Os encontros são de quem participa"
                description="Peça para entrar no grupo: assim que a coordenação acolher você, o cronograma aparece aqui, com o tema de cada encontro e quem prega."
              />
            ) : grupo.encontros.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="O cronograma ainda não foi publicado"
                description={
                  podeGerir
                    ? "Cole o cronograma do grupo em Coordenação, logo abaixo — de uma vez só."
                    : "Assim que a coordenação publicar, os encontros aparecem aqui."
                }
              />
            ) : (
              <div className="flex flex-col gap-5">
                {passados.length > 0 && (
                  <details className="group rounded-lg border border-border bg-surface">
                    <summary className="alvo-de-toque cursor-pointer list-none px-4 py-3 text-[13.5px] font-medium text-muted [&::-webkit-details-marker]:hidden">
                      {passados.length === 1
                        ? "1 encontro que já passou"
                        : `${passados.length} encontros que já passaram`}
                    </summary>
                    <ul className="border-t border-border px-3.5">{passados.map((e) => linha(e, true))}</ul>
                  </details>
                )}

                {[...porMes.entries()].map(([mes, encontros]) => (
                  <div key={mes}>
                    <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-eyebrow text-primary first-letter:uppercase">
                      {mes}
                    </p>
                    <Card className="px-3.5 py-0.5">
                      <ul>{encontros.map((e) => linha(e, false))}</ul>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {podeGerir && (
          <section id="coordenacao" className="scroll-mt-24 pt-8">
            <SectionTitle eyebrow="Coordenação" title="Cuidar do grupo" />
            {afastando.length > 0 && (
              <div className="mb-3 rounded-lg border border-warning/40 bg-warning-tint p-3.5 text-[13.5px] text-foreground">
                <p className="font-semibold">Faltaram aos últimos três encontros</p>
                <p className="mt-0.5 text-muted">Talvez valha uma palavra — ninguém some sem que alguém perceba.</p>
                <ul className="mt-1.5 list-disc pl-5">
                  {afastando.map((a) => (
                    <li key={a.userId}>{a.fullName}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Gaveta titulo="Recado para o grupo">
                <RecadoForm groupId={id} />
              </Gaveta>

              {encontroDaChamada && (
                <Gaveta titulo="Chamada" aberta={Boolean(chamadaPedida)}>
                  <ChamadaForm
                    groupId={id}
                    encontroId={encontroDaChamada.id}
                    encontros={encontrosDaChamada.map((e) => ({ id: e.id, rotulo: `${quando(e)} — ${e.tema}` }))}
                    linhas={linhasDaChamada.map((l) => ({ userId: l.userId, fullName: l.fullName, presente: l.presente }))}
                  />
                </Gaveta>
              )}

              <Gaveta titulo={`Quem participa (${membros.length})`} aberta={interessados.length > 0}>
                {interessados.length > 0 && (
                  <div className="mb-4 rounded-lg border border-gold/45 bg-gold/[0.06] p-3.5">
                    <p className="text-[13.5px] font-semibold text-foreground">
                      {interessados.length === 1
                        ? "1 pessoa quer participar"
                        : `${interessados.length} pessoas querem participar`}
                    </p>
                    <ul className="mt-2 flex flex-col">
                      {interessados.map((p) => (
                        <li key={p.userId} className="border-b border-gold/30 py-2.5 last:border-b-0">
                          <p className="text-[14.5px] font-medium text-foreground">{p.fullName}</p>
                          {p.phone && (
                            <a
                              href={`tel:${p.phone}`}
                              className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-primary underline-offset-2 hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                              {p.phone}
                            </a>
                          )}
                          <div className="mt-2">
                            <AcoesDoInteressado groupId={id} userId={p.userId} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {membros.length === 0 ? (
                  <p className="mb-4 text-[13.5px] text-muted">Ninguém no grupo ainda.</p>
                ) : (
                  <ul className="mb-4 flex flex-col">
                    {membros.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0"
                      >
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-medium text-foreground">{m.fullName}</span>
                          {m.papel === "coordenador" && (
                            <span className="text-[12.5px] font-semibold text-primary">Coordenação</span>
                          )}
                        </span>
                        <AcoesDoMembro
                          groupId={id}
                          membroId={m.id}
                          papel={m.papel}
                          ehVoce={m.userId === session.userId}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <AdicionarMembroForm groupId={id} />
                <ConviteDoGrupo groupId={id} />
              </Gaveta>

              <Gaveta titulo="Colar o cronograma" aberta={grupo.encontros.length === 0}>
                <ColarCronogramaForm groupId={id} />
              </Gaveta>

              <Gaveta titulo="Incluir um encontro">
                <NovoEncontroForm groupId={id} />
              </Gaveta>

              <Gaveta titulo="Dados do grupo">
                <DadosDoGrupoForm
                  groupId={id}
                  valores={{
                    name: grupo.name,
                    description: grupo.description,
                    leaderName: grupo.leaderName,
                    meetsWhen: grupo.meetsWhen,
                    meetsWhere: grupo.meetsWhere,
                  }}
                />
              </Gaveta>
            </div>
          </section>
        )}
      </div>

      <div className="rule-gold my-7" />
    </div>
  );
}

function Gaveta({ titulo, aberta, children }: { titulo: string; aberta?: boolean; children: React.ReactNode }) {
  return (
    <details open={aberta} className="group rounded-lg border border-border bg-surface">
      <summary className="alvo-de-toque flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[14.5px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {titulo}
        <span className="text-[13px] font-normal text-muted group-open:hidden">Abrir</span>
        <span className="hidden text-[13px] font-normal text-muted group-open:inline">Fechar</span>
      </summary>
      <div className="border-t border-border px-4 pb-4 pt-3.5">{children}</div>
    </details>
  );
}

/**
 * Uma linha do cronograma: o ladrilho da data, o tema, quem prega.
 *
 * O encontro em destaque tem o ladrilho cheio e o ícone, como no cartaz —
 * é o que faz o seminário saltar aos olhos numa lista de domingos iguais.
 */
function LinhaDoEncontro({
  encontro: e,
  passou,
  edicao,
  contagem,
}: {
  encontro: EncontroVisto;
  passou: boolean;
  edicao: React.ReactNode;
  /** Só para a coordenação: quantos disseram que vão, e quantos não podem. */
  contagem?: Contagem;
}) {
  const l = ladrilho(e);
  const Icone = e.destaque ? iconeDeEncontro(e.icone) : null;

  return (
    <li className={cn("flex gap-3.5 border-b border-border py-3.5 last:border-b-0", passou && "opacity-60")}>
      <span
        className={cn(
          "flex w-[58px] shrink-0 flex-col items-center justify-center rounded-lg px-1 py-2 text-center",
          e.destaque ? "bg-primary text-white dark:bg-primary-light" : "bg-primary-tint text-primary",
        )}
        aria-hidden
      >
        {l ? (
          <>
            <span className={cn("font-serif font-semibold leading-none", l.dia.length > 2 ? "text-[15px]" : "text-[22px]")}>
              {l.dia}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase leading-none tracking-eyebrow">{l.mes}</span>
            <span className="mt-1 text-[10.5px] leading-none opacity-80">{l.semana}</span>
          </>
        ) : (
          <span className="text-[11px] font-semibold uppercase leading-tight tracking-eyebrow">
            a<br />definir
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        {/* A data por extenso fica para o leitor de tela: o ladrilho é visual. */}
        <span className="sr-only">{quando(e)}. </span>
        {Icone && (
          <span className="mb-0.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-eyebrow text-primary">
            <Icone className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            {e.complemento ?? "Encontro especial"}
          </span>
        )}
        <p className="text-[15px] font-medium leading-snug text-foreground">{e.tema}</p>
        {!e.destaque && e.complemento && <p className="mt-0.5 text-[13px] text-muted">{e.complemento}</p>}
        {e.pregador && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            <Mic className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden />
            Prega: {e.pregador}
          </p>
        )}
        {contagem && (contagem.vao > 0 || contagem.naoPodem > 0) && (
          <p className="mt-1 text-[12.5px] font-medium text-success">
            {contagem.vao} {contagem.vao === 1 ? "vai" : "vão"}
            {contagem.naoPodem > 0 && (
              <span className="text-muted"> · {contagem.naoPodem} não {contagem.naoPodem === 1 ? "pode" : "podem"}</span>
            )}
          </p>
        )}
        {edicao}
      </div>
    </li>
  );
}
