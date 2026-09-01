import type { Metadata } from "next";
import { HandHeart } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import {
  expirarPixAntigos,
  listarFinalidades,
  listarMinhasContribuicoes,
  listarPixEmAberto,
} from "@/server/modules/contribuicao/service";
import { nomeDaFinalidade } from "@/server/modules/contribuicao/schema";
import { getDonationSettings } from "@/server/modules/doacao/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { DuasColunas } from "@/components/layout/DuasColunas";
import { formatDateOnly } from "@/lib/date";
import { iconeDeDoacao } from "@/lib/doacao";
import { EscolherFinalidade } from "./_components/EscolherFinalidade";

export const metadata: Metadata = { title: "Contribuir" };

/** "R$ 150,00" a partir de centavos inteiros. */
export function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Minha participação: onde o fiel escolhe a finalidade e gera o próprio Pix.
 *
 * Não é uma tela de pagamento, e a linguagem cuida disso: ninguém deve nada,
 * ninguém cobra nada. O valor é opcional porque o dízimo é assim — cada um
 * dá o quanto pode, e um campo obrigatório transformaria isso noutra coisa.
 *
 * O identificador que vai dentro do código é o que permite à paróquia saber
 * a que se refere o dinheiro quando ele cair. O fiel não precisa saber disso,
 * e por isso ele não aparece com nome técnico em lugar nenhum.
 */
export default async function ContribuirPage({
  searchParams,
}: {
  /** `?para=<finalidade>` — quem veio de uma iniciativa já chega com ela marcada. */
  searchParams: Promise<{ para?: string }>;
}) {
  const { para } = await searchParams;
  const session = await requireSessionForPage();
  if (!session.membership) return null;
  const parishId = session.membership.parishId;

  await expirarPixAntigos(parishId);

  const [finalidades, settings, emAberto, historico] = await Promise.all([
    listarFinalidades(parishId),
    getDonationSettings(parishId),
    listarPixEmAberto(parishId, session.userId),
    listarMinhasContribuicoes(parishId, session.userId),
  ]);

  const semChave = !settings?.pixKey;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Minha participação"
        description="Acompanhe suas contribuições para a vida da comunidade."
      />

      <DuasColunas
        principal={
          <div className="flex flex-col gap-7">
            <section>
              <Eyebrow tone="accent" className="mb-3">
                Contribuir
              </Eyebrow>

              {semChave ? (
                <EmptyState
                  icon={HandHeart}
                  title="A paróquia ainda não abriu as contribuições pelo app"
                  description="Assim que a secretaria cadastrar a chave PIX, você poderá gerar aqui o seu código de contribuição."
                />
              ) : finalidades.length === 0 ? (
                <EmptyState
                  icon={HandHeart}
                  title="Ainda não há finalidades cadastradas"
                  description="A paróquia define para onde as contribuições podem ir — dízimo, doação, coleta, catequese. Assim que ela cadastrar, elas aparecem aqui."
                />
              ) : (
                <EscolherFinalidade
                  finalidadeInicial={para ?? null}
                  finalidades={finalidades.map((f) => ({
                    id: f.id,
                    nome: f.nome,
                    descricao: f.descricao,
                    icone: f.icone,
                  }))}
                />
              )}
            </section>

            {historico.length > 0 && (
              <section>
                <Eyebrow tone="accent" className="mb-3">
                  Minhas contribuições
                </Eyebrow>
                <div className="flex flex-col gap-2">
                  {historico.map((c) => (
                    <Card key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-medium text-foreground">
                          {nomeDaFinalidade(c.finalidade)}
                        </p>
                        <p className="text-[12.5px] text-muted">{formatDateOnly(c.recebidaEm)}</p>
                      </div>
                      <p className="shrink-0 font-mono text-[15px] font-semibold text-foreground">
                        {emReais(c.centavos)}
                      </p>
                    </Card>
                  ))}
                </div>
                {/*
                  Nada de txid, identificador ou "conciliado" aqui. Para quem
                  contribuiu, a pergunta é se a paróquia recebeu — e uma
                  contribuição só aparece nesta lista depois que recebeu.
                */}
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                  A lista mostra o que a paróquia já registrou como recebido. Contribuições em
                  dinheiro ou envelope aparecem quando a secretaria as lança.
                </p>
              </section>
            )}
          </div>
        }
        lateral={
          <div className="flex flex-col gap-4">
            {emAberto.length > 0 && (
              <Card>
                <Eyebrow className="mb-3">Códigos que você gerou</Eyebrow>
                <div className="flex flex-col gap-2">
                  {emAberto.map((pix) => (
                    <LinkButton
                      key={pix.id}
                      href={`/contribuir/${pix.id}`}
                      variant="ghost"
                      size="sm"
                      className="!justify-start"
                    >
                      {nomeDaFinalidade(pix.finalidade)}
                      {pix.centavos ? ` · ${emReais(pix.centavos)}` : ""}
                    </LinkButton>
                  ))}
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">
                  Um código gerado não compromete você a nada. Se não usar, ele simplesmente deixa
                  de aparecer aqui.
                </p>
              </Card>
            )}

            <Card>
              <Eyebrow className="mb-2">Como funciona</Eyebrow>
              <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-muted">
                <li>Escolha a finalidade e, se quiser, um valor.</li>
                <li>Copie o código e cole no aplicativo do seu banco.</li>
                <li>
                  Não precisa enviar comprovante: a contribuição aparece aqui quando a paróquia a
                  registrar.
                </li>
              </ol>
            </Card>

            {(() => {
              const Icone = iconeDeDoacao("igreja");
              return (
                <Card className="flex items-start gap-3">
                  <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
                  <p className="text-[13px] leading-relaxed text-muted">
                    O dinheiro vai direto para a conta da paróquia. O aplicativo não guarda valor
                    nenhum: ele só ajuda a saber de que finalidade foi cada contribuição.
                  </p>
                </Card>
              );
            })()}
          </div>
        }
      />
    </div>
  );
}
