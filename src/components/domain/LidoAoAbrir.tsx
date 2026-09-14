"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { darNotificacoesPorLidasAction } from "@/server/actions/notification-read-actions";

/*
 * Marcar como lido o que a pessoa foi ver.
 *
 * Antes, o aviso só saía da lista quando a pessoa voltava às notificações e
 * tocava em "já vi" — mesmo tendo aberto o vídeo do padre e assistido
 * inteiro. Abrir onde a coisa mora é a prova de leitura que importa.
 *
 * Roda no cliente, depois da tela aparecer, e não durante o desenho dela:
 * marcar como lido é uma escrita, e escrita no meio da renderização faria a
 * tela do servidor deixar de ser cacheável.
 */

/** As telas com notificação não lida desta pessoa — ver `caminhosNaoLidos`. */
const CaminhosNaoLidos = createContext<string[]>([]);

/**
 * Dá por lida a notificação da tela aberta, em QUALQUER tela do app.
 *
 * Mora uma vez só, no layout. Antes eram seis telas com um `LidoAoAbrir`
 * cada, e todas as outras ficavam de fora: a aba Palavra, para onde vai a
 * mensagem diária do padre, e as telas das dicas — Bíblia, Agenda,
 * Família. Abrir nenhuma delas apagava a bolinha, e as bolinhas se
 * acumulavam até acender quatro das cinco abas. Um componente por tela é
 * uma lista que alguém esquece de atualizar; um no layout não tem lista.
 *
 * Só chama o servidor quando o endereço aberto TEM notificação pendente:
 * fora disso, cada troca de tela seria uma escrita inútil no banco.
 */
export function LidoAoNavegar({
  caminhos,
  children,
}: {
  caminhos: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ultimoPedido = useRef<string | null>(null);

  useEffect(() => {
    if (!caminhos.includes(pathname)) return;
    // Um pedido por situação: o modo estrito do React em desenvolvimento
    // montaria duas vezes, e a revalidação devolve a mesma lista enquanto
    // o servidor não responde.
    const chave = `${pathname}|${caminhos.join(",")}`;
    if (ultimoPedido.current === chave) return;
    ultimoPedido.current = chave;
    void darNotificacoesPorLidasAction(pathname);
  }, [pathname, caminhos]);

  return <CaminhosNaoLidos.Provider value={caminhos}>{children}</CaminhosNaoLidos.Provider>;
}

/**
 * Dá por lida a notificação de OUTRA tela quando o assunto dela aparece
 * aqui — e só quando a pessoa rola até ele.
 *
 * O caso é a Palavra do Padre no Início. A notificação leva à aba Palavra,
 * mas a mensagem inteira está no Início; quem a leu ali ficava com a
 * bolinha acesa na Palavra no dia seguinte, e no outro. E como a bolinha
 * mostra só a novidade mais recente, a mensagem diária cobriria para sempre
 * as dicas da trilha.
 *
 * Marcar ao abrir o Início seria mentir: no celular a mensagem fica uma
 * tela e meia abaixo. Por isso espera o topo dela entrar na parte de cima da
 * tela, que é quando dá para dizer que a pessoa chegou a ela.
 */
export function LidoAoVer({ caminho, children }: { caminho: string; children: React.ReactNode }) {
  const pendente = useContext(CaminhosNaoLidos).includes(caminho);
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = alvo.current;
    if (!pendente || !elemento) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        observador.disconnect();
        void darNotificacoesPorLidasAction(caminho);
      },
      // Os 40% de baixo da tela não contam: aparecer só a beirada do
      // cartão não é ter chegado à mensagem.
      { rootMargin: "0px 0px -40% 0px" },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [pendente, caminho]);

  return <div ref={alvo}>{children}</div>;
}
