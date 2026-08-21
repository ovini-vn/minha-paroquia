import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  createParishPerson,
  linkParishPersonToUser,
  listUnlinkedParishPeople,
  listMyFamilyMembers,
  getOwnFamilyMember,
  listGuardians,
  removeParishPerson,
} from "@/server/modules/family/service";
import { createGroup, enrollFamilyMember, listEnrollments } from "@/server/modules/catequese/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("catequizando sem conta no app", () => {
  let parishId: string;
  let outraParishId: string;
  let maeId: string;
  let estranhoId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const [p, outra] = await Promise.all([
      registerParish({ name: `Par Catequese ${stamp}` }),
      registerParish({ name: `Par Vizinha Cat ${stamp}` }),
    ]);
    parishId = p.id;
    outraParishId = outra.id;
    parishIds.push(p.id, outra.id);

    const [mae, estranho] = await Promise.all([
      registerUser({
        fullName: "Mãe do Aluno",
        email: `mae-cat-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Pessoa Qualquer",
        email: `estranho-cat-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    maeId = mae.id;
    estranhoId = estranho.id;
    userIds.push(mae.id, estranho.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("a secretaria cadastra o aluno sem nenhuma conta envolvida", async () => {
    const aluno = await createParishPerson(parishId, {
      fullName: "João Catequizando",
      guardianName: "Sr. José",
      guardianPhone: "(43) 99999-0000",
    });

    expect(aluno.responsibleUserId).toBeNull();
    expect(aluno.relationship).toBeNull();
    expect(aluno.guardianName).toBe("Sr. José");
  });

  it("e ele pode ser matriculado numa turma imediatamente", async () => {
    const [aluno] = await listUnlinkedParishPeople(parishId);
    const turma = await createGroup({ parishId, name: `Turma Cat ${stamp}`, year: 2026 });

    await enrollFamilyMember(parishId, turma.id, aluno!.id);

    const matriculados = await listEnrollments(parishId, turma.id);
    expect(matriculados).toHaveLength(1);
    expect(matriculados[0]?.familyMember.fullName).toBe("João Catequizando");
    // Sem responsável no app — a tela precisa aguentar isso sem quebrar.
    expect(matriculados[0]?.familyMember.responsible).toBeNull();
  });

  it("NÃO aparece em 'Minha família' de ninguém enquanto não for vinculado", async () => {
    // O ponto sensível de todo este recurso: o cadastro existe na paróquia,
    // mas não pode dar acesso a quem não é responsável. O acesso do fiel vem
    // de family_member_guardians, e a secretaria não cria nenhum.
    expect(await listMyFamilyMembers(parishId, maeId)).toHaveLength(0);
    expect(await listMyFamilyMembers(parishId, estranhoId)).toHaveLength(0);

    const [aluno] = await listUnlinkedParishPeople(parishId);
    expect(await getOwnFamilyMember(parishId, aluno!.id, maeId)).toBeNull();
    expect(await getOwnFamilyMember(parishId, aluno!.id, estranhoId)).toBeNull();
  });

  it("vincular a uma conta dá acesso — e o histórico continua o mesmo", async () => {
    const [aluno] = await listUnlinkedParishPeople(parishId);
    const alunoId = aluno!.id;
    const matriculasAntes = aluno!._count.enrollments;

    await linkParishPersonToUser(parishId, alunoId, maeId);

    // A mãe passa a enxergar.
    const daMae = await listMyFamilyMembers(parishId, maeId);
    expect(daMae.map((m) => m.id)).toContain(alunoId);

    // Vira guardiã de verdade, não só "responsável" no campo antigo.
    const guardioes = await listGuardians(parishId, alunoId);
    expect(guardioes.map((g) => g.userId)).toEqual([maeId]);

    // Ninguém mais enxerga.
    expect(await getOwnFamilyMember(parishId, alunoId, estranhoId)).toBeNull();

    // E a matrícula sobreviveu ao vínculo — nada foi recriado.
    const depois = await getOwnFamilyMember(parishId, alunoId, maeId);
    expect(depois).not.toBeNull();
    expect(matriculasAntes).toBe(1);
  });

  it("some da lista de pendentes depois de vinculado", async () => {
    expect(await listUnlinkedParishPeople(parishId)).toHaveLength(0);
  });

  it("a secretaria não exclui cadastro que já tem responsável no app", async () => {
    const daMae = await listMyFamilyMembers(parishId, maeId);
    await expect(removeParishPerson(parishId, daMae[0]!.id)).rejects.toThrow(/responsável no app/i);
  });

  it("não exclui quem está matriculado", async () => {
    const aluno = await createParishPerson(parishId, { fullName: "Aluno Matriculado" });
    const turma = await createGroup({ parishId, name: `Turma Del ${stamp}`, year: 2026 });
    await enrollFamilyMember(parishId, turma.id, aluno.id);

    await expect(removeParishPerson(parishId, aluno.id)).rejects.toThrow(/matriculad/i);
  });

  it("exclui cadastro solto, sem vínculo nem matrícula", async () => {
    const solto = await createParishPerson(parishId, { fullName: "Cadastro Errado" });
    await removeParishPerson(parishId, solto.id);

    const restantes = await listUnlinkedParishPeople(parishId);
    expect(restantes.some((p) => p.id === solto.id)).toBe(false);
  });

  it("cadastro de uma paróquia não aparece na outra", async () => {
    expect(await listUnlinkedParishPeople(outraParishId)).toHaveLength(0);
  });
});
