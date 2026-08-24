import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, findMemberByExactName } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Vincular alguém exige saber o NOME COMPLETO.
 *
 * Antes, a tela de família entregava a qualquer pessoa logada a lista de
 * todos os membros da paróquia — o cadastro de quem frequenta virava
 * informação disponível a quem entrasse. Estes testes garantem que a busca
 * não pode ser usada para descobrir nomes.
 */
describe("vincular pessoa pelo nome completo", () => {
  let parishId: string;
  let outraParishId: string;
  let parocoId: string;
  let joseId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [p, outra] = await Promise.all([
      registerParish({ name: `Par Busca ${stamp}` }),
      registerParish({ name: `Par Outra Busca ${stamp}` }),
    ]);
    parishId = p.id;
    outraParishId = outra.id;
    parishIds.push(p.id, outra.id);

    const [paroco, jose, homonimo1, homonimo2, deOutra] = await Promise.all([
      registerUser({
        fullName: "Pe. Busca",
        email: `paroco-b-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "José da Silva Pereira",
        email: `jose-b-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Maria Souza",
        email: `maria1-b-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Maria Souza",
        email: `maria2-b-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Ana Vizinha Lima",
        email: `ana-b-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    joseId = jose.id;
    userIds.push(paroco.id, jose.id, homonimo1.id, homonimo2.id, deOutra.id);

    for (const userId of [parocoId, joseId, homonimo1.id, homonimo2.id]) {
      const convite = await createInvitation({ parishId, createdBy: parocoId, type: "link", role: "FIEL" });
      await acceptInvitation({ code: convite.code, userId });
    }
    const conviteOutra = await createInvitation({
      parishId: outraParishId,
      createdBy: deOutra.id,
      type: "link",
      role: "FIEL",
    });
    await acceptInvitation({ code: conviteOutra.code, userId: deOutra.id });
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("acha quem tem o nome completo exato", async () => {
    const r = await findMemberByExactName(parishId, "José da Silva Pereira");
    expect(r.situacao).toBe("encontrado");
    if (r.situacao === "encontrado") expect(r.userId).toBe(joseId);
  });

  it("ignora acento, caixa e espaço sobrando — mas não o conteúdo", async () => {
    // Digitar sem acento no celular é comum; não pode ser motivo de falha.
    const r = await findMemberByExactName(parishId, "  jose DA silva   pereira ");
    expect(r.situacao).toBe("encontrado");
  });

  it("NÃO acha por parte do nome — é o que impede varredura", async () => {
    // Se "José" bastasse, o campo viraria um jeito de descobrir quem
    // frequenta a paróquia, testando nomes comuns.
    for (const tentativa of ["José", "José da Silva", "Silva Pereira", "Pereira"]) {
      expect((await findMemberByExactName(parishId, tentativa)).situacao).toBe("nao_encontrado");
    }
  });

  it("recusa nome sem sobrenome, mesmo que exista alguém assim", async () => {
    expect((await findMemberByExactName(parishId, "Maria")).situacao).toBe("nao_encontrado");
    expect((await findMemberByExactName(parishId, "ana")).situacao).toBe("nao_encontrado");
  });

  it("nome repetido devolve ambíguo em vez de escolher um", async () => {
    // Vincular a pessoa errada a uma criança é pior do que pedir ajuda.
    expect((await findMemberByExactName(parishId, "Maria Souza")).situacao).toBe("ambiguo");
  });

  it("não enxerga quem é de outra paróquia", async () => {
    expect((await findMemberByExactName(parishId, "Ana Vizinha Lima")).situacao).toBe(
      "nao_encontrado",
    );
    // E na paróquia dela, acha.
    expect((await findMemberByExactName(outraParishId, "Ana Vizinha Lima")).situacao).toBe(
      "encontrado",
    );
  });

  it("não devolve NADA além do necessário para vincular", async () => {
    const r = await findMemberByExactName(parishId, "José da Silva Pereira");
    // Sem e-mail, sem telefone, sem papel: só o que serve para criar o
    // vínculo e confirmar na tela que foi a pessoa certa.
    expect(Object.keys(r).sort()).toEqual(["fullName", "situacao", "userId"]);
  });
});
