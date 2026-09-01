import type { Metadata } from "next";
import type { CategoriaDaAgenda } from "@prisma/client";
import { CalendarDays, Church, PartyPopper } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listCelebrationsInMonth } from "@/server/modules/celebrations/service";
import { listEventsInMonth } from "@/server/modules/events/service";
import { listPriests } from "@/server/modules/priests/service";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { CATEGORIAS, ORDEM_DA_LEGENDA, categoriaDaCelebracao } from "@/lib/agenda-categorias";
import { hojeEmBrasilia, diaEmBrasilia } from "@/lib/brasilia";
import { formatDateOnly, formatDateTime } from "@/lib/date";
import { AcoesRapidas } from "@/components/domain/AcoesRapidas";
import { CalendarioDoMes, type DiaDoCalendario } from "@/components/domain/CalendarioDoMes";
import { CreateCelebrationForm } from "@/app/(admin)/painel/CreateCelebrationForm";
import { CreateEventForm } from "@/app/(admin)/painel/CreateEventForm";
import { NavegacaoDoMes, nomeDoMes } from "./_components/NavegacaoDoMes";
import { FiltroDeCategorias } from "./_components/FiltroDeCategorias";
import { enderecoDaAgenda, type EstadoDaAgenda } from "./_components/endereco";

export const metadata: Metadata = { title: "Agenda" };

type ItemDaAgenda = {
  id: string;
  startsAt: Date;
  label: string;
  location: string | null;
  semHora: boolean;
  categoria: CategoriaDaAgenda;
};

/** "2026-09" -> {ano, mes}. Mês inválido cai no mês corrente, sem erro. */
function lerMes(bruto: string | undefined): { ano: number; mes: number } {
  const hoje = hojeEmBrasilia();
  const achado = /^(\d{4})-(\d{2})$/.exec(bruto ?? "");
  if (!achado) return { ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) };
  const ano = Number(achado[1]);
  const mes = Number(achado[2]);
  if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
    return { ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) };
  }
  return { ano, mes };
}

/**
 * A agenda da PARÓQUIA, mês a mês.
 *
 * Era uma fila dos próximos trinta compromissos. Com o calendário pastoral
 * do ano dentro do app são quatrocentos, e uma fila não responde à pergunta
 * que se faz a um calendário: "como está novembro?".
 *
 * Por isso o mês é a unidade, e ele olha para trás também — quem abre
 * setembro no dia 20 quer o mês, não os dez dias que sobraram.
 *
 * DUAS VISÕES da mesma coisa: a lista responde "o que vai acontecer", o
 * calendário responde "como está o mês". Ambas por endereço, para poderem
 * ser compartilhadas e para o botão de voltar funcionar.
 *
 * Atendimento pessoal continua fora daqui: é assunto de quem olha, e vive
 * em Eu → Meus atendimentos.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string; cats?: string }>;
}) {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar as missas, celebrações e eventos."
      />
    );
  }

  const { mes: mesBruto, vista: vistaBruta, cats: catsBrutas } = await searchParams;
  const { ano, mes } = lerMes(mesBruto);
  const vista = vistaBruta === "calendario" ? "calendario" : "lista";

  /*
   * Categoria desconhecida no endereço é IGNORADA, e não erro.
   *
   * O endereço da agenda é feito para ser compartilhado e guardado. Um
   * endereço antigo com uma categoria que deixou de existir deve mostrar a
   * agenda, e não uma tela de erro.
   */
  const escolhidas = (catsBrutas ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is CategoriaDaAgenda => c in CATEGORIAS);

  const parishId = session.membership.parishId;
  const podeLancar =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.AGENDA_MANAGE);

  const [celebracoes, eventos, priests] = await Promise.all([
    listCelebrationsInMonth(parishId, ano, mes),
    listEventsInMonth(parishId, ano, mes),
    podeLancar ? listPriests(parishId) : Promise.resolve([]),
  ]);

  const todos: ItemDaAgenda[] = [
    ...celebracoes.map((c) => ({
      id: `celebration-${c.id}`,
      startsAt: c.startsAt,
      label: c.title || CELEBRATION_TYPE_LABELS[c.type],
      location: c.location,
      semHora: c.semHora,
      categoria: categoriaDaCelebracao(c.type),
    })),
    ...eventos.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      label: e.title,
      location: e.location,
      semHora: e.semHora,
      categoria: e.categoria,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  /*
   * A legenda é calculada sobre o mês INTEIRO, e a lista sobre o filtrado.
   *
   * Se "presentes" saísse do filtrado, a categoria que a pessoa desligasse
   * sumiria da legenda — e não haveria como religá-la sem editar o endereço
   * à mão.
   */
  const presentes = ORDEM_DA_LEGENDA.filter((cat) => todos.some((i) => i.categoria === cat));
  const quantos = Object.fromEntries(
    presentes.map((cat) => [cat, todos.filter((i) => i.categoria === cat).length]),
  );
  const estado: EstadoDaAgenda = { ano, mes, vista, categorias: escolhidas };
  const itens =
    escolhidas.length === 0 ? todos : todos.filter((i) => escolhidas.includes(i.categoria));

  /*
   * Agrupado por DIA, em horário de Brasília.
   *
   * `diaEmBrasilia` e não `toISOString()`: depois das 21h o dia em UTC já é
   * o seguinte, e o compromisso da missa das 19h30 cairia no dia errado da
   * grade. É o erro que já apareceu três vezes neste projeto.
   */
  const porDia = new Map<string, ItemDaAgenda[]>();
  for (const item of itens) {
    const chave = item.semHora
      ? item.startsAt.toISOString().slice(0, 10)
      : diaEmBrasilia(item.startsAt);
    const lista = porDia.get(chave);
    if (lista) lista.push(item);
    else porDia.set(chave, [item]);
  }

  const diasDoCalendario: DiaDoCalendario[] = [...porDia.entries()].map(([chave, doDia]) => ({
    chave,
    dia: Number(chave.slice(8, 10)),
    categorias: [...new Set(doDia.map((i) => i.categoria))],
    quantos: doDia.length,
  }));

  const hoje = hojeEmBrasilia();

  return (
    <div className="flex flex-col">
      <PageHeader title="Agenda" description="Os compromissos da sua comunidade, mês a mês." />

      {podeLancar && (
        <AcoesRapidas
          acoes={[
            {
              id: "celebracao",
              label: "Celebração avulsa",
              icone: <Church className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
              conteudo: <CreateCelebrationForm priests={priests} />,
            },
            {
              id: "evento",
              label: "Evento",
              icone: <PartyPopper className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
              conteudo: (
                <CreateEventForm
                  podeEnviarArquivo={isUploadConfigured()}
                  motivoIndisponivel={diagnosticoDoUpload()}
                />
              ),
            },
          ]}
        />
      )}

      <div className="mt-2 flex flex-col gap-4">
        <NavegacaoDoMes estado={estado} />
        <FiltroDeCategorias estado={estado} presentes={presentes} quantos={quantos} />
      </div>

      {itens.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={CalendarDays}
            title={
              escolhidas.length > 0
                ? `Nada disso em ${nomeDoMes(mes)}`
                : `Nada marcado em ${nomeDoMes(mes)}`
            }
            description={
              escolhidas.length > 0
                ? "Há outros compromissos neste mês, de outros tipos."
                : "Use as setas acima para ver outro mês."
            }
            action={
              escolhidas.length > 0 ? (
                <LinkButton href={enderecoDaAgenda({ ...estado, categorias: [] })} size="sm">
                  Ver todas as categorias
                </LinkButton>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/*
            Largura travada: numa tela de 1280px a grade esticada daria
            células enormes com pontos minúsculos no meio — o oposto do que
            uma grade de mês serve para fazer. Trinta e seis rem é a largura
            em que o mês ainda se lê de um golpe.
          */}
          {vista === "calendario" && (
            <Card className="mt-5 max-w-[36rem]">
              <CalendarioDoMes ano={ano} mes={mes} dias={diasDoCalendario} />
              <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted">
                Toque num dia para ver o que está marcado nele.
              </p>
            </Card>
          )}

          <div className="mt-5 flex flex-col gap-5">
            {[...porDia.entries()].map(([chave, doDia]) => (
              <section key={chave} id={`dia-${chave}`} className="scroll-mt-24">
                <Eyebrow
                  tone={chave === hoje ? "accent" : "muted"}
                  className="mb-2"
                >
                  {formatDateOnly(new Date(`${chave}T12:00:00.000Z`))}
                  {chave === hoje ? " · hoje" : ""}
                </Eyebrow>

                <div className="flex flex-col gap-2">
                  {doDia.map((item) => (
                    <Card key={item.id} className="flex items-start gap-3 py-3">
                      {/*
                        A faixa de cor no lugar de um ícone: ela liga o item
                        à legenda e à grade sem ocupar largura, que no
                        celular é o que falta.
                      */}
                      <span
                        className="mt-0.5 h-[38px] w-[3px] shrink-0 rounded-full"
                        style={{
                          backgroundColor: `rgb(var(--cat-${CATEGORIAS[item.categoria].token}))`,
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-medium leading-snug text-foreground">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {item.semHora
                            ? CATEGORIAS[item.categoria].rotulo
                            : `${formatDateTime(item.startsAt).split(", ").pop()} · ${CATEGORIAS[item.categoria].rotulo}`}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
