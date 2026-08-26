"use client";

import { useState } from "react";
import { Play, Video } from "lucide-react";
import { idDoVideoDoYoutube, capaDoVideo, enderecoParaTocar } from "@/lib/youtube";

/**
 * O vídeo da Palavra do Padre, assistido dentro do aplicativo.
 *
 * Mostra a capa e só carrega o player quando alguém toca. Três razões, e
 * todas importam aqui:
 *
 * A política de privacidade promete não ter rastreador de terceiros — e um
 * player do YouTube carregado sozinho fala com o Google antes de a pessoa
 * pedir. Assim, quem só passa os olhos pela Comunidade não vira audiência
 * do Google sem escolher.
 *
 * A Comunidade lista vários posts; um player em cada um deixaria a tela
 * pesada num celular simples, que é o aparelho de boa parte da paróquia.
 *
 * E a capa comunica: dá para ver do que se trata antes de gastar dados
 * móveis com o vídeo.
 *
 * Endereço que não é do YouTube continua abrindo fora, como antes — Vimeo,
 * Facebook, um arquivo de vídeo solto.
 */
export function VideoDoPost({ url, titulo }: { url: string; titulo?: string }) {
  const [tocando, setTocando] = useState(false);
  const id = idDoVideoDoYoutube(url);

  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/45 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-gold"
      >
        <Video className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Assistir vídeo
      </a>
    );
  }

  if (tocando) {
    return (
      <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={enderecoParaTocar(id, true)}
          title={titulo ?? "Vídeo da Palavra do Padre"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTocando(true)}
      aria-label={titulo ? `Assistir: ${titulo}` : "Assistir ao vídeo"}
      className="group relative mt-3 block aspect-video w-full overflow-hidden rounded-lg border border-border bg-sunken"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={capaDoVideo(id)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      {/* Véu escuro para o botão de tocar ficar legível sobre qualquer capa. */}
      <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors group-hover:bg-black/35">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-lg">
          <Play className="ml-0.5 h-6 w-6 text-[#1f1f1f]" fill="currentColor" strokeWidth={0} aria-hidden />
        </span>
      </span>
    </button>
  );
}
