import { describe, expect, it } from "vitest";
import { destinoNativo, usuarioDe, plataformaDoNavegador } from "@/lib/redes-sociais";

const INSTA = "https://instagram.com/paroquiasaojoao";
const FACE = "https://facebook.com/paroquiasaojoao";

describe("abrir o app da rede social", () => {
  it("tira o @ do endereço, com ou sem barra no fim", () => {
    expect(usuarioDe(INSTA)).toBe("paroquiasaojoao");
    expect(usuarioDe("https://www.instagram.com/paroquia.sao_joao/")).toBe("paroquia.sao_joao");
  });

  it("desiste de endereços que não apontam para um perfil", () => {
    expect(usuarioDe("https://instagram.com")).toBeNull();
    expect(usuarioDe("nem url é")).toBeNull();
    // Nome com caractere fora do padrão: melhor seguir o link normal do que
    // montar um esquema torto.
    expect(usuarioDe("https://instagram.com/nome com espaço")).toBeNull();
  });

  it("no Android manda um intent que já carrega o plano B", () => {
    const d = destinoNativo("instagram", INSTA, "android");
    expect(d?.tipo).toBe("intent");
    expect(d?.href).toContain("package=com.instagram.android");
    // É isto que dispensa o timer: sem o app, o próprio Android abre a web.
    expect(d?.href).toContain(`S.browser_fallback_url=${encodeURIComponent(INSTA)}`);
  });

  it("no iOS manda o esquema do Instagram", () => {
    expect(destinoNativo("instagram", INSTA, "ios")).toEqual({
      tipo: "esquema",
      href: "instagram://user?username=paroquiasaojoao",
    });
  });

  it("no iOS não tenta o Facebook: o esquema pede um ID que não temos", () => {
    // Chutar renderia um alerta de "não foi possível abrir" — pior que a web.
    expect(destinoNativo("facebook", FACE, "ios")).toBeNull();
    expect(destinoNativo("facebook", FACE, "android")?.tipo).toBe("intent");
  });

  it("no computador não tenta nada", () => {
    expect(destinoNativo("instagram", INSTA, "outra")).toBeNull();
  });

  it("reconhece a plataforma pelo user agent", () => {
    expect(plataformaDoNavegador("Mozilla/5.0 (Linux; Android 14; SM-A155M)")).toBe("android");
    expect(plataformaDoNavegador("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)")).toBe("ios");
    expect(plataformaDoNavegador("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("outra");
  });
});
