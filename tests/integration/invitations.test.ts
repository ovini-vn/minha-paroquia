import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  acceptInvitation,
  createInvitation,
  validateInvitation,
  revokeInvitation,
} from "@/server/modules/invitations/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("convites e vínculo usuário → paróquia", () => {
  let parishId: string;
  let creatorId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Convites ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const creator = await registerUser({
      fullName: "Secretaria Teste",
      email: `secretaria-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    creatorId = creator.id;
    userIds.push(creator.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("cria um convite pendente com código de 8 caracteres", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });
    expect(invitation.status).toBe("pending");
    expect(invitation.code).toHaveLength(8);
  });

  it("considera válido um convite recém-criado", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });
    const result = await validateInvitation(invitation.code);
    expect(result.valid).toBe(true);
  });

  it("rejeita um convite expirado", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL", expiresInDays: 1 });
    await withTenantContext(parishId, (tx) =>
      tx.invitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } }),
    );

    const result = await validateInvitation(invitation.code);
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("aceitar o convite cria o vínculo ativo e o convite passa a 'usado'", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });
    const fiel = await registerUser({
      fullName: "Fiel Teste",
      email: `fiel-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(fiel.id);

    await acceptInvitation({ code: invitation.code, userId: fiel.id });

    const membership = await withTenantContext(parishId, (tx) =>
      tx.parishMembership.findFirst({ where: { userId: fiel.id, parishId } }),
    );
    expect(membership?.status).toBe("active");

    const revalidated = await validateInvitation(invitation.code);
    expect(revalidated).toEqual({ valid: false, reason: "used" });
  });

  it("rejeita aceitar um convite já utilizado por outra pessoa", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });
    const first = await registerUser({
      fullName: "Primeiro",
      email: `primeiro-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const second = await registerUser({
      fullName: "Segundo",
      email: `segundo-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(first.id, second.id);

    await acceptInvitation({ code: invitation.code, userId: first.id });
    await expect(acceptInvitation({ code: invitation.code, userId: second.id })).rejects.toThrow();
  });

  it("revoga um convite pendente e impede seu uso posterior", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });

    const result = await revokeInvitation(parishId, invitation.id);
    expect(result.count).toBe(1);

    const revalidated = await validateInvitation(invitation.code);
    expect(revalidated).toEqual({ valid: false, reason: "revoked" });

    const fiel = await registerUser({
      fullName: "Fiel Convite Revogado",
      email: `fiel-revogado-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(fiel.id);
    await expect(acceptInvitation({ code: invitation.code, userId: fiel.id })).rejects.toThrow();
  });

  it("não revoga um convite já usado", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });
    const fiel = await registerUser({
      fullName: "Fiel Usado",
      email: `fiel-usado-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(fiel.id);
    await acceptInvitation({ code: invitation.code, userId: fiel.id });

    const result = await revokeInvitation(parishId, invitation.id);
    expect(result.count).toBe(0);

    const revalidated = await validateInvitation(invitation.code);
    expect(revalidated).toEqual({ valid: false, reason: "used" });
  });

  it("não revoga um convite de outra paróquia mesmo sabendo o id", async () => {
    const otherParish = await registerParish({ name: `Outra Paróquia Convites ${Date.now()}` });
    parishIds.push(otherParish.id);
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "FIEL" });

    const result = await revokeInvitation(otherParish.id, invitation.id);
    expect(result.count).toBe(0);

    const revalidated = await validateInvitation(invitation.code);
    expect(revalidated.valid).toBe(true);
  });

  it("convite com vínculo Sacerdote cria o papel certo e o perfil de sacerdote automaticamente", async () => {
    const invitation = await createInvitation({ parishId, createdBy: creatorId, type: "link", role: "SACERDOTE" });
    const priest = await registerUser({
      fullName: "Padre Teste",
      email: `padre-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(priest.id);

    await acceptInvitation({ code: invitation.code, userId: priest.id });

    const membership = await withTenantContext(parishId, (tx) =>
      tx.parishMembership.findFirst({ where: { userId: priest.id, parishId }, include: { role: true } }),
    );
    expect(membership?.role.code).toBe("SACERDOTE");

    const profile = await withTenantContext(parishId, (tx) =>
      tx.priestProfile.findUnique({ where: { userId_parishId: { userId: priest.id, parishId } } }),
    );
    expect(profile?.title).toBe("Sacerdote");
  });
});
