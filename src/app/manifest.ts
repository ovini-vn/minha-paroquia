import type { MetadataRoute } from "next";

/**
 * Manifest do app instalável (PWA).
 *
 * Não é enfeite nem preparação para o futuro: no iPhone, notificação com o
 * app fechado SÓ funciona depois que a pessoa adiciona o site à Tela de
 * Início, e é este arquivo que faz o atalho virar app de verdade em vez de
 * um favorito do Safari. Sem ele, o lembrete de compromisso não chega em
 * nenhum iPhone.
 *
 * É também o pré-requisito de empacotar para a Play Store (TWA) no dia em
 * que isso fizer sentido.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Paróquia",
    // Fica embaixo do ícone, onde cabem ~12 caracteres. "Minha Paróquia"
    // seria cortado no meio da palavra; no celular da pessoa, que só tem a
    // paróquia dela, "Paróquia" se entende sozinho.
    short_name: "Paróquia",
    description: "A vida da sua comunidade: celebrações, avisos, escalas e serviço.",
    lang: "pt-BR",
    dir: "ltr",

    // Abre direto no app, não na página de apresentação. Quem ainda não
    // entrou cai no login a partir daqui mesmo.
    start_url: "/inicio",
    scope: "/",
    display: "standalone",

    // Marfim é a cor da tela de abertura; o violeta é o topo do gradiente
    // do cabeçalho, para a barra de status emendar com ele sem faixa.
    background_color: "#f8f6f1",
    theme_color: "#5b2890",

    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // O "maskable" é uma arte separada de propósito: o Android recorta o
      // ícone no formato dele, e o emblema aqui vem menor para sobreviver
      // ao corte.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
