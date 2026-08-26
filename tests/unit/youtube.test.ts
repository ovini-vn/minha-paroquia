import { describe, expect, it } from "vitest";
import { idDoVideoDoYoutube, capaDoVideo, enderecoParaTocar } from "@/lib/youtube";

const ID = "dQw4w9WgXcQ";

/**
 * O padre cola o link de onde estiver. Todos levam ao mesmo vídeo, e quem
 * cola não sabe (nem deveria saber) que existe diferença entre eles.
 */
describe("reconhecer o vídeo do YouTube", () => {
  it("aceita o endereço do navegador", () => {
    expect(idDoVideoDoYoutube(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("aceita o link curto do botão compartilhar", () => {
    expect(idDoVideoDoYoutube(`https://youtu.be/${ID}`)).toBe(ID);
    // O compartilhar do celular gruda o instante em que a pessoa estava.
    expect(idDoVideoDoYoutube(`https://youtu.be/${ID}?t=42`)).toBe(ID);
  });

  it("aceita Short, transmissão e incorporação", () => {
    expect(idDoVideoDoYoutube(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(idDoVideoDoYoutube(`https://www.youtube.com/live/${ID}`)).toBe(ID);
    expect(idDoVideoDoYoutube(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
  });

  it("aceita m.youtube.com, que é o que o celular abre", () => {
    expect(idDoVideoDoYoutube(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("ignora o resto da bagunça que vem junto no link", () => {
    expect(
      idDoVideoDoYoutube(`https://www.youtube.com/watch?v=${ID}&list=PLabc&index=3&t=10s`),
    ).toBe(ID);
  });

  it("endereço de outro site devolve null — a tela cai no link comum", () => {
    // Vimeo, Facebook, um arquivo mp4: continuam abrindo fora, como antes.
    expect(idDoVideoDoYoutube("https://vimeo.com/123456")).toBeNull();
    expect(idDoVideoDoYoutube("https://exemplo.org/missa.mp4")).toBeNull();
  });

  it("não se deixa enganar por domínio parecido", () => {
    // "youtube.com.br.site-falso.net" não é o YouTube.
    expect(idDoVideoDoYoutube(`https://youtube.com.site-falso.net/watch?v=${ID}`)).toBeNull();
    expect(idDoVideoDoYoutube(`https://naoyoutube.com/watch?v=${ID}`)).toBeNull();
  });

  it("recusa identificador com tamanho errado", () => {
    expect(idDoVideoDoYoutube("https://youtu.be/curto")).toBeNull();
    expect(idDoVideoDoYoutube("https://www.youtube.com/watch?v=aaaaaaaaaaaaaaaa")).toBeNull();
  });

  it("texto que nem é endereço não quebra", () => {
    expect(idDoVideoDoYoutube("não é link")).toBeNull();
    expect(idDoVideoDoYoutube("")).toBeNull();
    expect(idDoVideoDoYoutube("javascript:alert(1)")).toBeNull();
  });
});

describe("como o vídeo entra na tela", () => {
  it("a capa usa hqdefault, que sempre existe", () => {
    // maxresdefault falta em vídeo antigo, e aí a capa viria quebrada.
    expect(capaDoVideo(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });

  it("toca pelo domínio sem cookie de rastreio", () => {
    const url = enderecoParaTocar(ID);
    expect(url).toContain("youtube-nocookie.com/embed/");
    expect(url).toContain("rel=0");
    expect(url).not.toContain("autoplay");
  });

  it("com autoplay quando a pessoa já clicou para assistir", () => {
    expect(enderecoParaTocar(ID, true)).toContain("autoplay=1");
  });
});
