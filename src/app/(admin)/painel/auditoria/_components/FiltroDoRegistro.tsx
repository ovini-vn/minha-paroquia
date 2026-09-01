import Link from "next/link";
import { ROTULO_DA_ACAO, type Acao } from "@/server/modules/auditoria/service";

export const PERIODOS = [
  { id: "7", rotulo: "Últimos 7 dias" },
  { id: "30", rotulo: "Últimos 30 dias" },
  { id: "tudo", rotulo: "Desde o começo" },
] as const;

export type PeriodoDoRegistro = (typeof PERIODOS)[number]["id"];
export type FiltrosDoRegistro = { periodo: PeriodoDoRegistro; acao: string | null };

export function enderecoDoRegistro(filtros: FiltrosDoRegistro): string {
  const params = new URLSearchParams();
  if (filtros.periodo !== "30") params.set("periodo", filtros.periodo);
  if (filtros.acao) params.set("acao", filtros.acao);
  const p = params.toString();
  return p ? `/painel/auditoria?${p}` : "/painel/auditoria";
}

/**
 * Período e ação.
 *
 * Um registro de auditoria é a única lista do app que só CRESCE — nada é
 * editado nem apagado, de propósito. Sem recorte, a pergunta "quem mexeu no
 * acesso de alguém no mês passado" se responde rolando, e daqui a um ano não
 * se responde mais.
 *
 * O padrão é 30 dias: é a janela em que alguém pergunta "o que aconteceu
 * aqui?". Quem investiga um caso antigo troca para "desde o começo", e o
 * botão está à vista.
 *
 * As contagens vêm do registro INTEIRO, e não do período escolhido. Elas
 * respondem "isto já aconteceu alguma vez?", que é a pergunta que faz
 * alguém clicar — um zero por causa do recorte esconderia o que existe.
 */
export function FiltroDoRegistro({
  filtros,
  acoes,
}: {
  filtros: FiltrosDoRegistro;
  acoes: { acao: string; quantos: number }[];
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
            href={enderecoDoRegistro({ ...filtros, periodo: id })}
            aria-pressed={filtros.periodo === id}
            className={filtros.periodo === id ? aceso : apagado}
          >
            {rotulo}
          </Link>
        ))}
      </div>

      {acoes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={enderecoDoRegistro({ ...filtros, acao: null })}
            aria-pressed={filtros.acao === null}
            className={filtros.acao === null ? aceso : apagado}
          >
            Tudo
          </Link>
          {acoes.map(({ acao, quantos }) => {
            const marcada = filtros.acao === acao;
            return (
              <Link
                key={acao}
                href={enderecoDoRegistro({ ...filtros, acao: marcada ? null : acao })}
                aria-pressed={marcada}
                className={marcada ? aceso : apagado}
              >
                {ROTULO_DA_ACAO[acao as Acao] ?? acao}
                <span className={marcada ? "opacity-70" : ""}>{quantos}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
