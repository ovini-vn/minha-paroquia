import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { obterDadosDaCertidao } from "@/server/modules/caminhada/service";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";
import { formatDateOnly } from "@/lib/date";
import { BotaoImprimir } from "@/components/domain/BotaoImprimir";

export const metadata: Metadata = { title: "Certidão" };

/**
 * A certidão do sacramento recebido, feita para o papel.
 *
 * Certidão do ATO, e não de conclusão de curso: o que ela atesta é quem
 * recebeu, qual sacramento, quando, onde e em que livro está lançado.
 *
 * É uma tela que o navegador imprime, e não um PDF gerado no servidor. A
 * diferença importa na manutenção: gerar PDF exige uma biblioteca de layout
 * que ninguém revisa, e o resultado sai diferente do que se vê na tela. Aqui
 * o que está na tela é o que sai na folha.
 *
 * O app NÃO inventa dado de assento. Quando o livro/folha/número não foi
 * registrado, a certidão sai com a linha em branco para a secretaria
 * preencher à mão — uma certidão que afirma um assento inexistente é pior
 * que uma sem ele.
 */
export default async function CertidaoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermissionForPage(PERMISSIONS.SACRAMENTS_VALIDATE);
  if (!session.membership) return null;
  const { id } = await params;

  const dados = await obterDadosDaCertidao(session.membership.parishId, id);
  if (!dados || !dados.nome || !dados.paroquia) notFound();

  const { sacramento, nome, nascimento, paroquia, celebrante, paroco, livro } = dados;
  const cidade = [paroquia.city, paroquia.state].filter(Boolean).join(" · ");
  const hoje = new Date();

  return (
    <div className="certidao-pagina">
      {/* Fora da impressão: a volta e o botão. */}
      <div className="nao-imprime mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/painel/sacramentos"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Sacramentos
        </Link>
        <BotaoImprimir rotulo="Imprimir certidão" />
      </div>

      <article className="certidao">
        <header className="certidao-topo">
          <p className="certidao-paroquia">{paroquia.name}</p>
          {cidade && <p className="certidao-lugar">{cidade}</p>}
          {paroquia.address && <p className="certidao-lugar">{paroquia.address}</p>}
        </header>

        <h1 className="certidao-titulo">
          Certidão de {SACRAMENT_TYPE_LABELS[sacramento.type] ?? "Sacramento"}
        </h1>

        <p className="certidao-corpo">
          Certifico que, nos assentamentos desta paróquia, consta que{" "}
          <strong>{nome}</strong>
          {nascimento ? `, nascido(a) em ${formatDateOnly(nascimento)},` : ""} recebeu o sacramento
          de <strong>{SACRAMENT_TYPE_LABELS[sacramento.type] ?? "—"}</strong> no dia{" "}
          <strong>{formatDateOnly(sacramento.date)}</strong>
          {sacramento.location ? (
            <>
              , em <strong>{sacramento.location}</strong>
            </>
          ) : null}
          {celebrante ? (
            <>
              , tendo celebrado <strong>{celebrante}</strong>
            </>
          ) : null}
          .
        </p>

        <dl className="certidao-assento">
          <div>
            <dt>Registro</dt>
            {/* Sem livro registrado, a linha fica em branco para a
                secretaria completar do livro de papel. */}
            <dd>{livro ?? <span className="certidao-linha" aria-label="a preencher" />}</dd>
          </div>
        </dl>

        <p className="certidao-data">
          {cidade || paroquia.name}, {formatDateOnly(hoje)}.
        </p>

        <div className="certidao-assinatura">
          <span className="certidao-linha-assinatura" />
          <p className="certidao-assinante">{paroco ? paroco.nome : "Pároco"}</p>
          {paroco?.titulo && <p className="certidao-cargo">{paroco.titulo}</p>}
        </div>

        <p className="certidao-rodape">
          Documento emitido pelo sistema da paróquia. Só tem validade com assinatura e carimbo.
        </p>
      </article>
    </div>
  );
}
