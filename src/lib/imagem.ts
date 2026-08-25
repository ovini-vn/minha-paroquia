/**
 * As regras de imagem, num lugar só.
 *
 * O navegador precisa das mesmas que o servidor: sem checar antes de enviar,
 * um arquivo grande demais vira uma requisição recusada pela plataforma —
 * um 413 que nunca chega no nosso código e aparece como tela branca.
 * O servidor continua sendo quem decide; isto aqui é só cortesia.
 */

export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

/**
 * SVG fica de fora: é XML, pode carregar script, e seria servido do nosso
 * domínio.
 */
export const TIPOS_DE_IMAGEM_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const ACCEPT_DE_IMAGEM = TIPOS_DE_IMAGEM_ACEITOS.join(",");

/** Mensagem do que está errado com o arquivo, ou null se estiver tudo bem. */
export function problemaComImagem(arquivo: { size: number; type: string }): string | null {
  if (arquivo.size === 0) return "O arquivo chegou vazio. Tente escolher a imagem de novo.";
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1).replace(".", ",");
    return `A imagem tem ${mb} MB e o limite é 5 MB. Tire uma foto menor ou reduza antes de enviar.`;
  }
  if (!TIPOS_DE_IMAGEM_ACEITOS.includes(arquivo.type)) {
    return "Formato não aceito. Envie uma imagem JPG, PNG, WEBP, GIF ou AVIF.";
  }
  return null;
}
