"use client";

import { RefreshCw, ChevronLeft, Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * O que o fiel vê quando algo quebra do lado do servidor.
 *
 * Antes desta tela, qualquer exceção virava o texto cru do Next —
 * "Application error: a server-side exception has occurred" — em inglês,
 * sem saída e sem dizer o que fazer. Aconteceu duas vezes em produção na
 * semana de 26/08/2026.
 *
 * Três decisões que valem explicação:
 *
 * O texto NÃO diz o que deu errado tecnicamente. Quem está do outro lado
 * quer saber se perdeu o que escreveu e como voltar, não qual tabela faltou.
 *
 * O `digest` aparece, pequeno, porque é o mesmo código que sai no log do
 * servidor. É o que transforma "não funcionou" em algo rastreável quando a
 * pessoa avisa a secretaria — sem ele, o relato é impossível de investigar.
 *
 * Há sempre DUAS saídas: tentar de novo (a falha pode ser de rede) e voltar
 * para um lugar conhecido. Tela de erro sem saída é beco.
 *
 * O ícone vem de `variante`, um texto, e NÃO como componente por
 * propriedade. Componente é função, e função não atravessa a fronteira
 * servidor→cliente: o `not-found.tsx` é Server Component, e passar o ícone
 * direto derrubava a página de 404 com "Functions cannot be passed directly
 * to Client Components" — trocando um 404 por um 500.
 */
const ICONE = { erro: RefreshCw, ausente: Compass } as const;
export function TelaDeErro({
  titulo = "Algo não carregou como devia",
  descricao = "A falha é nossa, não sua. Nada do que você escreveu se perdeu.",
  digest,
  aoTentarDeNovo,
  voltarPara = "/inicio",
  rotuloDoVoltar = "Voltar ao início",
  variante = "erro",
}: {
  titulo?: string;
  descricao?: string;
  /** Código que o Next gera e repete no log do servidor. */
  digest?: string;
  aoTentarDeNovo?: () => void;
  voltarPara?: string;
  rotuloDoVoltar?: string;
  /** "erro" para falha do servidor, "ausente" para endereço que não existe. */
  variante?: keyof typeof ICONE;
}) {
  const Icone = ICONE[variante];
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/45 bg-gold/10 text-[#8a6b24] dark:text-gold">
        <Icone className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </span>

      <h1 className="mt-5 font-serif text-[26px] font-semibold leading-tight text-foreground">
        {titulo}
      </h1>
      <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted">{descricao}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        {aoTentarDeNovo && (
          <Button type="button" onClick={aoTentarDeNovo}>
            <RefreshCw className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            Tentar de novo
          </Button>
        )}
        <Link
          href={voltarPara}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] text-primary transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {rotuloDoVoltar}
        </Link>
      </div>

      {digest && (
        <p className="mt-7 text-[11.5px] leading-relaxed text-muted">
          Se acontecer de novo, avise a secretaria e informe este código:
          <br />
          <code className="mt-1 inline-block rounded bg-sunken px-2 py-1 font-mono text-[11px] text-foreground">
            {digest}
          </code>
        </p>
      )}
    </div>
  );
}
