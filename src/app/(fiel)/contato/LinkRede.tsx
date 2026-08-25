"use client";

import type { ReactNode } from "react";
import { destinoNativo, plataformaDoNavegador, type Rede } from "@/lib/redes-sociais";

/**
 * Link que tenta abrir o app da rede social antes de cair na web.
 *
 * O href continua sendo o endereço de verdade: no computador, com o app
 * desinstalado, ou se algo aqui falhar, o caminho normal segue valendo.
 */
export function LinkRede({
  href,
  rede,
  className,
  children,
}: {
  href: string;
  rede: Rede;
  className?: string;
  children: ReactNode;
}) {
  function aoClicar(evento: React.MouseEvent<HTMLAnchorElement>) {
    const destino = destinoNativo(rede, href, plataformaDoNavegador(navigator.userAgent));
    if (!destino) return;

    evento.preventDefault();

    if (destino.tipo === "esquema") {
      // No iOS é preciso apostar e desapostar: se a tela some, o app abriu;
      // se continuamos aqui depois de um instante, ele não estava instalado.
      const paraWeb = window.setTimeout(() => {
        if (!document.hidden) window.location.href = href;
      }, 1000);
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) window.clearTimeout(paraWeb);
        },
        { once: true },
      );
    }

    window.location.href = destino.href;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={aoClicar}
      className={className}
    >
      {children}
    </a>
  );
}
