import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { registerParish } from "@/server/modules/parishes/service";

describe("criação de paróquia", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    await prisma.parish.deleteMany({ where: { id: { in: createdIds } } });
  });

  it("cria uma paróquia com slug derivado do nome", async () => {
    const parish = await registerParish({ name: `Paróquia Teste ${Date.now()}` });
    createdIds.push(parish.id);
    expect(parish.slug).toMatch(/^paroquia-teste-/);
  });

  it("rejeita um nome que geraria um slug já em uso", async () => {
    const name = `Paróquia Duplicada ${Date.now()}`;
    const first = await registerParish({ name });
    createdIds.push(first.id);
    await expect(registerParish({ name })).rejects.toThrow();
  });
});
