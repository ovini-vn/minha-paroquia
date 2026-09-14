import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NotificationCategory } from "@prisma/client";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import {
  caminhoComNovidade,
  caminhosNaoLidos,
  markNotificationsReadByPath,
  situacaoDaBarra,
} from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * A bolinha da barra de navegação.
 *
 * O defeito que estes testes fecham tinha duas metades. Uma bolinha por
 * caminho pendente — e a conta de demonstração tinha nove, acendendo
 * quatro das cinco abas. E abrir a tela quase nunca dava a notificação por
 * lida, então nenhuma apagava.
 *
 * A regra agora: UMA bolinha, a da novidade mais recente; abrir a tela dela
 * a apaga, e a seguinte acende.
 */
describe("bolinha da barra", () => {
  let parishId: string;
  let fielId: string;
  let outroId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  /** Cria com data controlada: "mais recente" é o que está em teste. */
  async function aviso(
    userId: string,
    linkPath: string | null,
    category: NotificationCategory,
    minutosAtras: number,
  ) {
    await withTenantContext(parishId, (tx) =>
      tx.notification.create({
        data: {
          parishId,
          userId,
          category,
          title: `Aviso ${linkPath}`,
          body: "corpo",
          linkPath,
          createdAt: new Date(Date.now() - minutosAtras * 60_000),
        },
      }),
    );
  }

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Bolinha ${stamp}` });
    parishId = parish.id;
    parishIds.push(parish.id);
    const fiel = await registerUser({
      fullName: "Fiel Bolinha",
      email: `fiel-bolinha-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const outro = await registerUser({
      fullName: "Outro Bolinha",
      email: `outro-bolinha-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    outroId = outro.id;
    userIds.push(fiel.id, outro.id);
  });

  beforeEach(async () => {
    await withTenantContext(parishId, (tx) =>
      tx.notification.deleteMany({ where: { parishId } }),
    );
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("acende UMA bolinha, a da novidade mais recente — e não uma por tela", async () => {
    await aviso(fielId, "/biblia", "descoberta", 300);
    await aviso(fielId, "/oracao", "espiritual", 200);
    await aviso(fielId, "/eu/familia", "descoberta", 100);

    expect(await caminhoComNovidade(parishId, fielId)).toBe("/eu/familia");
  });

  it("abrir a tela da novidade passa a bolinha para a seguinte", async () => {
    await aviso(fielId, "/biblia", "descoberta", 300);
    await aviso(fielId, "/oracao", "espiritual", 200);
    await aviso(fielId, "/eu/familia", "descoberta", 100);

    await markNotificationsReadByPath(parishId, fielId, "/eu/familia");
    expect(await caminhoComNovidade(parishId, fielId)).toBe("/oracao");

    await markNotificationsReadByPath(parishId, fielId, "/oracao");
    expect(await caminhoComNovidade(parishId, fielId)).toBe("/biblia");

    await markNotificationsReadByPath(parishId, fielId, "/biblia");
    expect(await caminhoComNovidade(parishId, fielId)).toBeNull();
  });

  it("aviso de compromisso não acende a bolinha, mesmo sendo o mais novo", async () => {
    // Escala e aviso urgente chegam pelo sino e são sobre um compromisso,
    // não sobre uma tela a descobrir.
    await aviso(fielId, "/biblia", "descoberta", 300);
    await aviso(fielId, "/servir/liturgia", "pastoral", 10);
    await aviso(fielId, "/avisos", "urgente", 5);

    expect(await caminhoComNovidade(parishId, fielId)).toBe("/biblia");
  });

  it("a novidade de outra pessoa não acende a minha", async () => {
    await aviso(fielId, "/biblia", "descoberta", 300);
    await aviso(outroId, "/eu/familia", "descoberta", 1);

    expect(await caminhoComNovidade(parishId, fielId)).toBe("/biblia");
  });

  it("as telas pendentes incluem TODA categoria, sem repetir e sem as já lidas", async () => {
    /*
     * É a lista que o layout entrega ao `LidoAoNavegar`. Se uma categoria
     * faltasse aqui, abrir a tela dela deixaria de dar por lida — e foi
     * exatamente assim, com uma lista fixa de sete endereços, que as
     * bolinhas pararam de apagar.
     */
    await aviso(fielId, "/oracao", "espiritual", 50);
    await aviso(fielId, "/oracao", "espiritual", 40);
    await aviso(fielId, "/avisos", "urgente", 30);
    await aviso(fielId, "/servir/liturgia", "pastoral", 20);
    await aviso(fielId, null, "pessoal", 10);
    await aviso(outroId, "/eu/perfil", "descoberta", 5);
    await aviso(fielId, "/biblia", "descoberta", 60);
    await markNotificationsReadByPath(parishId, fielId, "/biblia");

    const caminhos = await caminhosNaoLidos(parishId, fielId);
    expect([...caminhos].sort()).toEqual(["/avisos", "/oracao", "/servir/liturgia"]);
  });

  it("o layout recebe as duas respostas numa consulta só, iguais às separadas", async () => {
    await aviso(fielId, "/biblia", "descoberta", 300);
    await aviso(fielId, "/avisos", "urgente", 5);

    expect(await situacaoDaBarra(parishId, fielId)).toEqual({
      novidade: await caminhoComNovidade(parishId, fielId),
      naoLidos: await caminhosNaoLidos(parishId, fielId),
    });
  });

  it("dar por lida uma tela apaga todas as dela, e só as dela", async () => {
    await aviso(fielId, "/oracao", "espiritual", 50);
    await aviso(fielId, "/oracao", "espiritual", 40);
    await aviso(fielId, "/oracao/pedidos", "descoberta", 30);
    await aviso(outroId, "/oracao", "espiritual", 20);

    const { count } = await markNotificationsReadByPath(parishId, fielId, "/oracao");
    expect(count).toBe(2);

    // O caminho é EXATO: a tela de pedidos, que mora "dentro" da Palavra,
    // continua pendente. E a notificação da outra pessoa, intocada.
    expect(await caminhosNaoLidos(parishId, fielId)).toEqual(["/oracao/pedidos"]);
    expect(await caminhosNaoLidos(parishId, outroId)).toEqual(["/oracao"]);
  });
});
