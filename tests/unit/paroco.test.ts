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
    expect(assinaturaDoPost(autor, paroco)).toEqual({
      nome: "Pe. Sandro",
      titulo: "Pároco",
      fotoUrl: null,
    });
  });

  it("não mexe no post de outro sacerdote", () => {
    const paroco = resolverParoco(
      { parocoNome: "Pe. Sandro", parocoTitulo: null, parocoHistoria: null, parocoFotoUrl: null },
      { id: "perfil-1", title: "Pároco", photoUrl: null, user: { fullName: "Vinicius Almeida", photoUrl: null } },
    );
    expect(assinaturaDoPost(outroSacerdote, paroco)).toEqual({
      nome: "Pe. Marcos",
      titulo: "Vigário",
      fotoUrl: null,
    });
  });

  it("sem pároco cadastrado, assina com a conta mesmo", () => {
    expect(assinaturaDoPost(autor, null)).toEqual({
      nome: "Vinicius Almeida",
      titulo: "Pároco",
      fotoUrl: null,
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

describe("post publicado por quem não é clero", () => {
  const comParoco = resolverParoco(
    { parocoNome: "Pe. Sandro", parocoTitulo: null, parocoHistoria: null, parocoFotoUrl: null },
    null,
  );

  it("assina com o pároco da paróquia", () => {
    // A secretaria publica; a palavra é do pároco.
    expect(assinaturaDoPost(null, comParoco)).toEqual({
      nome: "Pe. Sandro",
      titulo: "Pároco",
      fotoUrl: null,
    });
  });

  it("sem pároco cadastrado, assina como a paróquia — nunca com nome inventado", () => {
    expect(assinaturaDoPost(null, null)).toEqual({
      nome: "Paróquia",
      titulo: "Palavra do Padre",
      fotoUrl: null,
    });
  });
});

describe("o rosto que assina", () => {
  const contaDoAdmin = {
    id: "perfil-1",
    title: "Pároco",
    photoUrl: "https://exemplo.org/quem-operou.jpg",
    user: { fullName: "Vinicius Almeida", photoUrl: null },
  };

  it("usa a foto cadastrada em Nosso Pároco, não a da conta que publicou", () => {
    // Quem opera a ferramenta pode não ser o padre — e é o rosto dele que a
    // comunidade precisa reconhecer na mensagem.
    const paroco = resolverParoco(
      {
        parocoNome: "Pe. Sandro",
        parocoTitulo: null,
        parocoHistoria: null,
        parocoFotoUrl: "https://exemplo.org/o-padre.jpg",
      },
      { id: "perfil-1", title: "Pároco", photoUrl: null, user: { fullName: "Vinicius Almeida", photoUrl: null } },
    );

    expect(assinaturaDoPost(contaDoAdmin, paroco).fotoUrl).toBe("https://exemplo.org/o-padre.jpg");
  });

  it("outro sacerdote assina com a foto da própria conta", () => {
    const outro = {
      id: "perfil-2",
      title: "Vigário",
      photoUrl: "https://exemplo.org/vigario.jpg",
      user: { fullName: "Pe. Marcos", photoUrl: null },
    };
    expect(assinaturaDoPost(outro, null).fotoUrl).toBe("https://exemplo.org/vigario.jpg");
  });

  it("sem perfil de sacerdote, cai na foto do usuário", () => {
    const semPerfil = {
      id: "perfil-3",
      title: "Sacerdote",
      photoUrl: null,
      user: { fullName: "Pe. Ana", photoUrl: "https://exemplo.org/conta.jpg" },
    };
    expect(assinaturaDoPost(semPerfil, null).fotoUrl).toBe("https://exemplo.org/conta.jpg");
  });

  it("sem foto em lugar nenhum, devolve null e a tela mostra as iniciais", () => {
    expect(assinaturaDoPost(null, null).fotoUrl).toBeNull();
  });
});
