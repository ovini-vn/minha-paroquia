import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { caminhoDoParagrafo, enderecoDoParagrafo } from "@/lib/catecismo/busca";
import { cn } from "@/lib/cn";

/**
 * Um parágrafo do Catecismo ligado a um encontro da catequese.
 *
 * O mesmo desenho na ficha do catequizando, na tela da turma e no
 * itinerário: número e o artigo em que ele está, o trecho em serifa (é
 * texto para ler, como a Palavra) e o link para o parágrafo inteiro no site
 * do Vaticano. O fio dourado à esquerda marca que é citação.
 *
 * `compacto` é para o itinerário da coordenação, onde o trecho serve só para
 * conferir que o número é o certo: três linhas bastam, e a lista de temas
 * não vira uma parede de texto.
 */
export function TrechoDoCatecismo({
  paragrafo,
  trecho,
  completo,
  compacto = false,
  acao,
  className,
}: {
  paragrafo: number;
  trecho: string;
  completo: boolean;
  compacto?: boolean;
  /** Um botão ao lado do link — o "Tirar" da coordenação. */
  acao?: ReactNode;
  className?: string;
}) {
  // O título MAIS ESPECÍFICO acima do parágrafo. Era o do artigo, e o § 543
  // aparecia como «Jesus Cristo foi concebido… nasceu da Virgem Maria» —
  // certo na estrutura do livro, mas não dizia nada; o subtítulo logo acima,
  // "O anúncio do reino de Deus", diz. "Resumindo" não é assunto, então sobe.
  const caminho = caminhoDoParagrafo(paragrafo);
  const assunto = [...caminho].reverse().find((t) => t.titulo !== "Resumindo");
  const endereco = enderecoDoParagrafo(paragrafo);

  return (
    <figure className={cn("border-l-2 border-gold/60 pl-3.5", className)}>
      <figcaption className="text-[13px] leading-snug text-muted">
        <span className="font-semibold text-primary">Catecismo, § {paragrafo}</span>
        {assunto && <> · {assunto.titulo}</>}
      </figcaption>
      <blockquote
        className={cn(
          "mt-1.5 whitespace-pre-line font-serif leading-relaxed text-foreground",
          compacto ? "line-clamp-3 text-[15px]" : "text-[15.5px]",
        )}
      >
        {trecho}
      </blockquote>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
        {endereco && (
          <a
            href={endereco}
            target="_blank"
            rel="noopener noreferrer"
            className="alvo-de-toque inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-primary"
          >
            {compacto ? "Abrir" : completo ? "Abrir no site do Vaticano" : "Continuar lendo no site do Vaticano"}
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          </a>
        )}
        {acao}
      </div>
    </figure>
  );
}
