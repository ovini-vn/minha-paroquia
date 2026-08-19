import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  createOpportunity,
  closeOpportunity,
  expressInterest,
  listOpportunitiesForAdmin,
  updateInterestStatus,
} from "@/server/modules/opportunities/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("servir: oportunidades e manifestação de interesse", () => {
  let parishId: string;
  let creatorId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Servir ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const creator = await registerUser({
      fullName: "Coordenador Teste",
      email: `coordenador-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fiel = await registerUser({
      fullName: "Fiel Servir",
      email: `fiel-servir-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    creatorId = creator.id;
    fielId = fiel.id;
    userIds.push(creator.id, fiel.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("manifestar interesse duas vezes na mesma oportunidade não duplica o registro", async () => {
    const opportunity = await createOpportunity({ parishId, createdBy: creatorId, title: "Festa Junina" });

    const first = await expressInterest(parishId, opportunity.id, fielId);
    const second = await expressInterest(parishId, opportunity.id, fielId);

    expect(first.id).toBe(second.id);
    expect(first.status).toBe("manifestado");
  });

  it("rejeita manifestar interesse numa oportunidade encerrada", async () => {
    const opportunity = await createOpportunity({ parishId, createdBy: creatorId, title: "Retiro" });
    await closeOpportunity(parishId, opportunity.id);

    await expect(expressInterest(parishId, opportunity.id, fielId)).rejects.toThrow();
  });

  it("um coordenador só vê e gerencia as oportunidades que ele mesmo criou", async () => {
    const otherCoordinator = await registerUser({
      fullName: "Outro Coordenador",
      email: `outro-coordenador-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(otherCoordinator.id);

    const mine = await createOpportunity({ parishId, createdBy: creatorId, title: "Do meu ministério" });
    const theirs = await createOpportunity({
      parishId,
      createdBy: otherCoordinator.id,
      title: "De outro ministério",
    });

    const myView = await listOpportunitiesForAdmin(parishId, creatorId);
    expect(myView.map((o) => o.id)).toContain(mine.id);
    expect(myView.map((o) => o.id)).not.toContain(theirs.id);

    // tentar encerrar/gerenciar a oportunidade de outro coordenador não deve fazer nada
    const attempt = await closeOpportunity(parishId, theirs.id, creatorId);
    expect(attempt.count).toBe(0);

    const interest = await expressInterest(parishId, theirs.id, fielId);
    const attemptStatus = await updateInterestStatus(parishId, interest.id, "acolhido", creatorId);
    expect(attemptStatus.count).toBe(0);
  });
});
