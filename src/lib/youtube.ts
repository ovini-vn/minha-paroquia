/**
 * Reconhece um vídeo do YouTube a partir do endereço colado.
 *
 * O padre cola o link de onde estiver: do navegador do computador
 * (`youtube.com/watch?v=`), do botão compartilhar do celular
 * (`youtu.be/`), de um Short, de uma transmissão ao vivo. Todos levam ao
 * mesmo vídeo, e todos precisam funcionar — quem cola não sabe (nem
 * deveria saber) que existe diferença.
 *
 * Endereço que não for do YouTube devolve null: a tela cai no link comum,
 * que é o que já acontecia.
 */

/** 11 caracteres do alfabeto que o YouTube usa em identificador de vídeo. */
const ID_VALIDO = /^[A-Za-z0-9_-]{11}$/;

const CAMINHOS_COM_ID = ["/embed/", "/shorts/", "/live/", "/v/"];

export function idDoVideoDoYoutube(url: string): string | null {
  let endereco: URL;
  try {
    endereco = new URL(url.trim());
  } catch {
    return null;
  }

  if (endereco.protocol !== "http:" && endereco.protocol !== "https:") return null;

  const host = endereco.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");

  // youtu.be/ID — o link do botão compartilhar.
  if (host === "youtu.be") {
    const id = endereco.pathname.slice(1).split("/")[0] ?? "";
    return ID_VALIDO.test(id) ? id : null;
  }

  const ehYoutube =
    host === "youtube.com" || host === "youtube-nocookie.com" || host.endsWith(".youtube.com");
  if (!ehYoutube) return null;

  // youtube.com/watch?v=ID
  const doParametro = endereco.searchParams.get("v");
  if (doParametro && ID_VALIDO.test(doParametro)) return doParametro;

  // youtube.com/embed/ID, /shorts/ID, /live/ID
  for (const prefixo of CAMINHOS_COM_ID) {
    if (endereco.pathname.startsWith(prefixo)) {
      const id = endereco.pathname.slice(prefixo.length).split("/")[0] ?? "";
      return ID_VALIDO.test(id) ? id : null;
    }
  }

  return null;
}

/**
 * Capa do vídeo.
 *
 * `hqdefault` porque ela SEMPRE existe: `maxresdefault` falta em vídeo
 * antigo ou de baixa resolução, e aí a capa vem quebrada. Ela é 4:3 —
 * exibida com recorte, as bordas pretas somem.
 */
export function capaDoVideo(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Endereço para tocar dentro do aplicativo.
 *
 * `youtube-nocookie.com` é o domínio que o próprio YouTube publica para
 * incorporação sem cookie de rastreio até que o vídeo comece. Num aplicativo
 * de paróquia, onde a política de privacidade promete não ter rastreador de
 * terceiros, é o mínimo.
 */
export function enderecoParaTocar(id: string, autoplay = false): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
