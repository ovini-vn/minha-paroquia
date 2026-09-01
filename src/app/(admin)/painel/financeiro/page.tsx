import type { Metadata } from "next";
import { HandCoins, Sparkles } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  expirarPixAntigos,
  listarContribuicoes,
  listarFinalidades,
  listarPixAguardando,
} from "@/server/modules/contribuicao/service";
import { nomeDaFinalidade } from "@/server/modules/contribuicao/schema";
import { hojeEmBrasilia } from "@/lib/brasilia";
import { formatDateOnly } from "@/lib/date";
import {
  ConfirmarRecebimento,
  DesfazerContribuicao,
} from "./_components/ConfirmarRecebimento";
import { getDonationSettings, listPurposesForAdmin } from "@/server/modules/doacao/service";
import { copiarFinalidadesAction } from "@/server/actions/contribuicao-actions";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { iconeDeDoacao } from "@/lib/doacao";
import { CriarFinalidadeForm, EditarFinalidadeForm } from "./_components/FinalidadeForms";

export const metadata: Metadata = { title: "Financeiro" };

/** Como cada forma se lê na tela de quem confere. */
const FORMAS: Record<string, string> = {
  pix_identificado: "PIX identificado",
  pix_avulso: "PIX avulso",
  dinheiro: "Dinheiro",
  envelope: "Envelope",
  transferencia: "Transferência",
  outro: "Outro",
};

/**
 * Onde a paróquia define para onde as contribuições podem ir.
 *
 * Sem finalidade cadastrada, a tela do fiel não tem o que oferecer — e foi
 * exatamente por isso que ela pareceu não existir: o módulo estava pronto
 * por baixo e vazio por cima.
 *
 * A conciliação do extrato entra aqui na próxima fatia. Esta tela já diz
 * isso, para quem abre não ficar procurando o que ainda não há.
 */
export default async function FinanceiroPage() {
  const session = await requirePermissionForPage(PERMISSIONS.FINANCEIRO_VER);
  if (!session.membership) return null;
  const parishId = session.membership.parishId;

  await expirarPixAntigos(parishId);

  const [finalidades, settings, cardsDeDoacao, aguardando, contribuicoes] = await Promise.all([
    listarFinalidades(parishId, true),
    getDonationSettings(parishId),
    listPurposesForAdmin(parishId),
    listarPixAguardando(parishId),
    listarContribuicoes(parishId),
  ]);

  const hoje = hojeEmBrasilia();
  const emReais = (centavos: number) =>
    (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalRecebido = contribuicoes.reduce((soma, c) => soma + c.centavos, 0);

  const semChave = !settings?.pixKey;
  const podeCopiar = finalidades.length === 0 && cardsDeDoacao.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Financeiro"
          description="As finalidades para onde as contribuições podem ir, e a chave PIX que as recebe."
        />
        <LinkButton href="/contribuir" variant="ghost" size="sm">
          Ver como o fiel vê
        </LinkButton>
      </div>

      {semChave && (
        <Card className="border-error/40">
          <Eyebrow className="mb-1 !text-error">Falta a chave PIX</Eyebrow>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Sem a chave cadastrada em <strong className="text-foreground">Doação</strong>, ninguém
            consegue gerar um código de contribuição — a tela do fiel mostra um aviso no lugar.
          </p>
          <LinkButton href="/painel/doacao" size="sm" className="mt-3">
            Cadastrar a chave PIX
          </LinkButton>
        </Card>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow tone="accent">Finalidades</Eyebrow>
          <CriarFinalidadeForm />
        </div>

        <p className="mb-3 max-w-prose text-[13px] leading-relaxed text-muted">
          É o que o fiel escolhe antes de gerar o código. O identificador que vai dentro do PIX
          guarda essa escolha — é o que permite saber, quando o dinheiro cair, a que ele se refere.
        </p>

        {finalidades.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Nenhuma finalidade cadastrada"
            description="Sem finalidade, quem abre Minha participação não tem o que escolher. Comece pelo dízimo e pela doação; catequese, festa e campanhas entram quando fizerem sentido."
            action={
              podeCopiar ? (
                <form action={copiarFinalidadesAction}>
                  <Button type="submit" size="sm">
                    <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden />
                    Usar as {cardsDeDoacao.length} de &ldquo;Sua doação ajuda&rdquo;
                  </Button>
                </form>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {finalidades.map((f) => {
              const Icone = iconeDeDoacao(f.icone);
              return (
                <Card key={f.id} className={f.ativa ? undefined : "opacity-60"}>
                  <div className="flex items-start gap-3">
                    <Icone
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-serif text-[17px] font-semibold leading-tight text-foreground">
                          {f.nome}
                        </p>
                        {f.ehDizimo && <Badge tone="success">Dízimo</Badge>}
                        {!f.ativa && <Badge tone="muted">Não oferecida</Badge>}
                      </div>
                      {f.descricao && (
                        <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.descricao}</p>
                      )}
                      <EditarFinalidadeForm
                        finalidadeId={f.id}
                        nome={f.nome}
                        descricao={f.descricao}
                        ehDizimo={f.ehDizimo}
                        ativa={f.ativa}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Aguardando confirmação
        </Eyebrow>
        <p className="mb-3 max-w-prose text-[13px] leading-relaxed text-muted">
          Códigos que alguém gerou. Procure o identificador no extrato do banco e confirme o que
          caiu — a contribuição aparece no histórico de quem contribuiu.
        </p>

        {aguardando.length === 0 ? (
          <Card className="bg-sunken">
            <p className="text-[13px] leading-relaxed text-muted">
              Nenhum código esperando. Quando alguém gerar um PIX em Minha participação, ele aparece
              aqui.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {aguardando.map((pix) => (
              <Card key={pix.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-[17px] font-semibold leading-tight text-foreground">
                      {nomeDaFinalidade(pix.finalidade)}
                      {pix.centavos ? ` · ${emReais(pix.centavos)}` : " · valor a escolher"}
                    </p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {pix.user?.fullName ?? "Sem dono"} · gerado em {formatDateOnly(pix.createdAt)}
                    </p>
                    <p className="mt-1 font-mono text-[12.5px] text-muted">{pix.identificador}</p>
                  </div>
                  <ConfirmarRecebimento
                    pixId={pix.id}
                    identificador={pix.identificador}
                    precisaDeValor={pix.centavos === null}
                    hoje={hoje}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <Eyebrow tone="accent">Contribuições recebidas</Eyebrow>
          {contribuicoes.length > 0 && (
            <p className="font-mono text-[15px] font-semibold text-foreground">
              {emReais(totalRecebido)}
            </p>
          )}
        </div>

        {contribuicoes.length === 0 ? (
          <Card className="bg-sunken">
            <p className="text-[13px] leading-relaxed text-muted">
              Nada registrado ainda. O que entra por PIX aparece aqui depois de confirmado; o que
              entra em dinheiro ou envelope, depois de lançado.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {contribuicoes.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {nomeDaFinalidade(c.finalidade)}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {c.user?.fullName ?? "Sem nome"} · {formatDateOnly(c.recebidaEm)} ·{" "}
                    {FORMAS[c.forma]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-[15px] font-semibold text-foreground">
                    {emReais(c.centavos)}
                  </p>
                  <DesfazerContribuicao contribuicaoId={c.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <Eyebrow className="mb-2">O que ainda não está pronto</Eyebrow>
        <Card className="bg-sunken">
          <p className="text-[13px] leading-relaxed text-muted">
            A importação do extrato ainda não existe: por enquanto a confirmação é feita olhando o
            aplicativo do banco. Quando ela entrar, o que já está aqui não muda — ela só passa a
            achar sozinha o que hoje se acha com o olho.
          </p>
        </Card>
      </section>
    </div>
  );
}
