"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Rola um trecho recém-aberto para dentro da tela.
 *
 * Existe por um defeito medido em 29/08, com o app em modo de produção, nas
 * duas telas que escondem o formulário de senha atrás de um botão. O
 * formulário abre ABAIXO do botão e a página não rolava sozinha:
 *
 *   tela                       login                    cadastro
 *   375x812 (iPhone atual)     tudo visível             botão de enviar fora
 *   375x667 (iPhone SE/8)      botão "Entrar" fora      senha e botão fora
 *   360x640 (Android antigo)   e-mail e botão fora      senha e botão fora
 *
 * Ou seja: em aparelho pequeno, tocar em "Entrar com e-mail e senha" parecia
 * NÃO FAZER NADA. E aparelho pequeno e antigo é justamente o de quem tem
 * mais dificuldade — o público que este app existe para alcançar.
 *
 * `nearest` e não `start`: rola o mínimo necessário. Com o formulário
 * inteiro cabendo, ele encosta a base na tela e o cabeçalho da marca
 * continua à vista; `start` jogaria o cartão para o topo sem precisar.
 *
 * "O mínimo necessário" encosta LITERALMENTE: medido, o botão de enviar do
 * cadastro parava em 596–640 numa tela de 640, sem um pixel de folga, onde
 * a barra de baixo do navegador costuma passar por cima. Por isso quem usa
 * o gancho põe `scroll-mb-6` no elemento — `scrollIntoView` respeita
 * `scroll-margin`, e a folga fica declarada no CSS, junto do resto do
 * espaçamento, em vez de virar número mágico aqui dentro.
 *
 * O foco NÃO é movido, de propósito. O controle é um botão de revelar, e o
 * padrão dele é o foco continuar onde está — a próxima tabulação já cai no
 * primeiro campo, que vem logo depois no documento. Mover o foco ainda
 * abriria o teclado do celular por conta própria, comendo o espaço que a
 * rolagem acabou de ganhar.
 */
export function useRolarAoAbrir<T extends HTMLElement>(aberto: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!aberto) return;
    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: semAnimacao ? "auto" : "smooth" });
  }, [aberto]);

  return ref;
}
