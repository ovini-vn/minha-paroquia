import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, FileCheck2, MessagesSquare, Phone } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import {
  NOME_DA_PREPARACAO,
  preparacaoDe,
  sacramentoDoCaminho,
} from "@/server/modules/preparacao/service";
import { ListaDeDocumentos } from "@/components/domain/ListaDeDocumentos";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";

export async function generateMetadata({ params }: { params: Promise<{ sacramento: string }> }): Promise<Metadata> {
  const tipo = sacramentoDoCaminho((await params).sacramento);
  return { title: tipo ? `Preparar o ${NOME_DA_PREPARACAO[tipo].toLowerCase()}` : "Preparação" };
}

/**
 * Como marcar um batismo ou um casamento nesta paróquia: o que fazer, o
 * que levar, quando são os encontros — e a lista de documentos que a
 * família vai marcando no celular.
 */
export default async function PreparacaoPage({ params }: { params: Promise<{ sacramento: string }> }) {
  const session = await requireSessionForPage();
  const tipo = sacramentoDoCaminho((await params).sacramento);
  if (!tipo) notFound();
  const nome = NOME_DA_PREPARACAO[tipo];

  const preparacao = session.membership ? await preparacaoDe(session.membership.parishId, tipo) : null;
  const titulo = tipo === "batismo" ? "Preparar um batismo" : "Preparar um casamento";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={titulo}
        description={
          tipo === "batismo"
            ? "O que a paróquia pede para batizar uma criança, e os encontros de pais e padrinhos."
            : "O que a paróquia pede aos noivos, e os encontros de preparação."
        }
      />

      {!preparacao ? (
        <EmptyState
          icon={FileCheck2}
          title="A paróquia ainda não escreveu esta orientação"
          description={`Fale com a secretaria: ela explica o que é preciso para o ${nome.toLowerCase()}.`}
          action={
            <Link href="/contato" className="font-semibold text-primary underline">
              Contato da secretaria
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="p-4">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{preparacao.orientacao}</p>
          </Card>

          {preparacao.documentos.length > 0 && (
            <section>
              <Eyebrow tone="accent" className="mb-2">
                Documentos
              </Eyebrow>
              <Card className="p-4">
                <ListaDeDocumentos chave={`${session.membership!.parishId}:${tipo}`} documentos={preparacao.documentos} />
                <p className="mt-3 text-[12.5px] text-muted">As marcações ficam só no seu celular.</p>
              </Card>
            </section>
          )}

          {preparacao.encontros && (
            <section>
              <Eyebrow tone="accent" className="mb-2">
                Encontros de preparação
              </Eyebrow>
              <Card className="flex items-start gap-3 p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
                <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-foreground">{preparacao.encontros}</p>
              </Card>
            </section>
          )}

          <section>
            <Eyebrow tone="accent" className="mb-2">
              Próximo passo
            </Eyebrow>
            <Card className="px-3.5 py-1.5">
              <RowLink
                href="/comunidade/sacerdotes"
                icon={MessagesSquare}
                title="Conversar com um sacerdote"
                subtitle="Marque um horário pelo app"
              />
              <RowLink href="/contato" icon={Phone} title="Falar com a secretaria" subtitle="Telefone, endereço e expediente" />
            </Card>
          </section>
        </div>
      )}
      <div className="rule-gold my-7" />
    </div>
  );
}
