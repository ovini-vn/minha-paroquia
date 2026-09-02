import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, UserRound } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getPriestProfile } from "@/server/modules/priests/service";
import { listAvailability } from "@/server/modules/availability/service";
import {
  apagarHorarioDoSacerdoteAction,
  criarHorarioDoSacerdoteAction,
  definirOQueAtendeSemContaAction,
} from "@/server/actions/sacerdote-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { FormularioDeHorario } from "@/components/domain/FormularioDeHorario";
import { WEEKDAY_LABELS, AVAILABILITY_TYPE_LABELS } from "@/lib/pastoral-care-labels";
import { nomeDoSacerdote } from "@/lib/sacerdote";

export const metadata: Metadata = { title: "Sacerdote" };

/**
 * A agenda de um sacerdote que não usa o aplicativo, mantida pela secretaria.
 *
 * Só existe para quem NÃO tem conta. Quem usa o app cuida da própria agenda
 * em "Minha disponibilidade", e duas mãos no mesmo calendário é como um
 * padre descobre que foi marcado num horário que ele tinha fechado.
 *
 * Tela própria, e não mais uma seção no painel: o painel já é longo, e a
 * agenda de alguém precisa de espaço para a lista de janelas caber sem
 * espremer. As caixas de "o que ele atende" vieram para cá pelo mesmo
 * motivo — é tudo a mesma pergunta, "como se fala com este padre".
 */
export default async function SacerdoteNoPainelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePermissionForPage(PERMISSIONS.INVITATIONS_CREATE);
  if (!session.membership) return null;

  const priest = await getPriestProfile(session.membership.parishId, id);
  if (!priest) notFound();

  const janelas = await listAvailability(session.membership.parishId, priest.id);

  /*
   * Sacerdote COM conta cai aqui só por endereço digitado à mão. A tela
   * explica em vez de dar 404: quem chegou queria mexer na agenda dele, e
   * precisa saber que o caminho é outro — não que a página não existe.
   */
  if (priest.userId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={nomeDoSacerdote(priest)} description={priest.title} />
        <EmptyState
          icon={UserRound}
          title="Este sacerdote usa o aplicativo"
          description="Ele cuida da própria agenda em “Minha disponibilidade”, e a secretaria não mexe nela. Para tirá-lo da lista, mude o papel dele em Membros e papéis."
          action={
            <LinkButton href="/painel/membros" size="sm">
              Ir para Membros e papéis
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={nomeDoSacerdote(priest)}
        description={`${priest.title} · não usa o aplicativo, então a agenda dele é mantida aqui.`}
      />

      <Card>
        <Eyebrow tone="accent" className="mb-2">
          O que ele atende
        </Eyebrow>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          O que estiver desmarcado não aparece como motivo para o fiel escolher. Com as duas
          desmarcadas, a lista diz que o atendimento é combinado pela secretaria — em vez de
          &ldquo;Sem horários&rdquo;, que faz parecer que faltou agenda.
        </p>
        <form action={definirOQueAtendeSemContaAction} className="flex flex-col gap-2.5">
          <input type="hidden" name="id" value={priest.id} />
          <label className="flex items-center gap-2.5 text-[14px] text-foreground">
            <input
              type="checkbox"
              name="ofereceAtendimento"
              value="sim"
              defaultChecked={priest.ofereceAtendimento}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            Conversa, direção espiritual e questões de família
          </label>
          <label className="flex items-center gap-2.5 text-[14px] text-foreground">
            <input
              type="checkbox"
              name="ofereceConfissao"
              value="sim"
              defaultChecked={priest.ofereceConfissao}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            Confissão
          </label>
          <Button type="submit" size="sm" className="mt-1 self-start">
            Salvar
          </Button>
        </form>
      </Card>

      <Card>
        <Eyebrow tone="accent" className="mb-2">
          Horários
        </Eyebrow>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Janelas que se repetem toda semana — &ldquo;todo sábado das 16h às 18h&rdquo;. O app
          divide cada janela em horários que o fiel pode pedir.
        </p>
        <FormularioDeHorario
          acao={criarHorarioDoSacerdoteAction}
          priestProfileId={priest.id}
          rotulo="Publicar horário"
        />
      </Card>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Janelas publicadas
        </Eyebrow>
        {janelas.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum horário publicado"
            description="Enquanto não houver janela, a lista de sacerdotes mostra que ele não tem horário aberto e manda o fiel falar com a secretaria."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {janelas.map((janela) => (
              <div
                key={janela.id}
                className="flex flex-wrap items-center gap-2 border-b border-border py-3 last:border-b-0"
              >
                <span className="text-[14px] font-medium text-foreground">
                  {WEEKDAY_LABELS[janela.weekday]}
                </span>
                <span className="text-[13px] text-muted">
                  {janela.startTime} às {janela.endTime}
                </span>
                <Badge tone="muted">{AVAILABILITY_TYPE_LABELS[janela.type]}</Badge>
                <span className="text-[12.5px] text-muted">
                  horários de {janela.slotMinutes} min
                </span>
                <form action={apagarHorarioDoSacerdoteAction} className="ml-auto">
                  <input type="hidden" name="id" value={janela.id} />
                  <input type="hidden" name="priestProfileId" value={priest.id} />
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
