import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  createGroup,
  listActiveGroups,
  listAllGroups,
  setGroupStatus,
  expressGroupInterest,
  withdrawGroupInterest,
  listMyGroupInterests,
  listInterestsForParish,
} from "@/server/modules/pastorais/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("grupos e pastorais", () => {
  let parishAId: string;
  let parishBId: string;
  let parocoId: string;
  let fielId: string;
  let grupoId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const a = await registerParish({ name: `Paróquia Pastorais A ${Date.now()}` });
    const b = await registerParish({ name: `Paróquia Pastorais B ${Date.now()}` });
    parishAId = a.id;
    parishBId = b.id;
    parishIds.push(a.id, b.id);

    const paroco = await registerUser({
      fullName: "Pároco Pastorais",
      email: `paroco-past-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fiel = await registerUser({
      fullName: "Fiel Pastorais",
      email: `fiel-past-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    parocoId = paroco.id;
    fielId = fiel.id;
    userIds.push(paroco.id, fiel.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("cadastra uma pastoral com coordenador, horário e local", async () => {
    const grupo = await createGroup(parishAId, parocoId, {
      name: "Pastoral da Criança",
      description: "Acompanha a saúde das crianças do bairro.",
      leaderName: "Ivone Barros",
      meetsWhen: "Sábados, 9h",
      meetsWhere: "Sede da pastoral",
    });
    grupoId = grupo.id;

    expect(grupo.name).toBe("Pastoral da Criança");
    expect(grupo.leaderName).toBe("Ivone Barros");
    expect(grupo.status).toBe("ativa");
  });

  it("rejeita cadastrar pastoral sem nome", async () => {
    await expect(createGroup(parishAId, parocoId, { name: "   " })).rejects.toThrow();
  });

  it("manifestar interesse registra a pessoa, sem inscrevê-la", async () => {
    await expressGroupInterest(parishAId, grupoId, fielId);

    const meus = await listMyGroupInterests(parishAId, fielId);
    expect(meus).toHaveLength(1);
    expect(meus[0]?.status).toBe("manifestado");

    // Para o coordenador, aparece como contato a fazer — nada automático.
    const paraOCoordenador = await listInterestsForParish(parishAId);
    expect(paraOCoordenador).toHaveLength(1);
    expect(paraOCoordenador[0]?.user.fullName).toBe("Fiel Pastorais");
    expect(paraOCoordenador[0]?.group.name).toBe("Pastoral da Criança");
  });

  it("manifestar interesse duas vezes não duplica", async () => {
    await expressGroupInterest(parishAId, grupoId, fielId);
    const meus = await listMyGroupInterests(parishAId, fielId);
    expect(meus).toHaveLength(1);
  });

  it("retirar o interesse remove o registro", async () => {
    await withdrawGroupInterest(parishAId, grupoId, fielId);
    expect(await listMyGroupInterests(parishAId, fielId)).toHaveLength(0);

    // Recoloca para os testes seguintes.
    await expressGroupInterest(parishAId, grupoId, fielId);
  });

  it("pastoral inativa sai da lista pública e não aceita novos interessados", async () => {
    await setGroupStatus(parishAId, grupoId, "inativa");

    expect(await listActiveGroups(parishAId)).toHaveLength(0);
    // Continua visível para a gestão.
    expect(await listAllGroups(parishAId)).toHaveLength(1);

    await expect(expressGroupInterest(parishAId, grupoId, parocoId)).rejects.toThrow();

    await setGroupStatus(parishAId, grupoId, "ativa");
    expect(await listActiveGroups(parishAId)).toHaveLength(1);
  });

  it("pastorais e interesses não vazam para outra paróquia", async () => {
    expect(await listActiveGroups(parishBId)).toHaveLength(0);
    expect(await listAllGroups(parishBId)).toHaveLength(0);
    expect(await listInterestsForParish(parishBId)).toHaveLength(0);

    // Nem sabendo o id: a pastoral pertence à paróquia A.
    await expect(expressGroupInterest(parishBId, grupoId, fielId)).rejects.toThrow();
  });
});
