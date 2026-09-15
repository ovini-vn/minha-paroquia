"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Mic, MicOff, RotateCcw } from "lucide-react";
import type { Roteiro } from "@/lib/oracoes/roteiros";
import {
  acompanhar,
  inicioDaProxima,
  normalizarPalavras,
  palavrasDaOracao,
  terminou,
  type Andamento,
} from "@/lib/oracoes/acompanhar-voz";
import { MaosEmOracao } from "./MaosEmOracao";
import { PedacoDoTerco } from "./PedacoDoTerco";
import { Eyebrow } from "@/components/ui/Typography";

/**
 * O TERÇO REZADO PELA VOZ — protótipo (15/09/2026), pedido para quem reza
 * no carro.
 *
 * O navegador transforma a fala em texto (Web Speech API); a comparação com
 * a oração mora em `acompanhar-voz.ts`. Esta tela só liga o microfone,
 * acende as palavras já rezadas e passa para a próxima oração quando:
 *
 * - a pessoa chega às últimas palavras depois de rezar a maior parte, e faz
 *   uma pausa (curta se ouviu até a última palavra, maior se a última se
 *   perdeu); ou
 * - a pessoa já começou a oração seguinte — a segunda chance.
 *
 * Limites do navegador, conhecidos antes de testar: a tela precisa ficar
 * acesa (pedimos para ela não apagar enquanto ouve), no Chrome o
 * reconhecimento passa pelo serviço do Google e precisa de internet, e no
 * iPhone ele para mais vezes sozinho — por isso a tela religa o microfone
 * sempre que ele cai.
 *
 * É protótipo de propósito: a regra de quando passar precisa ser acertada
 * com gente rezando de verdade, e a linha "O app ouviu" embaixo da oração
 * existe para isso.
 */

type Estado = "parado" | "ouvindo" | "sem-suporte" | "sem-permissao" | "sem-rede" | "sem-microfone";

// A Web Speech API não está nos tipos do TypeScript. Só o que usamos.
type ResultadoDeFala = { 0: { transcript: string }; isFinal: boolean };
type EventoDeFala = { results: { length: number; [i: number]: ResultadoDeFala } };
type Reconhecedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: EventoDeFala) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type ConstrutorDeReconhecedor = new () => Reconhecedor;

function construtorDoNavegador(): ConstrutorDeReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorDeReconhecedor; webkitSpeechRecognition?: ConstrutorDeReconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type TravaDeTela = { release: () => Promise<void> };

const ZERO: Andamento = { posicao: 0, acertos: 0, metadeEm: null, fimEm: null };

/** Pausa depois da última palavra antes de passar — e a maior, quando a última se perdeu. */
const PAUSA_NO_FIM = 700;
const PAUSA_QUASE_NO_FIM = 1600;

export function TercoPorVoz({ roteiro, voltar }: { roteiro: Roteiro; voltar: { href: string; rotulo: string } }) {
  const total = roteiro.passos.length;
  const oracoes = useMemo(() => roteiro.passos.map((p) => palavrasDaOracao(p.oracao.texto)), [roteiro]);

  const [indice, setIndice] = useState(-1);
  const [posicao, setPosicao] = useState(0);
  const [estado, setEstado] = useState<Estado>("parado");
  const [ouvido, setOuvido] = useState("");
  const [comSom, setComSom] = useState(true);
  const [suportado, setSuportado] = useState(true);

  const reconhecedor = useRef<Reconhecedor | null>(null);
  const querOuvir = useRef(false);
  const indiceRef = useRef(-1);
  const inicioDoPasso = useRef(0);
  const base = useRef({ posicao: 0, acertos: 0 });
  const andamento = useRef<Andamento>(ZERO);
  const palavrasDaSessao = useRef<string[]>([]);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trava = useRef<TravaDeTela | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const somLigado = useRef(true);
  const palavraAtual = useRef<HTMLSpanElement | null>(null);
  const ultimoErro = useRef<string | null>(null);

  useEffect(() => {
    setSuportado(construtorDoNavegador() !== null);
  }, []);
  useEffect(() => {
    somLigado.current = comSom;
  }, [comSom]);

  const cancelarEspera = () => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
  };

  /** Um "tique" baixo ao passar: no suporte do carro, o motorista não vê a tela. */
  const tocarSom = () => {
    try {
      navigator.vibrate?.(12);
    } catch {
      // sem vibração
    }
    const ctx = audio.current;
    if (!somLigado.current || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.frequency.value = 660;
      ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
      ganho.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(ganho).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // sem áudio, só a vibração
    }
  };

  const soltarTela = () => {
    trava.current?.release().catch(() => undefined);
    trava.current = null;
  };

  const pararDeOuvir = useCallback(() => {
    querOuvir.current = false;
    cancelarEspera();
    try {
      reconhecedor.current?.abort();
    } catch {
      // já parado
    }
    soltarTela();
    setEstado((e) => (e === "ouvindo" ? "parado" : e));
  }, []);

  /** Muda de passo. `novoInicio` diz de que palavra ouvida em diante é o passo novo. */
  const irPara = useCallback(
    (novo: number, novoInicio: number, pelaVoz: boolean) => {
      cancelarEspera();
      const limitado = Math.max(0, Math.min(total, novo));
      indiceRef.current = limitado;
      inicioDoPasso.current = novoInicio;
      base.current = { posicao: 0, acertos: 0 };
      andamento.current = ZERO;
      setIndice(limitado);
      setPosicao(0);
      setOuvido("");
      if (pelaVoz) tocarSom();
      if (limitado >= total) pararDeOuvir();
    },
    [total, pararDeOuvir],
  );

  const processar = useCallback(
    (palavras: string[]) => {
      const i = indiceRef.current;
      const atual = oracoes[i];
      if (i < 0 || i >= total || !atual) return;

      const doPasso = palavras.slice(inicioDoPasso.current);
      const a = acompanhar(atual.esperadas, doPasso, base.current);
      andamento.current = a;
      setPosicao(a.posicao);
      setOuvido(doPasso.slice(-12).join(" "));

      // Segunda chance: a próxima oração já começou.
      const proxima = oracoes[i + 1];
      if (proxima && a.metadeEm !== null) {
        const desde = a.metadeEm < 0 ? 0 : a.metadeEm + 1;
        const achou = inicioDaProxima(doPasso.slice(desde), proxima.esperadas);
        if (achou >= 0) {
          irPara(i + 1, inicioDoPasso.current + desde + achou, true);
          processar(palavras);
          return;
        }
      }

      // Chegou ao fim: passa depois de uma pausa. Cada palavra nova recomeça a espera.
      cancelarEspera();
      const fim = terminou(atual.esperadas, a);
      if (fim === "nao") return;
      const novoInicio = inicioDoPasso.current + (a.fimEm !== null && a.fimEm >= 0 ? a.fimEm + 1 : doPasso.length);
      espera.current = setTimeout(
        () => {
          if (indiceRef.current === i) irPara(i + 1, novoInicio, true);
        },
        fim === "sim" ? PAUSA_NO_FIM : PAUSA_QUASE_NO_FIM,
      );
    },
    [oracoes, total, irPara],
  );

  const segurarTela = async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<TravaDeTela> } };
      if (nav.wakeLock && !trava.current) trava.current = await nav.wakeLock.request("screen");
    } catch {
      // sem trava: a tela pode apagar sozinha
    }
  };

  const comecarAOuvir = useCallback(() => {
    const Construtor = construtorDoNavegador();
    if (!Construtor) {
      setEstado("sem-suporte");
      return;
    }
    if (!audio.current) {
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audio.current = new Ctx();
      } catch {
        audio.current = null;
      }
    }
    querOuvir.current = true;
    ultimoErro.current = null;
    void segurarTela();

    const r = reconhecedor.current ?? new Construtor();
    reconhecedor.current = r;
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => setEstado("ouvindo");
    r.onresult = (e) => {
      /*
       * No Chrome do Android, cada resultado costuma trazer o texto inteiro
       * até ali, e não só o trecho novo. Juntar tudo repetiria a oração — e
       * o "Ave Maria" repetido depois da metade seria tomado pelo começo da
       * próxima. Quando um resultado começa com o anterior, fica só ele.
       */
      const partes: string[] = [];
      for (let k = 0; k < e.results.length; k++) {
        const trecho = e.results[k]![0].transcript.trim();
        const anterior = partes[partes.length - 1];
        if (anterior !== undefined && normalizarPalavras(trecho).join(" ").startsWith(normalizarPalavras(anterior).join(" "))) {
          partes[partes.length - 1] = trecho;
        } else {
          partes.push(trecho);
        }
      }
      const palavras = normalizarPalavras(partes.join(" "));
      palavrasDaSessao.current = palavras;
      ultimoErro.current = null;
      processar(palavras);
    };
    r.onerror = (e) => {
      ultimoErro.current = e.error;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        querOuvir.current = false;
        soltarTela();
        setEstado("sem-permissao");
      } else if (e.error === "audio-capture") {
        querOuvir.current = false;
        soltarTela();
        setEstado("sem-microfone");
      } else if (e.error === "network") {
        setEstado("sem-rede");
      }
      // "no-speech" e "aborted": o fim da sessão religa, se ainda queremos ouvir.
    };
    r.onend = () => {
      if (!querOuvir.current) return;
      // Sessão nova: as palavras recomeçam do zero, o andamento do passo não.
      const i = indiceRef.current;
      const atual = oracoes[i];
      if (atual && espera.current && terminou(atual.esperadas, andamento.current) !== "nao") {
        irPara(i + 1, 0, true);
      } else {
        base.current = { posicao: andamento.current.posicao, acertos: andamento.current.acertos };
        inicioDoPasso.current = 0;
      }
      palavrasDaSessao.current = [];
      const religar = () => {
        if (!querOuvir.current) return;
        try {
          r.start();
        } catch {
          // ainda encerrando; tenta de novo logo
          setTimeout(religar, 300);
        }
      };
      setTimeout(religar, ultimoErro.current === "network" ? 2000 : 150);
    };

    try {
      r.start();
    } catch {
      // já estava ligado
    }
  }, [oracoes, processar, irPara]);

  // A trava da tela cai quando o app vai para o fundo; ao voltar, pede de novo.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && querOuvir.current) void segurarTela();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, []);

  // Ao sair da tela, desliga tudo.
  useEffect(
    () => () => {
      querOuvir.current = false;
      cancelarEspera();
      try {
        reconhecedor.current?.abort();
      } catch {
        // já parado
      }
      soltarTela();
      audio.current?.close().catch(() => undefined);
    },
    [],
  );

  // A palavra da vez fica no meio da tela — no Creio, o texto passa da dobra.
  useEffect(() => {
    const el = palavraAtual.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 200) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [posicao, indice]);

  const manual = (novo: number) => irPara(novo, palavrasDaSessao.current.length, false);

  // ---- apresentação ----------------------------------------------------------
  if (indice < 0) {
    return (
      <div className="flex flex-col lg:max-w-[42rem]">
        <Link
          href={voltar.href}
          className="alvo-de-toque mb-4 inline-flex items-center gap-1 self-start text-[13px] text-muted transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {voltar.rotulo}
        </Link>
        <p className="self-start rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-eyebrow text-[#8a6b24] dark:text-gold">
          Em teste
        </p>
        <h1 className="mt-2 font-serif text-[30px] font-semibold leading-tight text-foreground">Terço com a voz</h1>
        <p className="mt-1 text-[14px] font-medium text-primary">{roteiro.subtitulo}</p>

        <ol className="mt-5 flex flex-col gap-2.5">
          {[
            "Toque em Começar e permita o uso do microfone.",
            "Reze em voz normal. As palavras acendem conforme você reza.",
            "Ao terminar cada oração, o aplicativo passa sozinho para a próxima, com um som curto. Se ele se perder, toque em Próxima.",
          ].map((texto, i) => (
            <li key={texto} className="flex gap-3 text-[14.5px] leading-relaxed text-foreground">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary">
                {i + 1}
              </span>
              <span>{texto}</span>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-[14px] leading-relaxed text-muted">
          No carro, deixe o celular no suporte. A tela não apaga enquanto o aplicativo estiver ouvindo, e quem dirige não
          precisa olhar nem tocar: basta rezar.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          O microfone só fica ligado nesta tela, enquanto você reza. O aplicativo não grava nem guarda o que ouve. Para
          transformar a voz em texto, o navegador usa um serviço dele — no Chrome, o do Google —, e por isso é preciso
          internet.
        </p>

        {!suportado && (
          <p className="mt-4 rounded-lg border border-error/40 bg-error-tint px-3.5 py-3 text-[13.5px] leading-relaxed text-foreground">
            Este navegador não reconhece voz. No Android, abra o aplicativo pelo Chrome; no iPhone, pelo Safari. Você
            pode rezar o terço normal, tocando nas mãos.
          </p>
        )}

        <label className="mt-5 flex items-center gap-2.5 text-[14px] text-foreground">
          <input type="checkbox" checked={comSom} onChange={(e) => setComSom(e.target.checked)} />
          Tocar um som curto ao passar para a próxima oração
        </label>

        <button
          type="button"
          disabled={!suportado}
          onClick={() => {
            irPara(0, 0, false);
            comecarAOuvir();
          }}
          className="mt-6 inline-flex min-h-14 items-center justify-center gap-2.5 self-start rounded-full bg-primary px-7 text-[16px] font-semibold text-white shadow disabled:opacity-50 dark:bg-primary-light"
        >
          <Mic className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          Começar
        </button>
      </div>
    );
  }

  // ---- conclusão -------------------------------------------------------------
  if (indice >= total) {
    return (
      <div className="flex flex-col items-center text-center lg:mx-auto lg:max-w-[36rem]">
        <span className="mt-6 grid h-24 w-24 place-items-center rounded-full bg-primary-tint text-primary">
          <MaosEmOracao className="h-12 w-12" strokeWidth={1.3} />
        </span>
        <h1 className="mt-5 font-serif text-[28px] font-semibold leading-tight text-foreground">{roteiro.conclusao.titulo}</h1>
        <p className="mt-2 max-w-[30ch] font-serif text-[19px] leading-relaxed text-foreground">{roteiro.conclusao.texto}</p>
        <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
          <Link
            href={voltar.href}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-[15px] font-semibold text-white dark:bg-primary-light"
          >
            Voltar para {voltar.rotulo}
          </Link>
          <button
            type="button"
            onClick={() => setIndice(-1)}
            className="inline-flex min-h-11 items-center justify-center gap-2 text-[14px] font-medium text-muted"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Rezar de novo
          </button>
        </div>
      </div>
    );
  }

  // ---- um passo --------------------------------------------------------------
  const passo = roteiro.passos[indice];
  const oracao = oracoes[indice];
  if (!passo || !oracao) return null;
  const ouvindo = estado === "ouvindo";

  return (
    <div className="flex flex-col lg:max-w-[42rem]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-muted">
          Terço com a voz · <span className="text-[#8a6b24] dark:text-gold">em teste</span>
        </p>
        <Link href={voltar.href} className="alvo-de-toque shrink-0 text-[13px] font-medium text-muted hover:text-primary">
          Sair
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-4 pb-3.5 pt-3 shadow-sm before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-gold before:to-transparent">
        <Eyebrow tone="accent">{passo.parte}</Eyebrow>
        <div className="mt-1">
          <PedacoDoTerco contas={passo.contas} rotulo={`${passo.parte}: ${passo.contador}`} />
        </div>
        <p className="contador-da-conta text-center font-serif text-[22px] font-semibold leading-tight text-foreground" aria-live="polite">
          {passo.contador}
        </p>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((indice + 1) / total) * 100}%` }} />
        </div>
      </div>

      {passo.misterio && (
        <p className="mt-3 text-[13.5px] leading-snug text-muted">
          <span className="font-semibold text-primary">{passo.misterio.ordem}:</span> {passo.misterio.titulo}
        </p>
      )}

      {estado === "sem-permissao" && (
        <Aviso>
          O microfone está bloqueado para este site. Libere nas permissões do navegador e toque no microfone abaixo.
        </Aviso>
      )}
      {estado === "sem-microfone" && <Aviso>Não encontramos um microfone neste aparelho.</Aviso>}
      {estado === "sem-rede" && (
        <Aviso>Sem internet, o reconhecimento de voz para. Enquanto isso, passe as orações tocando em Próxima.</Aviso>
      )}

      <p className="mt-4 text-[14.5px] leading-relaxed text-muted">{passo.instrucao}</p>
      <h2 className="mt-0.5 font-serif text-[26px] font-semibold leading-tight text-foreground">{passo.oracao.titulo}</h2>

      {/* O videokê: rezadas em cor cheia, a da vez marcada, as que faltam apagadas. */}
      <p className="mt-2 whitespace-pre-line font-serif text-[21px] leading-[1.55]">
        {oracao.exibidas.map((p, k) => {
          if (p.espaco) return <span key={k}>{p.texto}</span>;
          const dita = p.ate <= posicao;
          const daVez = !dita && p.de <= posicao;
          return (
            <span
              key={k}
              ref={daVez ? palavraAtual : undefined}
              className={
                dita
                  ? "text-foreground"
                  : daVez
                    ? "rounded bg-gold/30 text-foreground"
                    : "text-muted/70"
              }
            >
              {p.texto}
            </span>
          );
        })}
      </p>

      <p className="mt-4 min-h-[2.6em] text-[13px] leading-snug text-muted">
        <span className="font-semibold">O app ouviu:</span> {ouvido || "…"}
      </p>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 mt-4 lg:bottom-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-border bg-background/95 px-2 py-2 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => manual(indice - 1)}
            disabled={indice === 0}
            className="inline-flex min-h-11 items-center gap-0.5 justify-self-start px-2 text-[13px] font-medium text-muted hover:text-primary disabled:opacity-40"
            aria-label="Voltar para a oração anterior"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => (querOuvir.current ? pararDeOuvir() : comecarAOuvir())}
            className="flex flex-col items-center gap-1 rounded-full px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={ouvindo ? "Pausar o microfone" : "Ligar o microfone"}
          >
            {/* Ouvindo: o botão fica firme e um anel pulsa em volta. Pulsar o
                próprio botão o deixava meio apagado, com cara de desligado. */}
            <span className="relative grid h-[62px] w-[62px] place-items-center">
              {ouvindo && (
                <span className="absolute inset-0 rounded-full bg-gold/40 motion-safe:animate-ping" aria-hidden />
              )}
              <span
                className={
                  ouvindo
                    ? "relative grid h-[62px] w-[62px] place-items-center rounded-full bg-primary text-white shadow ring-4 ring-gold/50 dark:bg-primary-light"
                    : "relative grid h-[62px] w-[62px] place-items-center rounded-full border-2 border-border-strong bg-surface text-muted"
                }
              >
                {ouvindo ? (
                  <Mic className="h-7 w-7" strokeWidth={1.7} aria-hidden />
                ) : (
                  <MicOff className="h-7 w-7" strokeWidth={1.7} aria-hidden />
                )}
              </span>
            </span>
            <span className="text-[13px] font-semibold text-foreground">{ouvindo ? "Ouvindo" : "Pausado"}</span>
          </button>
          <button
            type="button"
            onClick={() => manual(indice + 1)}
            className="inline-flex min-h-11 items-center gap-0.5 justify-self-end px-2 text-[13px] font-medium text-muted hover:text-primary"
            aria-label="Passar para a próxima oração"
          >
            Próxima
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-error/40 bg-error-tint px-3.5 py-3 text-[13.5px] leading-relaxed text-foreground">
      {children}
    </p>
  );
}
