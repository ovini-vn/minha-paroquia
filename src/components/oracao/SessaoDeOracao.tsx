"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, RotateCcw } from "lucide-react";
import type { Roteiro } from "@/lib/oracoes/roteiros";
import { marcarDiaRezadoAction } from "@/server/actions/novena-actions";
import { MaosEmOracao } from "./MaosEmOracao";
import { CartaoDaConta } from "./CartaoDaConta";

/**
 * A oração guiada: um passo por vez, com o botão das mãos para seguir.
 *
 * Três telas numa só: a APRESENTAÇÃO (o que é e como vai ser), os PASSOS e
 * a CONCLUSÃO. A tela não sabe o que é um terço — percorre os passos que
 * `roteiros.ts` montou.
 *
 * Tudo aqui usa os tokens do tema e as famílias de letra do app — nenhuma
 * cor escrita à mão. Quem escolheu tema escuro, cor do Tempo Litúrgico ou a
 * letra Legível em Aparência reza com a mesma cara do resto do aplicativo.
 *
 * Onde a pessoa parou fica guardado NO APARELHO, por roteiro. Um terço
 * interrompido pela campainha continua de onde estava; e o Rosário, que são
 * vinte dezenas, raramente é rezado de uma vez. O andamento da NOVENA — em
 * que dia se está — é outra coisa e mora na conta (ver novenas/service.ts);
 * aqui fica só o passo dentro do dia.
 */

type Guardado = { indice: number; salvoEm: number };

const VALIDADE_DO_GUARDADO = 7 * 24 * 60 * 60 * 1000;

function lerGuardado(chave: string, total: number): Guardado | null {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    const g = JSON.parse(bruto) as Guardado;
    if (typeof g.indice !== "number" || g.indice < 1 || g.indice >= total) return null;
    if (Date.now() - g.salvoEm > VALIDADE_DO_GUARDADO) return null;
    return g;
  } catch {
    return null;
  }
}

function guardar(chave: string, indice: number) {
  try {
    localStorage.setItem(chave, JSON.stringify({ indice, salvoEm: Date.now() }));
  } catch {
    // Sem armazenamento, a oração funciona igual; só não retoma.
  }
}

function esquecer(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {
    // idem
  }
}

export function SessaoDeOracao({
  roteiro,
  voltar,
  antesDeComecar,
  novena,
}: {
  roteiro: Roteiro;
  /** Para onde levar quem sai ou termina. */
  voltar: { href: string; rotulo: string };
  /** O que a apresentação mostra além do texto — no terço, a escolha dos mistérios. */
  antesDeComecar?: ReactNode;
  /** Numa novena, qual dia marcar como rezado ao terminar. */
  novena?: { slug: string; dia: number };
}) {
  const total = roteiro.passos.length;
  const chave = `rezar:${roteiro.id}`;

  // -1 = apresentação; 0..total-1 = passos; total = concluído.
  const [indice, setIndice] = useState(-1);
  const [retomar, setRetomar] = useState<Guardado | null>(null);
  const [marcacao, setMarcacao] = useState<"nada" | "enviando" | "feito" | "erro">("nada");
  const topo = useRef<HTMLDivElement>(null);
  const instrucao = useRef<HTMLParagraphElement>(null);
  const jaMarcou = useRef(false);

  useEffect(() => {
    setRetomar(lerGuardado(chave, total));
  }, [chave, total]);

  const irPara = useCallback(
    (novo: number) => {
      const limitado = Math.max(-1, Math.min(total, novo));
      setIndice(limitado);
      if (limitado >= 1 && limitado < total) guardar(chave, limitado);
      if (limitado >= total) esquecer(chave);
    },
    [chave, total],
  );

  const avancar = useCallback(() => {
    // Um toque curto no aparelho, como a conta passando entre os dedos.
    try {
      navigator.vibrate?.(12);
    } catch {
      // aparelhos sem vibração ignoram
    }
    irPara(indice + 1);
  }, [indice, irPara]);

  /*
   * Depois de cada toque, a oração da vez precisa estar à vista.
   *
   * No tamanho Padrão tudo cabe e nada se move. No Grande, o cartão das
   * contas sozinho ocupa meia tela, e a Ave-Maria ficava embaixo da barra
   * das mãos — medido a 390px. E em qualquer tamanho, depois de rolar um
   * Creio inteiro, a oração seguinte começaria fora da tela. Por isso: se a
   * instrução estiver acima do topo, ou o título escondido atrás da barra,
   * a tela rola até a instrução. Se já estiver à vista, fica parada — rolar
   * sem precisar a cada Ave-Maria cansaria a vista.
   */
  useEffect(() => {
    if (indice < 0) return;
    const alvo = indice >= total ? topo.current : instrucao.current;
    if (!alvo) return;
    const barra = document.querySelector(".barra-das-maos");
    const titulo = alvo.nextElementSibling;
    const acima = alvo.getBoundingClientRect().top < 72;
    const escondido =
      barra && titulo ? titulo.getBoundingClientRect().bottom > barra.getBoundingClientRect().top : false;
    if (acima || escondido) alvo.scrollIntoView({ block: "start" });
  }, [indice, total]);

  // No computador, as setas do teclado também passam as contas.
  useEffect(() => {
    if (indice < 0 || indice >= total) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") avancar();
      if (e.key === "ArrowLeft") irPara(indice - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [indice, total, avancar, irPara]);

  // Fim do dia da novena: marca na conta, uma vez só.
  useEffect(() => {
    if (indice !== total || !novena || jaMarcou.current) return;
    jaMarcou.current = true;
    setMarcacao("enviando");
    marcarDiaRezadoAction(novena.slug, novena.dia)
      .then((r) => setMarcacao(r.error ? "erro" : "feito"))
      .catch(() => setMarcacao("erro"));
  }, [indice, total, novena]);

  // ---- apresentação ----------------------------------------------------------
  if (indice < 0) {
    const passoRetomado = retomar ? roteiro.passos[retomar.indice] : null;
    return (
      <div ref={topo} className="flex scroll-mt-24 flex-col lg:max-w-[42rem]">
        <LinkDeVolta voltar={voltar} />
        <h1 className="font-serif text-[30px] font-semibold leading-tight text-foreground">{roteiro.titulo}</h1>
        <p className="mt-1 text-[14px] font-medium text-primary">{roteiro.subtitulo}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{roteiro.apresentacao.texto}</p>

        <ol className="mt-5 flex flex-col gap-2.5">
          {roteiro.apresentacao.partes.map((parte, i) => (
            <li key={parte} className="flex gap-3 text-[14.5px] leading-relaxed text-foreground">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary">
                {i + 1}
              </span>
              <span>{parte}</span>
            </li>
          ))}
        </ol>

        {antesDeComecar && <div className="mt-6">{antesDeComecar}</div>}

        {passoRetomado && retomar && (
          <div className="mt-6 rounded-lg border border-gold/45 bg-gradient-to-b from-gold/[0.08] to-transparent p-4">
            <p className="text-[14.5px] font-medium text-foreground">Você parou no meio</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              {passoRetomado.parte} · {passoRetomado.contador}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
              <button
                type="button"
                onClick={() => irPara(retomar.indice)}
                className="min-h-11 text-[14px] font-semibold text-primary"
              >
                Continuar de onde parei
              </button>
              <button
                type="button"
                onClick={() => {
                  esquecer(chave);
                  setRetomar(null);
                }}
                className="min-h-11 text-[13px] font-medium text-muted"
              >
                Começar do início
              </button>
            </div>
          </div>
        )}

        <BotaoDasMaos rotulo="Começar" onClick={() => irPara(0)} />
      </div>
    );
  }

  // ---- conclusão -------------------------------------------------------------
  if (indice >= total) {
    return (
      <div ref={topo} className="flex scroll-mt-24 flex-col items-center text-center lg:mx-auto lg:max-w-[36rem]">
        <span className="mt-6 grid h-24 w-24 place-items-center rounded-full bg-primary-tint text-primary">
          <MaosEmOracao className="h-12 w-12" strokeWidth={1.3} />
        </span>
        <h1 className="mt-5 font-serif text-[28px] font-semibold leading-tight text-foreground">
          {roteiro.conclusao.titulo}
        </h1>
        <p className="mt-2 max-w-[30ch] font-serif text-[19px] leading-relaxed text-foreground">
          {roteiro.conclusao.texto}
        </p>

        {novena && marcacao === "enviando" && (
          <p className="mt-3 text-[13px] text-muted">Guardando o seu dia de novena…</p>
        )}
        {novena && marcacao === "erro" && (
          <p className="mt-3 text-[13px] text-error">
            Não conseguimos guardar este dia agora. Verifique a internet e abra a novena de novo.
          </p>
        )}

        <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
          <Link
            href={voltar.href}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-[15px] font-semibold text-white dark:bg-primary-light"
          >
            Voltar para {voltar.rotulo}
          </Link>
          {!novena && (
            <button
              type="button"
              onClick={() => irPara(-1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 text-[14px] font-medium text-muted"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Rezar de novo
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- um passo --------------------------------------------------------------
  const passo = roteiro.passos[indice];
  if (!passo) return null;
  const proximo = roteiro.passos[indice + 1];
  const primeiroDoMisterio = passo.misterio && roteiro.passos[indice - 1]?.misterio?.titulo !== passo.misterio.titulo;

  return (
    <div ref={topo} className="flex scroll-mt-24 flex-col lg:max-w-[42rem]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-muted">
          {roteiro.titulo} · {roteiro.subtitulo}
        </p>
        <Link href={voltar.href} className="alvo-de-toque shrink-0 text-[13px] font-medium text-muted hover:text-primary">
          Sair
        </Link>
      </div>

      {/*
        O chaveiro: a parte, o pedaço do terço e onde se está. Ele fica preso
        no topo enquanto a pessoa rola a oração — ver CartaoDaConta.
      */}
      <CartaoDaConta
        parte={passo.parte}
        contador={passo.contador}
        contas={passo.contas}
        progresso={(indice + 1) / total}
      />

      {/*
        O mistério inteiro — com a frase para contemplar e a passagem — só
        na primeira oração da dezena. Nas dez Ave-Marias seguintes ele vira
        uma linha: repetir o quadro todo empurrava a própria Ave-Maria para
        trás do botão, e ela é rezada cinquenta vezes num terço.
      */}
      {passo.misterio && !primeiroDoMisterio && (
        <p className="mt-3 truncate text-[13px] text-muted">
          <span className="font-semibold text-primary">{passo.misterio.ordem}:</span> {passo.misterio.titulo}
        </p>
      )}
      {passo.misterio && primeiroDoMisterio && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-primary">{passo.misterio.ordem}</p>
          <p className="mt-1 font-serif text-[19px] font-semibold leading-snug text-foreground">{passo.misterio.titulo}</p>
          {primeiroDoMisterio && (
            <>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{passo.misterio.contemplar}</p>
              <Link
                href={passo.misterio.href}
                className="alvo-de-toque mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
              >
                <BookOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Ler em {passo.misterio.referencia}
              </Link>
            </>
          )}
        </div>
      )}

      <p ref={instrucao} className="mt-4 scroll-mt-28 text-[14.5px] leading-relaxed text-muted">
        {passo.instrucao}
      </p>
      <h2 className="mt-0.5 font-serif text-[26px] font-semibold leading-tight text-foreground">{passo.oracao.titulo}</h2>
      <p
        className={`mt-2 whitespace-pre-line font-serif text-[20px] leading-[1.5] ${passo.silencio ? "italic text-muted" : "text-foreground"}`}
      >
        {passo.oracao.texto}
      </p>

      {passo.leitura && (
        <Link
          href={passo.leitura.href}
          className="alvo-de-toque mt-3 inline-flex items-center gap-1.5 self-start text-[13.5px] font-medium text-primary"
        >
          <BookOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Ler na Bíblia: {passo.leitura.referencia}
        </Link>
      )}

      <BotaoDasMaos
        rotulo={proximo ? `Próxima: ${proximo.oracao.titulo}` : "Terminar"}
        onClick={avancar}
        aoVoltar={() => irPara(indice - 1)}
        contagem={`${indice + 1} de ${total}`}
      />
    </div>
  );
}

function LinkDeVolta({ voltar }: { voltar: { href: string; rotulo: string } }) {
  return (
    <Link
      href={voltar.href}
      className="alvo-de-toque mb-4 inline-flex items-center gap-1 self-start text-[13px] text-muted transition-colors hover:text-primary"
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      {voltar.rotulo}
    </Link>
  );
}

/**
 * O botão das mãos em oração.
 *
 * Fica PRESO embaixo da tela, acima da barra de abas: no Creio e na
 * Salve-Rainha a pessoa rola, e ter de subir de volta para achar o botão
 * seria perder o fio da oração. Grande e redondo — é tocado dezenas de
 * vezes seguidas, muitas delas sem olhar.
 */
function BotaoDasMaos({
  rotulo,
  onClick,
  aoVoltar,
  contagem,
}: {
  rotulo: string;
  onClick: () => void;
  aoVoltar?: () => void;
  contagem?: string;
}) {
  /*
   * As classes `barra-das-maos-*` existem para o tamanho de letra Grande
   * (ver globals.css). No G o app inteiro fica 1,5 vez maior, e a barra
   * normal — círculo, nome embaixo, contagem ao lado — tomava um terço da
   * tela e cobria a instrução e o começo da oração. Lá ela vira uma linha
   * só: círculo menor com o nome ao lado, sem a contagem, que a barra de
   * progresso do cartão já mostra.
   */
  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 mt-6 lg:bottom-6">
      {/* Três colunas, e não o voltar e a contagem posicionados por cima:
          no tamanho Grande, com o nome ao lado do círculo, a seta encostava
          nele. */}
      <div className="barra-das-maos grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-border bg-background/95 px-2 py-2 shadow-lg backdrop-blur">
        {aoVoltar ? (
          <button
            type="button"
            onClick={aoVoltar}
            className="inline-flex min-h-11 items-center gap-0.5 justify-self-start px-2 text-[13px] font-medium text-muted hover:text-primary"
            aria-label="Voltar para a oração anterior"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            <span className="barra-das-maos-voltar">Voltar</span>
          </button>
        ) : (
          <span aria-hidden />
        )}
        <button
          type="button"
          onClick={onClick}
          className="barra-das-maos-botao flex flex-col items-center gap-1 rounded-full px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="barra-das-maos-circulo grid h-[62px] w-[62px] place-items-center rounded-full bg-primary text-white shadow ring-4 ring-gold/40 transition-transform active:scale-95 dark:bg-primary-light">
            <MaosEmOracao className="h-9 w-9" strokeWidth={1.6} />
          </span>
          <span className="barra-das-maos-rotulo max-w-[12rem] truncate text-[13px] font-semibold text-foreground">
            {rotulo}
          </span>
        </button>
        {contagem ? (
          <span className="barra-das-maos-contagem justify-self-end pr-2 text-[13px] tabular-nums text-muted">
            {contagem}
          </span>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </div>
  );
}
