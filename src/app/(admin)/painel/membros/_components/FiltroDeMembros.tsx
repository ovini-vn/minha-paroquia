import Link from "next/link";
import { Search } from "lucide-react";
import { INPUT_CLASSES } from "@/components/ui/FormField";

export type FiltrosDeMembros = { papel: string | null; busca: string };

export function enderecoDosMembros(filtros: FiltrosDeMembros): string {
  const params = new URLSearchParams();
  if (filtros.papel) params.set("papel", filtros.papel);
  if (filtros.busca) params.set("q", filtros.busca);
  const p = params.toString();
  return p ? `/painel/membros?${p}` : "/painel/membros";
}

/**
 * Papel e nome.
 *
 * As tarjas de papel respondem à pergunta que outras telas MANDAM fazer
 * aqui: "quem é catequista?", "quem é sacerdote?". A catequese chega a
 * escrever isso em letras quando falta designar alguém.
 *
 * A BUSCA POR NOME existe porque as tarjas param de servir com o tamanho.
 * Oito membros cabem na tela; duzentos não, e aí ninguém procura "um dos
 * fiéis" — procura a Maria. Uma paróquia de verdade chega a duzentos, e o
 * campo é a única coisa desta tela que continua funcionando lá.
 *
 * É um formulário GET simples: sem JavaScript, o endereço fica
 * compartilhável e o botão de voltar do telefone funciona.
 */
export function FiltroDeMembros({
  filtros,
  papeis,
}: {
  filtros: FiltrosDeMembros;
  /** Só os papéis que existem na paróquia, com quantos há de cada. */
  papeis: { code: string; nome: string; quantos: number }[];
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const aceso = `${base} border-primary bg-primary-tint font-semibold text-primary`;
  const apagado = `${base} border-border text-muted hover:border-primary hover:text-foreground`;

  return (
    <div className="flex flex-col gap-3">
      <form action="/painel/membros" className="flex flex-wrap items-center gap-2">
        {/* O papel escolhido sobrevive à busca — sem isto, digitar um nome
            jogaria a pessoa de volta para a lista inteira. */}
        {filtros.papel && <input type="hidden" name="papel" value={filtros.papel} />}
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.6}
            aria-hidden
          />
          <input
            name="q"
            type="search"
            defaultValue={filtros.busca}
            placeholder="Procurar pelo nome"
            aria-label="Procurar membro pelo nome"
            className={`${INPUT_CLASSES} pl-9`}
          />
        </div>
      </form>

      {papeis.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={enderecoDosMembros({ ...filtros, papel: null })}
            aria-pressed={filtros.papel === null}
            className={filtros.papel === null ? aceso : apagado}
          >
            Todos
          </Link>
          {papeis.map(({ code, nome, quantos }) => {
            const marcado = filtros.papel === code;
            return (
              <Link
                key={code}
                href={enderecoDosMembros({ ...filtros, papel: marcado ? null : code })}
                aria-pressed={marcado}
                className={marcado ? aceso : apagado}
              >
                {nome}
                <span className={marcado ? "opacity-70" : ""}>{quantos}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
