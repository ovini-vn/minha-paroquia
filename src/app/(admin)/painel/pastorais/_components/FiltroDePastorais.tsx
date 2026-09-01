import Link from "next/link";

/**
 * As visões da lista de pastorais.
 *
 * UM EIXO só, e não dois combináveis como nos eventos e nas contribuições.
 * Ali a pergunta tem duas partes independentes — "quando" e "de que tipo".
 * Aqui ela é uma só, e muda de natureza a cada resposta: "quais existem",
 * "quais têm gente esperando", "quais estão pela metade". Cruzar isso daria
 * combinações que ninguém procura, como "inativas com interessados".
 *
 * Três das visões são LISTAS DE TRABALHO, e não recortes: quem está
 * esperando um telefonema, quem não tem coordenador, quem não tem horário.
 * É o que transforma esta tela de um arquivo numa lista de pendências.
 *
 * As duas faltas são SEPARADAS de propósito. Juntas num "faltando
 * informação" davam 14 de 15 na paróquia real — e um painel em que tudo é
 * pendência não prioriza nada. Separadas, viram 14 sem coordenador e 3 sem
 * horário: duas tarefas de tamanhos diferentes, e a segunda se resolve numa
 * tarde.
 */
export const VISOES = [
  { id: "ativas", rotulo: "Ativas" },
  { id: "interessados", rotulo: "Com interessados" },
  { id: "sem-coordenador", rotulo: "Sem coordenador" },
  { id: "sem-horario", rotulo: "Sem horário" },
  { id: "inativas", rotulo: "Inativas" },
  { id: "todas", rotulo: "Todas" },
] as const;

export type VisaoDePastorais = (typeof VISOES)[number]["id"];

export function FiltroDePastorais({
  atual,
  quantos,
}: {
  atual: VisaoDePastorais;
  quantos: Record<VisaoDePastorais, number>;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {VISOES.map(({ id, rotulo }) => {
        const marcada = atual === id;
        /*
         * Uma visão vazia continua clicável, e não some.
         *
         * "Faltando informação 0" é uma boa notícia — some dizer que não há
         * pendência. Esconder o botão faria a ausência de pendência parecer
         * ausência da funcionalidade.
         */
        return (
          <Link
            key={id}
            href={id === "ativas" ? "/painel/pastorais" : `/painel/pastorais?ver=${id}`}
            aria-pressed={marcada}
            className={
              marcada
                ? `${base} border-primary bg-primary-tint font-semibold text-primary`
                : `${base} border-border text-muted hover:border-primary hover:text-foreground`
            }
          >
            {rotulo}
            <span className={marcada ? "opacity-70" : ""}>{quantos[id]}</span>
          </Link>
        );
      })}
    </div>
  );
}
