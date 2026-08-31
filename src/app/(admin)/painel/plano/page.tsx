import type { Metadata } from "next";
import { Compass, Eye, EyeOff } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listarPlanos } from "@/server/modules/plano/service";
import { definirPublicacaoAction, moverSecaoAction } from "@/server/actions/plano-actions";
import { hojeEmBrasilia } from "@/lib/brasilia";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import {
  ApagarPlanoForm,
  BotaoMover,
  CriarPlanoForm,
  CriarSecaoForm,
  EditarPlanoForm,
  EditarSecaoForm,
} from "./_components/PlanoForms";

export const metadata: Metadata = { title: "Plano pastoral" };

/**
 * Onde a paróquia escreve o plano do ano.
 *
 * Um plano por ano, e todos ficam: o de 2025 é o que ilumina o de 2026, e a
 * tela do fiel mostra sempre o mais recente que está publicado. Por isso a
 * exclusão pede o ano digitado e a página sugere o rascunho no lugar dela.
 */
export default async function PlanoAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.PLANO_MANAGE);
  if (!session.membership) return null;

  const planos = await listarPlanos(session.membership.parishId);
  const anoCorrente = Number(hojeEmBrasilia().slice(0, 4));
  const anosUsados = new Set(planos.map((p) => p.ano));
  // Sugere o próximo ano que ainda não tem plano, em vez de sempre o
  // corrente: quem já escreveu o de 2026 está começando o de 2027.
  let anoSugerido = anoCorrente;
  while (anosUsados.has(anoSugerido)) anoSugerido++;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Plano pastoral"
          description="O objetivo do ano, as prioridades da Assembleia e os eixos da arquidiocese — do jeito que a sua paróquia os escreveu."
        />
        <LinkButton href="/plano" variant="ghost" size="sm">
          Ver como o fiel vê
        </LinkButton>
      </div>

      <Card>
        <Eyebrow tone="accent" className="mb-3">
          Novo plano
        </Eyebrow>
        <CriarPlanoForm anoSugerido={anoSugerido} />
      </Card>

      {planos.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nenhum plano escrito"
          description="Crie o plano do ano acima e vá acrescentando as seções: o objetivo paroquial, as prioridades, os eixos. Ele só aparece para o fiel quando você publicar."
        />
      ) : (
        planos.map((plano) => (
          <Card key={plano.id} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-serif text-[21px] font-semibold leading-tight text-foreground">
                    {plano.titulo}
                  </h2>
                  <Badge tone={plano.publicado ? "success" : "muted"}>
                    {plano.publicado ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-muted">
                  {plano.ano} · {plano.secoes.length}{" "}
                  {plano.secoes.length === 1 ? "seção" : "seções"}
                </p>
                <EditarPlanoForm
                  planoId={plano.id}
                  ano={plano.ano}
                  titulo={plano.titulo}
                  introducao={plano.introducao}
                />
              </div>

              <form action={definirPublicacaoAction}>
                <input type="hidden" name="planoId" value={plano.id} />
                <input type="hidden" name="publicado" value={plano.publicado ? "nao" : "sim"} />
                <Button type="submit" variant="ghost" size="sm">
                  {plano.publicado ? (
                    <>
                      <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
                      Voltar a rascunho
                    </>
                  ) : (
                    <>
                      <Eye className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
                      Publicar
                    </>
                  )}
                </Button>
              </form>
            </div>

            <div className="flex flex-col gap-3">
              <Eyebrow>Seções, na ordem em que se lê</Eyebrow>

              {plano.secoes.length === 0 ? (
                <p className="text-[13.5px] leading-relaxed text-muted">
                  Ainda sem seções. Um plano sem seção nenhuma não pode ser publicado — o fiel veria
                  um título e mais nada.
                </p>
              ) : (
                plano.secoes.map((secao, i) => (
                  <div key={secao.id} className="rounded-lg border border-border p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col pt-0.5">
                        <BotaoMover
                          secaoId={secao.id}
                          direcao="cima"
                          desabilitado={i === 0}
                          acao={moverSecaoAction}
                        />
                        <BotaoMover
                          secaoId={secao.id}
                          direcao="baixo"
                          desabilitado={i === plano.secoes.length - 1}
                          acao={moverSecaoAction}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        {secao.rotulo && (
                          <Eyebrow tone="accent" className="mb-1">
                            {secao.rotulo}
                          </Eyebrow>
                        )}
                        <p className="font-serif text-[17px] font-semibold leading-tight text-foreground">
                          {secao.titulo}
                        </p>
                        {/*
                          Só as primeiras linhas: a lista existe para achar a
                          seção, e o texto inteiro de vinte seções faria uma
                          parede onde deveria haver um sumário.
                        */}
                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                          {secao.corpo}
                        </p>
                        <EditarSecaoForm
                          secaoId={secao.id}
                          rotulo={secao.rotulo}
                          titulo={secao.titulo}
                          corpo={secao.corpo}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <CriarSecaoForm planoId={plano.id} />
            </div>

            <ApagarPlanoForm planoId={plano.id} ano={plano.ano} />
          </Card>
        ))
      )}
    </div>
  );
}
