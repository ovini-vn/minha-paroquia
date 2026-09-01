import Link from "next/link";
import type { CelebrationType } from "@prisma/client";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { CATEGORIAS, categoriaDaCelebracao } from "@/lib/agenda-categorias";

/**
 * Filtra por TIPO de celebração, e não pela família de cor da agenda.
 *
 * Na agenda, batizado, casamento e confissão andam juntos como
 * "Sacramentos": lá a pergunta é "como está o mês", e três cores para o que
 * o fiel lê como uma coisa só seria ruído. Aqui a pergunta é da gestão —
 * "onde está aquele batizado?" —, e agrupá-los esconderia justamente o que
 * se procura.
 *
 * A COR continua sendo a da família, e por isso os três sacramentos
 * compartilham uma. Não é engano: a cor diz de que família é, a palavra diz
 * qual dos três. Por isso eles ficam lado a lado, para a cor repetida se ler
 * como parentesco e não como erro.
 */
const ORDEM: CelebrationType[] = [
  "missa",
  "adoracao",
  "outro",
  "batizado",
  "casamento",
  "confissao",
];

export function FiltroDeCelebracoes({
  atual,
  presentes,
}: {
  atual: CelebrationType | null;
  /** Só os tipos que a paróquia de fato tem — filtrar por vazio é frustração. */
  presentes: CelebrationType[];
}) {
  if (presentes.length === 0) return null;

  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const apagado = "border-border text-muted hover:border-primary hover:text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/painel/missas"
        aria-pressed={atual === null}
        className={
          atual === null
            ? `${base} border-primary bg-primary-tint font-semibold text-primary`
            : `${base} ${apagado}`
        }
      >
        Todas
      </Link>

      {ORDEM.filter((t) => presentes.includes(t)).map((tipo) => {
        const marcado = atual === tipo;
        const cor = `rgb(var(--cat-${CATEGORIAS[categoriaDaCelebracao(tipo)].token}))`;
        return (
          <Link
            key={tipo}
            // Tocar no que já está marcado volta para todas.
            href={marcado ? "/painel/missas" : `/painel/missas?tipo=${tipo}`}
            aria-pressed={marcado}
            className={marcado ? `${base} font-semibold` : `${base} ${apagado}`}
            style={marcado ? { borderColor: cor, color: cor } : undefined}
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: cor }}
              aria-hidden
            />
            {CELEBRATION_TYPE_LABELS[tipo]}
          </Link>
        );
      })}
    </div>
  );
}
