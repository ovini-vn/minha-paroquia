import { describe, expect, it } from "vitest";
import { resolverParoco, assinaturaDoPost } from "@/server/modules/parishes/paroco";

const vazio = {
  parocoNome: null,
  parocoTitulo: null,
  parocoHistoria: null,
  parocoFotoUrl: null,
};

const registrado = {
  id: "perfil-1",
  title: "Pároco",
  photoUrl: "https://exemplo.org/conta.jpg",
  user: { fullName: "Pe. Antônio Silva", photoUrl: null },
};

describe("quem a comunidade vê como pároco", () => {
  it("sem conta e sem nome digitado, não há o que mostrar", () => {
    expect(resolverParoco(vazio, null)).toBeNull();
  });

  it("o nome digitado basta, mesmo sem ninguém cadastrado", () => {
    // É o caso comum: o padre não usa o aplicativo.
    const p = resolverParoco({ ...vazio, parocoNome: "Pe. Giuliano Sincini" }, null);
    expect(p?.nome).toBe("Pe. Giuliano Sincini");
    expect(p?.titulo).toBe("Pároco");
  });

  it("sem nome digitado, usa a conta de quem tem o papel de Pároco", () => {
    const p = resolverParoco(vazio, registrado);
    expect(p?.nome).toBe("Pe. Antônio Silva");
    expect(p?.fotoUrl).toBe("https://exemplo.org/conta.jpg");
  });

  it("o nome digitado GANHA do nome da conta", () => {
    // O administrador da ferramenta pode ter o papel de Pároco por questão
    // de acesso, sem ser o pároco. Quem digitou o nome sabe quem ele é.
    const p = resolverParoco({ ...vazio, parocoNome: "Pe. Thiago Rodrigues" }, registrado);
    expect(p?.nome).toBe("Pe. Thiago Rodrigues");
  });

  it("só dá para agendar quando a pessoa exibida é a da conta", () => {
    expect(resolverParoco(vazio, registrado)?.priestProfileId).toBe("perfil-1");
    // Nome digitado: essa pessoa não tem agenda no aplicativo, e o botão
    // levaria a um lugar que não é dela.
    expect(
      resolverParoco({ ...vazio, parocoNome: "Pe. Outro" }, registrado)?.priestProfileId,
    ).toBeNull();
    expect(resolverParoco({ ...vazio, parocoNome: "Pe. Outro" }, null)?.priestProfileId).toBeNull();
  });

  it("a foto da conta não vaza para o nome digitado", () => {
    const p = resolverParoco({ ...vazio, parocoNome: "Pe. Outro" }, registrado);
    expect(p?.fotoUrl).toBeNull();
  });

  it("o que a paróquia cadastrou ganha do que está na conta", () => {
    const p = resolverParoco(
      { ...vazio, parocoTitulo: "Administrador paroquial", parocoFotoUrl: "https://x.org/p.jpg" },
      registrado,
    );
    expect(p?.titulo).toBe("Administrador paroquial");
    expect(p?.fotoUrl).toBe("https://x.org/p.jpg");
    // Continua sendo a pessoa da conta, então o atendimento segue possível.
    expect(p?.priestProfileId).toBe("perfil-1");
  });

  it("espaço em branco não conta como nome digitado", () => {
    const p = resolverParoco({ ...vazio, parocoNome: "   " }, registrado);
    expect(p?.nome).toBe("Pe. Antônio Silva");
    expect(p?.priestProfileId).toBe("perfil-1");
  });
});

describe("quem assina a Palavra do Padre", () => {
  const autor = { id: "perfil-1", title: "Pároco", user: { fullName: "Vinicius Almeida" } };
  const outroSacerdote = { id: "perfil-2", title: "Vigário", user: { fullName: "Pe. Marcos" } };

  it("assina com o nome do pároco quando o post sai da conta dele", () => {
    // O administrador publica em nome do pároco; assinar com o nome da conta
    // diria ao fiel que outra pessoa escreveu.
    const paroco = resolverParoco(
      { parocoNome: "Pe. Sandro", parocoTitulo: null, parocoHistoria: null, parocoFotoUrl: null },
      { id: "perfil-1", title: "Pároco", photoUrl: null, user: { fullName: "Vinicius Almeida", photoUrl: null } },
    );
    expect(assinaturaDoPost(autor, paroco)).toEqual({ nome: "Pe. Sandro", titulo: "Pároco" });
  });

  it("não mexe no post de outro sacerdote", () => {
    const paroco = resolverParoco(
      { parocoNome: "Pe. Sandro", parocoTitulo: null, parocoHistoria: null, parocoFotoUrl: null },
      { id: "perfil-1", title: "Pároco", photoUrl: null, user: { fullName: "Vinicius Almeida", photoUrl: null } },
    );
    expect(assinaturaDoPost(outroSacerdote, paroco)).toEqual({
      nome: "Pe. Marcos",
      titulo: "Vigário",
    });
  });

  it("sem pároco cadastrado, assina com a conta mesmo", () => {
    expect(assinaturaDoPost(autor, null)).toEqual({
      nome: "Vinicius Almeida",
      titulo: "Pároco",
    });
  });

  it("o título também vem do cadastro da paróquia", () => {
    const paroco = resolverParoco(
      { parocoNome: "Pe. Sandro", parocoTitulo: "Administrador paroquial", parocoHistoria: null, parocoFotoUrl: null },
      { id: "perfil-1", title: "Pároco", photoUrl: null, user: { fullName: "Vinicius Almeida", photoUrl: null } },
    );
    expect(assinaturaDoPost(autor, paroco).titulo).toBe("Administrador paroquial");
  });
});
