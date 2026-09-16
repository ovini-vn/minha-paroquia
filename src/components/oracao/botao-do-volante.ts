"use client";

import { useEffect, useRef, useState } from "react";
import { wavQuaseEmSilencio } from "@/lib/oracoes/silencio";

/**
 * Passar a oração pelo botão do volante, do fone ou da tela de bloqueio.
 *
 * O carro e o fone só entregam os botões de faixa à página que está TOCANDO
 * SOM — e, no Android, quando o que toca dura mais de cinco segundos. Por
 * isso o app toca, em laço, trinta segundos de um grave baixo (ver
 * silencio.ts) enquanto a pessoa reza. Quem responde aos botões é a Media
 * Session, que também põe a oração da vez na ficha da tela de bloqueio.
 *
 * Nasceu para o Terço com a voz, no carro, onde o barulho atrapalha a voz.
 * Vale também no terço comum: mãos no volante, ou mãos ocupadas.
 *
 * Nem todo aparelho manda "próxima faixa" — há fone e central que mandam
 * avançar/retroceder no mesmo botão. Todos caem na oração seguinte ou na
 * anterior.
 */
const ACOES = ["nexttrack", "previoustrack", "seekforward", "seekbackward", "play", "pause", "stop"] as const;

export type FichaDaOracao = {
  /** O nome da oração — vira o "título da faixa". */
  titulo: string;
  /** Onde se está: "1ª dezena de 5 · 4ª Ave-Maria de 10". */
  onde: string;
  /** O que se está rezando: "Terço · Mistérios Dolorosos". */
  album: string;
};

export function useBotaoDoVolante({
  ativo,
  ficha,
  aoAvancar,
  aoVoltar,
  aoPausar,
  aoTocar,
}: {
  ativo: boolean;
  /** Nulo fora dos passos (apresentação, conclusão). */
  ficha: FichaDaOracao | null;
  aoAvancar: () => void;
  aoVoltar: () => void;
  aoPausar?: () => void;
  aoTocar?: () => void;
}) {
  const [toques, setToques] = useState(0);
  const som = useRef<HTMLAudioElement | null>(null);

  /** Começa a tocar. Chamar no toque da pessoa: navegador nenhum toca sozinho. */
  const ligar = () => {
    if (!som.current) {
      try {
        const elemento = new Audio(URL.createObjectURL(wavQuaseEmSilencio()));
        elemento.loop = true;
        elemento.volume = 0.6;
        // Dentro da página, e não solto: há navegador que só oferece os
        // controles de mídia quando o áudio está no documento.
        elemento.setAttribute("aria-hidden", "true");
        document.body.appendChild(elemento);
        som.current = elemento;
      } catch {
        return;
      }
    }
    som.current.play().catch(() => undefined);
  };

  const desligar = () => {
    const elemento = som.current;
    if (elemento) {
      elemento.pause();
      elemento.currentTime = 0;
    }
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      for (const acao of ACOES) {
        try {
          navigator.mediaSession.setActionHandler(acao, null);
        } catch {
          // navegador sem essa ação
        }
      }
    }
  };

  // Refeito a cada oração: é assim que a ficha mostra onde a pessoa está e
  // que "próxima" sabe para onde ir.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const sessao = navigator.mediaSession;
    if (!ativo || !ficha) return;

    const atender = (acao: (typeof ACOES)[number], fazer: (() => void) | undefined) => {
      if (!fazer) return;
      try {
        sessao.setActionHandler(acao, () => {
          setToques((n) => n + 1);
          fazer();
        });
      } catch {
        // este aparelho não manda esta ação
      }
    };

    try {
      sessao.metadata = new MediaMetadata({ title: ficha.titulo, artist: ficha.onde, album: ficha.album });
      sessao.playbackState = "playing";
    } catch {
      // navegador sem Media Session completa
    }
    atender("nexttrack", aoAvancar);
    atender("seekforward", aoAvancar);
    atender("previoustrack", aoVoltar);
    atender("seekbackward", aoVoltar);
    atender("pause", aoPausar);
    atender("stop", aoPausar);
    atender("play", aoTocar);
  });

  // Ao sair da tela, o som para e os botões voltam a quem estava tocando.
  useEffect(
    () => () => {
      desligar();
      som.current?.remove();
      som.current = null;
    },
    [],
  );

  return { toques, ligar, desligar };
}
