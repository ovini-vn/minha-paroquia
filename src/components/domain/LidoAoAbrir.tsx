"use client";

import { useEffect, useRef } from "react";
import { darNotificacoesPorLidasAction } from "@/server/actions/notification-read-actions";

/**
 * Marca como lidas as notificações desta tela, ao abri-la.
 *
 * Antes, o aviso só saía da lista quando a pessoa voltava às notificações e
 * tocava em "já vi" — mesmo tendo aberto o vídeo do padre e assistido
 * inteiro. Abrir onde a coisa mora é a prova de leitura que importa.
 *
 * Roda no cliente, depois da tela aparecer, e não durante o desenho dela:
 * marcar como lido é uma escrita, e escrita no meio da renderização faria a
 * tela do servidor deixar de ser cacheável — além de disparar de novo a
 * cada nova tentativa de desenho.
 */
export function LidoAoAbrir({ caminho }: { caminho: string }) {
  const jaAvisou = useRef(false);

  useEffect(() => {
    // Uma vez por montagem: sem isso, o modo estrito do React em
    // desenvolvimento dispararia duas escritas para cada abertura.
    if (jaAvisou.current) return;
    jaAvisou.current = true;
    void darNotificacoesPorLidasAction(caminho);
  }, [caminho]);

  return null;
}
