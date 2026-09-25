"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Parte o texto em frases de até ~220 letras.
 *
 * O Chrome corta uma fala longa por volta dos 15 segundos, sem aviso: a
 * leitura simplesmente para no meio do Evangelho. Frases curtas em fila
 * contornam isso, e o pausar/continuar passa a cair no fim de uma frase.
 */
export function emFrases(texto: string, limite = 220): string[] {
  const frases = texto
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;:])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
  const pedacos: string[] = [];
  for (const frase of frases) {
    if (frase.length <= limite) {
      pedacos.push(frase);
      continue;
    }
    // Frase longa demais: corta nas vírgulas, e em último caso no espaço.
    let resto = frase;
    while (resto.length > limite) {
      const corte = Math.max(resto.lastIndexOf(", ", limite - 2), resto.lastIndexOf(" ", limite - 1));
      const ponto = corte > 40 ? corte + 1 : limite;
      pedacos.push(resto.slice(0, ponto).trim());
      resto = resto.slice(ponto).trim();
    }
    if (resto) pedacos.push(resto);
  }
  return pedacos;
}

type Estado = "parado" | "falando" | "pausado";

/**
 * Ouvir um texto em voz, com a voz do próprio aparelho.
 *
 * Para quem lê com dificuldade — boa parte de quem frequenta a paróquia —
 * e para quem quer ouvir a leitura enquanto faz outra coisa. Não baixa
 * nada nem manda o texto para fora: é o leitor de voz que o celular já tem.
 * Onde o navegador não oferece, o botão não aparece.
 */
export function OuvirEmVoz({ texto, rotulo = "Ouvir", className }: { texto: string; rotulo?: string; className?: string }) {
  const [disponivel, setDisponivel] = useState(false);
  const [estado, setEstado] = useState<Estado>("parado");
  const cancelado = useRef(false);

  useEffect(() => {
    setDisponivel(typeof window !== "undefined" && "speechSynthesis" in window);
    // Sair da tela no meio da leitura não pode deixar a voz falando sozinha.
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!disponivel || !texto.trim()) return null;

  const falar = () => {
    const sintese = window.speechSynthesis;
    sintese.cancel();
    cancelado.current = false;
    const voz =
      sintese.getVoices().find((v) => v.lang === "pt-BR") ?? sintese.getVoices().find((v) => v.lang.startsWith("pt"));
    const frases = emFrases(texto);
    frases.forEach((frase, i) => {
      const u = new SpeechSynthesisUtterance(frase);
      u.lang = "pt-BR";
      if (voz) u.voice = voz;
      u.rate = 0.95;
      if (i === frases.length - 1) {
        u.onend = () => {
          if (!cancelado.current) setEstado("parado");
        };
      }
      sintese.speak(u);
    });
    setEstado("falando");
  };

  const pausar = () => {
    window.speechSynthesis.pause();
    setEstado("pausado");
  };
  const continuar = () => {
    window.speechSynthesis.resume();
    setEstado("falando");
  };
  const parar = () => {
    cancelado.current = true;
    window.speechSynthesis.cancel();
    setEstado("parado");
  };

  const botao =
    "alvo-de-toque inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Leitura em voz">
      {estado === "parado" && (
        <button type="button" onClick={falar} className={botao}>
          <Volume2 className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {rotulo}
        </button>
      )}
      {estado === "falando" && (
        <button type="button" onClick={pausar} className={botao}>
          <Pause className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          Pausar
        </button>
      )}
      {estado === "pausado" && (
        <button type="button" onClick={continuar} className={botao}>
          <Play className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          Continuar
        </button>
      )}
      {estado !== "parado" && (
        <button type="button" onClick={parar} className={botao}>
          <Square className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          Parar
        </button>
      )}
    </div>
  );
}
