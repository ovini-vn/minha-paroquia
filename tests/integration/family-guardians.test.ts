import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  createFamilyMember,
  listMyFamilyMembers,
  getOwnFamilyMember,
  listGuardians,
  addGuardian,
  removeGuardian,
} from "@/server/modules/family/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("família: múltiplos vínculos simultâneos (P2)", () => {
  let parishId: string;
  let motherId: string;
  let fatherId: string;
  let strangerId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Família ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const mother = await registerUser({
      fullName: "Mãe Teste",
      email: `mae-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const father = await registerUser({
      fullName: "Pai Teste",
      email: `pai-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const stranger = await registerUser({
      fullName: "Estranho Teste",
      email: `estranho-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    motherId = mother.id;
    fatherId = father.id;
    strangerId = stranger.id;
    userIds.push(mother.id, father.id, stranger.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("quem cadastra o dependente já é automaticamente o primeiro guardião", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: motherId,
      fullName: "Filho da Mãe",
      relationship: "filho",
    });

    const guardians = await listGuardians(parishId, child.id);
    expect(guardians.map((g) => g.userId)).toEqual([motherId]);
  });

  it("um guardião pode adicionar outro, e ambos passam a enxergar o dependente", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: motherId,
      fullName: "Filho Compartilhado",
      relationship: "filho",
    });

    await addGuardian(parishId, child.id, fatherId, motherId);

    const motherView = await listMyFamilyMembers(parishId, motherId);
    const fatherView = await listMyFamilyMembers(parishId, fatherId);
    expect(motherView.some((m) => m.id === child.id)).toBe(true);
    expect(fatherView.some((m) => m.id === child.id)).toBe(true);

    const ownAsFather = await getOwnFamilyMember(parishId, child.id, fatherId);
    expect(ownAsFather).not.toBeNull();
  });

  it("quem não é guardião não pode adicionar outro guardião", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: motherId,
      fullName: "Filho Protegido",
      relationship: "filho",
    });

    await expect(addGuardian(parishId, child.id, fatherId, strangerId)).rejects.toThrow();
  });

  it("não permite remover o último guardião", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: motherId,
      fullName: "Filho Único Guardião",
      relationship: "filho",
    });

    await expect(removeGuardian(parishId, child.id, motherId, motherId)).rejects.toThrow();
  });

  it("remover um guardião (mantendo pelo menos um) tira o acesso dele ao dependente", async () => {
    const child = await createFamilyMember({
      parishId,
      responsibleUserId: motherId,
      fullName: "Filho com Dois Guardiões",
      relationship: "filho",
    });
    await addGuardian(parishId, child.id, fatherId, motherId);

    await removeGuardian(parishId, child.id, fatherId, motherId);

    const fatherView = await listMyFamilyMembers(parishId, fatherId);
    expect(fatherView.some((m) => m.id === child.id)).toBe(false);

    const guardians = await listGuardians(parishId, child.id);
    expect(guardians.map((g) => g.userId)).toEqual([motherId]);
  });
});
