import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, listActiveMembers, changeMemberRole } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { listPriests } from "@/server/modules/priests/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("troca de papel de um membro", () => {
  let parishId: string;
  let parocoId: string;
  let fielId: string;
  let outroParocoId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  async function papelDe(userId: string) {
    const membros = await listActiveMembers(parishId);
    return membros.find((m) => m.user.id === userId)?.role.code;
  }

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Par Papeis ${stamp}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const [paroco, fiel, outro] = await Promise.all([
      registerUser({
        fullName: "Pe. Titular",
        email: `paroco-p-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Fiel Comum",
        email: `fiel-p-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Pe. Auxiliar",
        email: `paroco2-p-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    fielId = fiel.id;
    outroParocoId = outro.id;
    userIds.push(paroco.id, fiel.id, outro.id);

    // Convite não oferece PAROCO de propósito (ver invitations/schema.ts):
    // até agora, pároco só nascia pelo seed. Promover pela troca de papel é
    // justamente o caminho que passou a existir.
    const c1 = await createInvitation({ parishId, createdBy: parocoId, type: "link", role: "SACERDOTE" });
    await acceptInvitation({ code: c1.code, userId: parocoId });
    const c2 = await createInvitation({ parishId, createdBy: parocoId, type: "link", role: "FIEL" });
    await acceptInvitation({ code: c2.code, userId: fielId });
    const c3 = await createInvitation({ parishId, createdBy: parocoId, type: "link", role: "FIEL" });
    await acceptInvitation({ code: c3.code, userId: outroParocoId });

    await changeMemberRole(parishId, parocoId, "PAROCO", fielId);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("um fiel vira catequista — o que antes era impossível", async () => {
    expect(await papelDe(fielId)).toBe("FIEL");

    await changeMemberRole(parishId, fielId, "CATEQUISTA", parocoId);

    expect(await papelDe(fielId)).toBe("CATEQUISTA");
  });

  it("e passa a aparecer na lista de catequistas por papel", async () => {
    // É por aqui que o formulário de turma monta o seletor de catequista.
    // Delegar permissão avulsa não fazia a pessoa aparecer aqui.
    const membros = await listActiveMembers(parishId);
    const catequistas = membros.filter((m) => m.role.code === "CATEQUISTA");
    expect(catequistas.map((m) => m.user.id)).toContain(fielId);
  });

  it("ninguém altera o próprio papel", async () => {
    // Um pároco distraído se rebaixaria a fiel e perderia o acesso à tela
    // que desfaria o engano.
    await expect(changeMemberRole(parishId, parocoId, "FIEL", parocoId)).rejects.toThrow(/próprio papel/i);
    expect(await papelDe(parocoId)).toBe("PAROCO");
  });

  it("não deixa a paróquia sem ninguém que administre", async () => {
    // Secretaria administra o dia a dia, mas não mexe nos papéis dos
    // outros: a paróquia ficaria sem quem desfizesse a mudança.
    await expect(changeMemberRole(parishId, parocoId, "SECRETARIA", fielId)).rejects.toThrow(
      /única conta que administra/i,
    );
  });

  it("mas o pároco PODE virar Administrador da paróquia", async () => {
    // Pároco é o cargo eclesial; administrador é quem opera a ferramenta.
    // O papel novo carrega os mesmos poderes, então ninguém fica sem
    // comando — e é isto que a guarda antiga impedia.
    await changeMemberRole(parishId, parocoId, "ADMINISTRADOR_PAROQUIAL", fielId);
    expect(await papelDe(parocoId)).toBe("ADMINISTRADOR_PAROQUIAL");

    // E deixa de ser clero: sai da lista de sacerdotes.
    const perfis = await listPriests(parishId);
    expect(perfis.some((p) => p.userId === parocoId)).toBe(false);

    await changeMemberRole(parishId, parocoId, "PAROCO", fielId);
  });

  it("virar sacerdote cria o perfil, senão o papel não serviria de nada", async () => {
    const antes = await listPriests(parishId);
    await changeMemberRole(parishId, outroParocoId, "SACERDOTE", parocoId);
    const depois = await listPriests(parishId);

    expect(depois.length).toBe(antes.length + 1);
    expect(depois.some((p) => p.userId === outroParocoId)).toBe(true);
  });

  it("deixar de ser sacerdote remove o perfil vazio", async () => {
    await changeMemberRole(parishId, outroParocoId, "FIEL", parocoId);
    const perfis = await listPriests(parishId);
    expect(perfis.some((p) => p.userId === outroParocoId)).toBe(false);
  });

  it("NÃO deixa rebaixar sacerdote que tem atendimento marcado", async () => {
    // appointments.priest_profile_id é onDelete Cascade: apagar o perfil
    // levaria junto os atendimentos já marcados com aquela pessoa.
    await changeMemberRole(parishId, outroParocoId, "SACERDOTE", parocoId);

    await withTenantContext(parishId, async (tx) => {
      const perfil = await tx.priestProfile.findFirstOrThrow({
        where: { parishId, userId: outroParocoId },
      });
      await tx.appointment.create({
        data: {
          parishId,
          fielUserId: fielId,
          priestProfileId: perfil.id,
          category: "conversa",
          scheduledAt: new Date("2026-12-01T14:00:00.000Z"),
          status: "confirmado",
        },
      });
    });

    // A mensagem nomeia o que trava, para quem lê saber o que resolver.
    await expect(changeMemberRole(parishId, outroParocoId, "FIEL", parocoId)).rejects.toThrow(
      /1 atendimento\(s\) marcado\(s\)/i,
    );

    // Continua sacerdote, e o atendimento segue de pé.
    expect(await papelDe(outroParocoId)).toBe("SACERDOTE");
  });

  it("NÃO deixa rebaixar sacerdote que já publicou a Palavra do Padre", async () => {
    // posts.priest_profile_id também é onDelete Cascade: a guarda contava
    // atendimentos, celebrações e sacramentos, mas esquecia os posts — e
    // mudar o papel apagava a palavra publicada, sem avisar.
    await withTenantContext(parishId, async (tx) => {
      const perfil = await tx.priestProfile.findFirstOrThrow({
        where: { parishId, userId: outroParocoId },
      });
      await tx.appointment.deleteMany({ where: { priestProfileId: perfil.id } });
      await tx.post.create({
        data: { parishId, priestProfileId: perfil.id, mediaType: "texto", contentText: "Paz e bem." },
      });
    });

    await expect(changeMemberRole(parishId, outroParocoId, "FIEL", parocoId)).rejects.toThrow(
      /Palavra do Padre/i,
    );
    expect(await papelDe(outroParocoId)).toBe("SACERDOTE");
  });

  it("recusa papel inexistente", async () => {
    await expect(changeMemberRole(parishId, fielId, "IMPERADOR", parocoId)).rejects.toThrow();
  });
});
