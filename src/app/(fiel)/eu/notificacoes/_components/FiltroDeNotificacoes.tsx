import Link from "next/link";

export const PERIODOS = [
  { id: "7", rotulo: "Últimos 7 dias", dias: 7 },
  { id: "30", rotulo: "Últimos 30 dias", dias: 30 },
  { id: "tudo", rotulo: "Desde o começo", dias: null },
] as const;

export type PeriodoDeNotificacoes = (typeof PERIODOS)[number]["id"];
export type FiltrosDeNotificacoes = { periodo: PeriodoDeNotificacoes; apenasNaoLidas: boolean };

export function enderecoDasNotificacoes(filtros: FiltrosDeNotificacoes): string {
  const params = new URLSearchParams();
  if (filtros.periodo !== "7") params.set("periodo", filtros.periodo);
  if (filtros.apenasNaoLidas) params.set("ver", "nao-lidas");
  const p = params.toString();
  return p ? `/eu/notificacoes?${p}` : "/eu/notificacoes";
}

export function diasDoPeriodo(periodo: PeriodoDeNotificacoes): number | null {
  return PERIODOS.find((p) => p.id === periodo)?.dias ?? null;
}

/**
 * Período e não lidas.
 *
 * Esta é a única lista do app que cresce sozinha: ninguém a alimenta de
 * propósito, ela enche porque a paróquia vive. Por isso o recorte aqui é
 * uma janela de TEMPO — "o que aconteceu desde que eu olhei" —, e não uma
 * situação ou um assunto.
 *
 * O padrão é 7 dias porque é o ciclo da paróquia: a semana entre uma missa
 * de domingo e a próxima. Quem sumiu por mais tempo troca o recorte, e o
 * botão está à vista.
 *
 * NÃO HÁ FILTRO POR CATEGORIA, e a razão é medida: das 460 notificações do
 * banco de desenvolvimento, 442 são "pastoral" — 96% num balde só. Uma
 * tarja que separa 96% de 4% não separa nada, só ocupa a linha e faz
 * prometer um corte que não existe. Se um dia as categorias distribuírem,
 * o eixo entra; enquanto forem uma só, a honestidade é não oferecer.
 *
 * As contagens são DA JANELA, e não da conta inteira: as duas tarjas
 * dividem exatamente o que está na tela, e somam o que se vê. Diferente do
 * histórico de acessos, onde a contagem responde "isto já aconteceu alguma
 * vez?", aqui ela responde "quanto falta eu ver disto aqui?".
 */
export function FiltroDeNotificacoes({
  filtros,
  todas,
  naoLidas,
}: {
  filtros: FiltrosDeNotificacoes;
  todas: number;
  naoLidas: number;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const aceso = `${base} border-primary bg-primary-tint font-semibold text-primary`;
  const apagado = `${base} border-border text-muted hover:border-primary hover:text-foreground`;

  return (
    <div className="mb-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map(({ id, rotulo }) => (
          <Link
            key={id}
            href={enderecoDasNotificacoes({ ...filtros, periodo: id })}
            aria-pressed={filtros.periodo === id}
            className={filtros.periodo === id ? aceso : apagado}
          >
            {rotulo}
          </Link>
        ))}
      </div>

      {/* A tarja de não lidas some quando não há nenhuma: um botão que leva
          a uma tela vazia não é um recorte, é um caminho para o nada. */}
      {naoLidas > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={enderecoDasNotificacoes({ ...filtros, apenasNaoLidas: false })}
            aria-pressed={!filtros.apenasNaoLidas}
            className={!filtros.apenasNaoLidas ? aceso : apagado}
          >
            Todas
            <span className={!filtros.apenasNaoLidas ? "opacity-70" : ""}>{todas}</span>
          </Link>
          <Link
            href={enderecoDasNotificacoes({ ...filtros, apenasNaoLidas: true })}
            aria-pressed={filtros.apenasNaoLidas}
            className={filtros.apenasNaoLidas ? aceso : apagado}
          >
            Não lidas
            <span className={filtros.apenasNaoLidas ? "opacity-70" : ""}>{naoLidas}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
