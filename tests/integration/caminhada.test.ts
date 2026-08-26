import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, joinParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  registerMassParticipation,
  getReflectionAggregate,
  listMyMassParticipations,
  registerConfession,
  listMyConfessions,
  registerSacrament,
} from "@/server/modules/caminhada/service";
import { listarAniversarios } from "@/server/modules/aniversarios/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("minha caminhada: agregação de reflexões preserva privacidade", () => {
  let parishId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Caminhada ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("não libera o agregado quando há poucas participações (evita expor indivíduo por dedução)", async () => {
    const fiel = await registerUser({
      fullName: "Fiel Solo",
      email: `fiel-solo-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(fiel.id);

    await registerMassParticipation({
      parishId,
      userId: fiel.id,
      participatedAt: new Date(),
      reflectionText: "Aprendi algo",
    });

    const aggregate = await getReflectionAggregate(parishId);
    expect(aggregate.available).toBe(false);
  });

  it("libera o agregado (só números, nunca texto) quando atinge o mínimo de participações", async () => {
    const fiéis = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        registerUser({
          fullName: `Fiel Grupo ${i}`,
          email: `fiel-grupo-${i}-${Date.now()}@test.comunidade.app`,
          password: "SenhaForte123",
        }),
      ),
    );
    userIds.push(...fiéis.map((f) => f.id));

    for (const [i, fiel] of fiéis.entries()) {
      await registerMassParticipation({
        parishId,
        userId: fiel.id,
        participatedAt: new Date(),
        reflectionText: i < 3 ? "Uma reflexão qualquer" : undefined,
      });
    }

    const aggregate = await getReflectionAggregate(parishId);
    expect(aggregate.available).toBe(true);
    if (aggregate.available) {
      expect(aggregate.total).toBeGreaterThanOrEqual(5);
      expect(typeof aggregate.rate).toBe("number");
      expect(aggregate).not.toHaveProperty("reflectionText");
    }
  });

  it("missa e confissão não são visíveis para outra conta", async () => {
    // A regra é simples e vale a pena travar num teste: a paróquia não vê
    // quais missas alguém marcou nem quando se confessou. Se um dia uma
    // tela administrativa chamar essas funções com o userId de outro, é
    // aqui que o erro aparece.
    const dono = await registerUser({
      fullName: "Dono da Caminhada",
      email: `dono-caminhada-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const bisbilhoteiro = await registerUser({
      fullName: "Outra Conta",
      email: `outra-caminhada-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(dono.id, bisbilhoteiro.id);

    await registerMassParticipation({
      parishId,
      userId: dono.id,
      participatedAt: new Date(),
      reflectionText: "Texto que é só meu",
    });
    await registerConfession({ parishId, userId: dono.id, date: new Date() });

    expect(await listMyMassParticipations(parishId, bisbilhoteiro.id)).toHaveLength(0);
    expect(await listMyConfessions(parishId, bisbilhoteiro.id)).toHaveLength(0);

    // E o dono continua vendo o que é dele.
    expect((await listMyMassParticipations(parishId, dono.id)).length).toBeGreaterThan(0);
    expect((await listMyConfessions(parishId, dono.id)).length).toBeGreaterThan(0);
  });

  it("o agregado da paróquia não carrega texto nem nome", async () => {
    const agregado = await getReflectionAggregate(parishId);
    // É a única coisa que a paróquia enxerga sobre missas, e ela é feita
    // só de números.
    expect(JSON.stringify(agregado)).not.toContain("Texto que é só meu");
    for (const chave of Object.keys(agregado)) {
      expect(["available", "total", "withReflection", "rate"]).toContain(chave);
    }
  });

  it("a lista de aniversários traz sacramentos, e nunca missa ou confissão", async () => {
    // O pároco precisa das datas que se comemoram. Missa e confissão não
    // são data que se comemora — são acompanhamento pessoal.
    const pessoa = await registerUser({
      fullName: "Fiel Com Datas",
      email: `datas-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(pessoa.id);

    const hoje = new Date();
    const daquiADias = new Date(Date.UTC(1990, hoje.getUTCMonth(), hoje.getUTCDate()));

    // A data de nascimento só entra na lista para quem é membro ativo.
    await joinParish(parishId, pessoa.id);

    await registerSacrament({
      parishId,
      userId: pessoa.id,
      type: "batismo",
      date: daquiADias,
    });
    await registerConfession({ parishId, userId: pessoa.id, date: new Date() });

    const lista = await listarAniversarios(parishId, hoje, 30);
    const dessaPessoa = lista.filter((a) => a.pessoaId === pessoa.id);

    expect(dessaPessoa.map((a) => a.tipo)).toContain("batismo");
    // Não existe tipo de aniversário para missa ou confissão — e é assim
    // que tem que continuar.
    expect(lista.every((a) => a.tipo !== ("missa" as never))).toBe(true);
    expect(lista.every((a) => a.tipo !== ("confissao" as never))).toBe(true);
  });
});