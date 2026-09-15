import type { Conta } from "@/lib/oracoes/roteiros";

/**
 * Um pedaço do terço, com a conta da vez acesa.
 *
 * A ideia veio de um terço de chaveiro impresso em 3D: contas com aro sobre
 * a corrente, a cruz na ponta. A mão não vê o terço inteiro — sente a conta
 * em que está. Aqui é igual: nunca o terço todo, só a parte em que a pessoa
 * está (o início, uma dezena, o final), com as contas já rezadas cheias e a
 * da vez brilhando.
 *
 * AS CORES SÃO AS DO TEMA DE QUEM REZA, e não as do chaveiro. A primeira
 * versão copiava o objeto — fundo preto, contas marfim e aro dourado — e
 * ficava igual para todo mundo, destoando do resto do app, do tema escuro e
 * da cor do Tempo Litúrgico escolhida em Aparência. Agora cada parte vem de
 * um token:
 *
 * - contas por rezar: fundo do cartão com aro na cor principal;
 * - contas rezadas: cheias da cor principal;
 * - a conta da vez: o dourado da marca, com halo — o único dourado do
 *   desenho, para ser achado de relance;
 * - a corrente: a cor de borda do tema.
 *
 * A cor principal é a do Tempo Litúrgico para quem escolheu, e fica mais
 * clara no tema escuro (ver globals.css) — tudo isso vem de graça por usar
 * os mesmos tokens do resto da interface.
 */

const RAIO: Record<Conta["tipo"], number> = {
  cruz: 0,
  grande: 10.5,
  pequena: 7.5,
  elo: 4.5,
  medalha: 13,
};

function classeDaConta(conta: Conta): string {
  if (conta.estado === "atual") return "fill-gold stroke-primary";
  if (conta.estado === "feita") return "fill-primary stroke-primary";
  return "fill-surface stroke-primary";
}

export function PedacoDoTerco({ contas, rotulo }: { contas: Conta[]; rotulo: string }) {
  const largura = 320;
  const altura = 86;
  const margem = 26;
  const n = contas.length;

  // As contas seguem um arco suave, como a corrente pendurada do chaveiro.
  const pontos = contas.map((_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = n === 1 ? largura / 2 : margem + t * (largura - margem * 2);
    const y = 56 - Math.sin(Math.PI * t) * 22;
    return { x, y };
  });

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="mx-auto h-auto w-full max-w-[420px]"
      role="img"
      aria-label={rotulo}
    >
      {n > 1 && (
        <polyline
          points={pontos.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          className="stroke-border-strong"
          strokeWidth={1.5}
        />
      )}

      {contas.map((conta, i) => {
        const { x, y } = pontos[i] ?? { x: largura / 2, y: 56 };
        const atual = conta.estado === "atual";
        const origem = { transformOrigin: `${x}px ${y}px` };

        if (conta.tipo === "cruz") {
          return (
            <g key={i} className={atual ? "conta-atual" : undefined} style={origem}>
              {atual && <circle cx={x} cy={y} r={22} className="fill-gold/25" />}
              <path
                d={`M${x - 3.5} ${y - 19} h7 v9 h8 v7 h-8 v19 h-7 v-19 h-8 v-7 h8 z`}
                className={atual ? "fill-gold stroke-primary" : "fill-primary stroke-primary"}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </g>
          );
        }

        if (conta.tipo === "elo") {
          const r = RAIO.elo;
          return (
            <g key={i} className={atual ? "conta-atual" : undefined} style={origem}>
              {atual && <circle cx={x} cy={y} r={12} className="fill-gold/30" />}
              <path
                d={`M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`}
                className={classeDaConta(conta)}
                strokeWidth={1.6}
              />
            </g>
          );
        }

        const r = RAIO[conta.tipo];
        const aroGrosso = conta.tipo === "grande" || conta.tipo === "medalha";
        return (
          <g key={i} className={atual ? "conta-atual" : undefined} style={origem}>
            {atual && <circle cx={x} cy={y} r={r + 8} className="fill-gold/30" />}
            <circle cx={x} cy={y} r={r} className={classeDaConta(conta)} strokeWidth={aroGrosso ? 3 : 2.4} />
            {conta.tipo === "medalha" && (
              <circle
                cx={x}
                cy={y}
                r={r - 5}
                fill="none"
                className={conta.estado === "futura" ? "stroke-primary" : "stroke-surface"}
                strokeWidth={1.4}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
