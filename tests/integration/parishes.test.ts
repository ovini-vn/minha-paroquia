import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { criarParoquia, registerParish } from "@/server/modules/parishes/service";
import { createDiocese } from "@/server/modules/dioceses/service";

describe("criação de paróquia", () => {
  const createdIds: string[] = [];
  const dioceseIds: string[] = [];

  afterAll(async () => {
    await prisma.parish.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.diocese.deleteMany({ where: { id: { in: dioceseIds } } });
  });

  it("cria uma paróquia com slug derivado do nome e da cidade", async () => {
    const parish = await registerParish({ name: `Paróquia Teste ${Date.now()}`, city: "Belo Horizonte", state: "MG" });
    createdIds.push(parish.id);
    expect(parish.slug).toMatch(/^paroquia-teste-.*-belo-horizonte$/);
    expect(parish.city).toBe("Belo Horizonte");
    expect(parish.state).toBe("MG");
  });

  it("a plataforma abre uma paróquia nova, com ou sem diocese", async () => {
    // Antes isso só acontecia rodando um script com o banco de produção na
    // mão — e mostrar o app a um pároco começava por aí.
    const diocese = await createDiocese({ name: `Arquidiocese Teste ${Date.now()}`, state: "PR" });
    dioceseIds.push(diocese.id);

    const comDiocese = await criarParoquia({
      name: `Paróquia da Plataforma ${Date.now()}`,
      city: "Londrina",
      state: "pr",
      dioceseId: diocese.id,
    });
    createdIds.push(comDiocese.id);
    expect(comDiocese.state).toBe("PR");

    const conferida = await prisma.parish.findUniqueOrThrow({ where: { id: comDiocese.id } });
    expect(conferida.dioceseId).toBe(diocese.id);

    const semDiocese = await criarParoquia({
      name: `Paróquia Sem Diocese ${Date.now()}`,
      city: "Londrina",
      state: "PR",
    });
    createdIds.push(semDiocese.id);
    expect(semDiocese.dioceseId).toBeNull();
  });

  it("recusa paróquia sem cidade ou com UF inventada", async () => {
    await expect(criarParoquia({ name: "Paróquia X", city: "", state: "PR" })).rejects.toThrow();
    await expect(
      criarParoquia({ name: "Paróquia X", city: "Londrina", state: "Paraná" }),
    ).rejects.toThrow();
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
