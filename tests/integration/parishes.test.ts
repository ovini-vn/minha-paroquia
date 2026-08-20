import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { registerParish } from "@/server/modules/parishes/service";

describe("criação de paróquia", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    await prisma.parish.deleteMany({ where: { id: { in: createdIds } } });
  });

  it("cria uma paróquia com slug derivado do nome e da cidade", async () => {
    const parish = await registerParish({ name: `Paróquia Teste ${Date.now()}`, city: "Belo Horizonte", state: "MG" });
    createdIds.push(parish.id);
    expect(parish.slug).toMatch(/^paroquia-teste-.*-belo-horizonte$/);
    expect(parish.city).toBe("Belo Horizonte");
    expect(parish.state).toBe("MG");
  });

  it("permite duas paróquias com o mesmo nome em cidades diferentes", async () => {
    const name = `Nossa Senhora de Fátima ${Date.now()}`;
    const first = await registerParish({ name, city: "Recife", state: "PE" });
    const second = await registerParish({ name, city: "Curitiba", state: "PR" });
    createdIds.push(first.id, second.id);

    expect(first.slug).not.toBe(second.slug);
    expect(first.slug).toMatch(/-recife$/);
    expect(second.slug).toMatch(/-curitiba$/);
  });

  it("mesmo nome e cidade não trava — cai num sufixo numérico em vez de rejeitar", async () => {
    const name = `Paróquia Duplicada ${Date.now()}`;
    const first = await registerParish({ name, city: "Salvador", state: "BA" });
    const second = await registerParish({ name, city: "Salvador", state: "BA" });
    createdIds.push(first.id, second.id);

    expect(first.slug).not.toBe(second.slug);
    expect(second.slug).toBe(`${first.slug}-2`);
  });
});
