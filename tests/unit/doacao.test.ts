import { describe, expect, it } from "vitest";
import { destinoDoDizimo, iconeDeDoacao, ICONES_DE_DOACAO } from "@/lib/doacao";

describe("ícone escolhido pela paróquia", () => {
  it("devolve o ícone do catálogo", () => {
    expect(iconeDeDoacao("catequese")).toBe(ICONES_DE_DOACAO.catequese.componente);
  });

  it("chave desconhecida cai no padrão em vez de quebrar a tela", () => {
    // O valor vem do banco; um ícone removido da biblioteca não pode
    // derrubar a página de doação inteira.
    expect(iconeDeDoacao("nao-existe")).toBe(ICONES_DE_DOACAO.igreja.componente);
    expect(iconeDeDoacao("")).toBe(ICONES_DE_DOACAO.igreja.componente);
  });
});

describe("para onde leva o botão do dízimo", () => {
  const paroquia = "Paróquia Nossa Senhora de Fátima";

  it("WhatsApp abre com a mensagem já escrita", () => {
    const d = destinoDoDizimo("whatsapp", "(43) 99999-0000", paroquia);
    expect(d?.href).toContain("https://wa.me/5543999990000");
    expect(decodeURIComponent(d!.href)).toContain("me tornar dizimista");
    expect(d?.externo).toBe(true);
  });

  it("não repete o 55 quando o número já tem", () => {
    expect(destinoDoDizimo("whatsapp", "5543999990000", paroquia)?.href).toContain(
      "wa.me/5543999990000",
    );
  });

  it("o caminho interno leva ao registro de dízimo que já existe", () => {
    // Dízimo já era um registro de participação por período; o convite
    // aponta para ele em vez de criar outra tela.
    expect(destinoDoDizimo("interno", null, paroquia)).toEqual({
      href: "/eu/dizimo",
      externo: false,
    });
  });

  it("link precisa ser endereço completo", () => {
    expect(destinoDoDizimo("link", "https://paroquia.org/dizimo", paroquia)?.href).toBe(
      "https://paroquia.org/dizimo",
    );
    expect(destinoDoDizimo("link", "paroquia.org/dizimo", paroquia)).toBeNull();
  });

  it("destino escolhido mas vazio não vira botão", () => {
    // Botão que não leva a lugar nenhum é pior que botão nenhum.
    expect(destinoDoDizimo("whatsapp", "", paroquia)).toBeNull();
    expect(destinoDoDizimo("whatsapp", "1234", paroquia)).toBeNull();
    expect(destinoDoDizimo("link", "   ", paroquia)).toBeNull();
    expect(destinoDoDizimo(null, "qualquer coisa", paroquia)).toBeNull();
  });
});
