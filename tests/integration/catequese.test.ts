import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createFamilyMember } from "@/server/modules/family/service";
import {
  createGroup,
  enrollFamilyMember,
  getGroup,
  recordAttendance,
  createSession,
} from "@/server/modules/catequese/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("catequese: matrícula, presença e escopo de catequista", () => {
  let parishId: string;
  let responsibleId: string;
  let catechistAId: string;
  let catechistBId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Catequese ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const responsible = await registerUser({
      fullName: "Responsável Teste",
      email: `responsavel-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const catechistA = await registerUser({
      fullName: "Catequista A",
      email: `catequista-a-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const catechistB = await registerUser({
      fullName: "Catequista B",
      email: `catequista-b-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    responsibleId = responsible.id;
    catechistAId = catechistA.id;
    catechistBId = catechistB.id;
    userIds.push(responsible.id, catechistA.id, catechistB.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("rejeita matricular o mesmo dependente duas vezes na mesma turma", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: responsibleId,
      fullName: "Criança Teste",
      relationship: "filho",
    });
    const group = await createGroup({ parishId, name: "Turma Teste", year: 2026, catechistUserId: catechistAId });

    await enrollFamilyMember(parishId, group.id, child.id);
    await expect(enrollFamilyMember(parishId, group.id, child.id)).rejects.toThrow();
  });

  it("um catequista não enxerga nem cria encontro numa turma de outro catequista", async () => {
    const group = await createGroup({ parishId, name: "Turma da Catequista A", year: 2026, catechistUserId: catechistAId });

    const asOwnCatechist = await getGroup(parishId, group.id, catechistAId);
    const asOtherCatechist = await getGroup(parishId, group.id, catechistBId);
    expect(asOwnCatechist).not.toBeNull();
    expect(asOtherCatechist).toBeNull();

    await expect(
      createSession(parishId, group.id, { date: new Date() }, catechistBId),
    ).rejects.toThrow();
    await expect(createSession(parishId, group.id, { date: new Date() }, catechistAId)).resolves.toBeDefined();
  });

  it("registrar presença duas vezes para o mesmo encontro atualiza em vez de duplicar", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: responsibleId,
      fullName: "Outra Criança",
      relationship: "filha",
    });
    const group = await createGroup({ parishId, name: "Turma Presença", year: 2026 });
    const enrollment = await enrollFamilyMember(parishId, group.id, child.id);
    const session = await createSession(parishId, group.id, { date: new Date() });

    await recordAttendance(parishId, session.id, [{ enrollmentId: enrollment.id, present: true }]);
    const updated = await recordAttendance(parishId, session.id, [
      { enrollmentId: enrollment.id, present: false },
    ]);

    expect(updated).toHaveLength(1);
    expect(updated[0]!.present).toBe(false);
  });
});
