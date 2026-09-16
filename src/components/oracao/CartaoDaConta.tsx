"use client";

import { useEffect, useRef, useState } from "react";
import type { Conta } from "@/lib/oracoes/roteiros";
import { PedacoDoTerco } from "./PedacoDoTerco";
import { Eyebrow } from "@/components/ui/Typography";
import { cn } from "@/lib/cn";

/**
 * O cartão das contas — o pedaço do terço, a conta da vez e o andamento.
 *
 * FICA PRESO NO TOPO enquanto a pessoa rola a oração (16/09/2026, pedido do
 * usuário): rezando o Creio ou a Salve-Rainha, era preciso rolar para ler, e
 * aí sumia justamente a informação de onde se está — quantas Ave-Marias já
 * foram. Era o motivo de o cartão existir.
 *
 * Preso, ele ENCOLHE: inteiro, ocuparia um terço da tela e empurraria a
 * oração para baixo da dobra. Vira uma linha só, com o terço menor ao lado
 * do nome da conta. O nome da parte e a barra de progresso somem — o
 * desenho das contas já diz o mesmo.
 *
 * O topo é medido do cabeçalho de verdade, e não fixo: no tamanho de letra
 * Grande ele é mais alto, e um valor fixo deixaria o cartão por baixo dele.
 */
export function CartaoDaConta({
  parte,
  contador,
  contas,
  progresso,
}: {
  parte: string;
  contador: string;
  contas: Conta[];
  /** De 0 a 1 — o quanto da oração inteira já foi rezado. */
  progresso: number;
}) {
  const [preso, setPreso] = useState(false);
  const [topo, setTopo] = useState(0);
  const sentinela = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const medir = () => {
      // `offsetHeight`, e não o retângulo: no tamanho de letra Grande a
      // página inteira é ampliada por `zoom`, e o retângulo vem 1,5 vez
      // maior — o cartão grudava atrás do cabeçalho.
      const cabecalho = document.querySelector("header");
      setTopo(cabecalho instanceof HTMLElement ? cabecalho.offsetHeight : 0);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    // A sentinela é um fio de um pixel acima do cartão: quando ela sai da
    // tela por cima do cabeçalho, é porque o cartão grudou.
    const observador = new IntersectionObserver(
      ([entrada]) => setPreso(!(entrada?.isIntersecting ?? true)),
      { rootMargin: `-${topo + 2}px 0px 0px 0px`, threshold: 1 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [topo]);

  return (
    <>
      <div ref={sentinela} className="h-px" aria-hidden />
      <div className="sticky z-20" style={{ top: topo }}>
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-[padding] before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent",
            preso ? "px-3 py-1.5 shadow-md" : "px-4 pb-3.5 pt-3",
          )}
        >
          {preso ? (
            <div className="flex items-center gap-3">
              {/* A largura vem da caixa, e não de uma classe no desenho: o
                  próprio terço já é `w-full`, e sozinho ele espremia o nome
                  da conta até sumir. */}
              <span className="block w-[45%] max-w-[180px] shrink-0">
                <PedacoDoTerco contas={contas} rotulo={`${parte}: ${contador}`} />
              </span>
              <p className="contador-da-conta min-w-0 flex-1 truncate font-serif text-[17px] font-semibold leading-tight text-foreground" aria-live="polite">
                {contador}
              </p>
            </div>
          ) : (
            <>
              <Eyebrow tone="accent">{parte}</Eyebrow>
              <div className="mt-1">
                <PedacoDoTerco contas={contas} rotulo={`${parte}: ${contador}`} />
              </div>
              <p
                className="contador-da-conta text-center font-serif text-[22px] font-semibold leading-tight text-foreground"
                aria-live="polite"
              >
                {contador}
              </p>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(progresso * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
