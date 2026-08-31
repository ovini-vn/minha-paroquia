import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { requireSessionForPage, podeAlcancar } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { obterPlanoPublicado } from "@/server/modules/plano/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { DuasColunas, Leitura } from "@/components/layout/DuasColunas";

export const metadata: Metadata = { title: "Plano pastoral" };

/** Um id estável para o link do índice, derivado do título da seção. */
function ancora(titulo: string, indice: number): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // O índice entra no fim porque duas seções podem ter o mesmo título, e
  // dois âncoras iguais fazem o índice levar sempre à primeira.
  return `${base || "secao"}-${indice + 1}`;
}

/**
 * A tela do "por quê".
 *
 * A agenda responde quando as coisas acontecem; nada respondia por que a
 * paróquia faz o que faz. As prioridades saem de uma Assembleia, os eixos
 * vêm da arquidiocese, e essas decisões governam o ano inteiro — mas viviam
 * num PDF que ninguém abre.
 *
 * É leitura corrida, e por isso a coluna principal tem largura de leitura e
 * o índice fica na lateral: num plano de vinte seções, rolar à procura de
 * "Eixo 4" é o que a pessoa mais faz.
 */
export default async function PlanoPage() {
  const session = await requireSessionForPage();
  if (!session.membership) return null;

  const plano = await obterPlanoPublicado(session.membership.parishId);
  const podeEscrever = podeAlcancar(session, PERMISSIONS.PLANO_MANAGE);

  if (!plano) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Plano pastoral"
          description="Por que a paróquia faz o que faz neste ano."
        />
        <EmptyState
          icon={Compass}
          title="O plano ainda não foi publicado"
          description={
            podeEscrever
              ? "Escreva o objetivo do ano, as prioridades da Assembleia e os eixos da arquidiocese — e publique quando estiver pronto."
              : "Quando a paróquia publicar o plano do ano, ele aparece aqui."
          }
          action={
            podeEscrever ? (
              <LinkButton href="/painel/plano" size="sm">
                Escrever o plano
              </LinkButton>
            ) : undefined
          }
        />
      </div>
    );
  }

  /*
   * O índice agrupado pela tarja.
   *
   * Repetir "ASSEMBLEIA PAROQUIAL 2026" em caixa alta antes de cada filho
   * fazia a tarja engolir o título de verdade — três linhas quase idênticas
   * onde deveria haver três nomes distintos. A tarja pertence ao GRUPO, e
   * aparece uma vez, como cabeçalho dele.
   */
  const indice: { rotulo: string | null; itens: { id: string; titulo: string }[] }[] = [];
  plano.secoes.forEach((secao, i) => {
    const item = { id: ancora(secao.titulo, i), titulo: secao.titulo };
    const ultimo = indice[indice.length - 1];
    if (ultimo && ultimo.rotulo === secao.rotulo) ultimo.itens.push(item);
    else indice.push({ rotulo: secao.rotulo, itens: [item] });
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title={plano.titulo}
        description={`Plano pastoral de ${plano.ano} · ${session.membership.parishName}`}
      />

      <DuasColunas
        lateralPrimeiroNoCelular
        principal={
          <Leitura className="flex flex-col gap-7">
            {plano.introducao && (
              <p className="text-[16.5px] leading-relaxed text-foreground">{plano.introducao}</p>
            )}

            {plano.secoes.map((secao, i) => (
              <section key={secao.id} id={ancora(secao.titulo, i)} className="scroll-mt-24">
                {secao.rotulo && <Eyebrow tone="accent" className="mb-1.5">{secao.rotulo}</Eyebrow>}
                <h2 className="font-serif text-[21px] font-semibold leading-tight text-foreground">
                  {secao.titulo}
                </h2>
                {/*
                  Parágrafo por linha em branco. O corpo é texto puro porque
                  quem escreve é a secretaria da paróquia — pedir marcação
                  seria pedir que ela aprendesse outra coisa antes de poder
                  registrar a decisão da Assembleia.
                */}
                <div className="mt-2.5 flex flex-col gap-3">
                  {secao.corpo
                    .split(/\n{2,}/)
                    .map((paragrafo) => paragrafo.trim())
                    .filter(Boolean)
                    .map((paragrafo, j) => (
                      <p key={j} className="text-[15.5px] leading-relaxed text-foreground">
                        {paragrafo}
                      </p>
                    ))}
                </div>
              </section>
            ))}
          </Leitura>
        }
        lateral={
          <Card>
            <Eyebrow className="mb-3">Neste plano</Eyebrow>
            <nav className="flex flex-col gap-2.5">
              {indice.map((grupo, g) => (
                <div key={grupo.rotulo ?? `solto-${g}`} className="flex flex-col gap-0.5">
                  {grupo.rotulo && <Eyebrow className="mb-0.5 px-2">{grupo.rotulo}</Eyebrow>}
                  {grupo.itens.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="rounded-md px-2 py-1.5 text-[13.5px] leading-snug text-muted transition-colors hover:bg-sunken hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {item.titulo}
                    </a>
                  ))}
                </div>
              ))}
            </nav>

            {podeEscrever && (
              <div className="mt-4 border-t border-border pt-3.5">
                <LinkButton href="/painel/plano" variant="ghost" size="sm">
                  Editar o plano
                </LinkButton>
              </div>
            )}
          </Card>
        }
      />
    </div>
  );
}
