import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { prisma } from "@/server/db/prisma";
import { proximaDica, enviarDicasDaTrilha } from "@/server/modules/trilha/service";
import { DICAS } from "@/server/modules/trilha/dicas";
import {
  limparEnviosAntigos,
  listMyNotifications,
  setPreference,
} from "@/server/modules/notifications/service";
import { listarAniversariosDaComunidade } from "@/server/modules/aniversarios/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * A trilha que ensina o aplicativo.
 *
 * O que estes testes protegem é uma coisa só, dita de vários jeitos: a
 * trilha CALA quando cumpriu o papel. Uma que continua falando é a
 * definição de chata, e leva a pessoa a desligar as notificações inteiras
 * — inclusive as de missa, que ela quer receber.
 */
describe("trilha de descoberta", () => {
  let parishId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  /** Sorteio previsível: sempre o primeiro, para o teste não depender de sorte. */
  const primeiro = () => 0;

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Trilha ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const fiel = await registerUser({
      fullName: "Fiel da Trilha",
      email: `fiel-trilha-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    userIds.push(fiel.id);

    const papelFiel = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(parishId, (tx) =>
      tx.parishMembership.create({
        data: { userId: fielId, parishId, roleId: papelFiel.id, status: "active" },
      }),
    );
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("quem não fez nada tem dica esperando", async () => {
    const dica = await withTenantContext(parishId, (tx) =>
      proximaDica(tx, parishId, fielId, primeiro),
    );
    expect(dica).not.toBeNull();
    expect(dica!.linkPath).toBeTruthy();
  });

  it("USAR a funcionalidade tira a dica da fila — é o coração da coisa", async () => {
    const antes = await withTenantContext(parishId, (tx) =>
      proximaDica(tx, parishId, fielId, primeiro),
    );
    expect(antes!.id).toBe("sacramentos");

    // O fiel registra um sacramento: a dica sobre sacramentos perde o sentido.
    await withTenantContext(parishId, (tx) =>
      tx.sacrament.create({
        data: { parishId, userId: fielId, type: "batismo", date: new Date("2000-05-10") },
      }),
    );

    const depois = await withTenantContext(parishId, (tx) =>
      proximaDica(tx, parishId, fielId, primeiro),
    );
    expect(depois!.id).not.toBe("sacramentos");
  });

  it("não repete a dica que já mandou, mesmo sem a pessoa usar", async () => {
    const primeira = await withTenantContext(parishId, async (tx) => {
      const d = await proximaDica(tx, parishId, fielId, primeiro);
      await tx.notificationDispatch.create({
        data: { parishId, chave: `trilha:${fielId}:${d!.id}` },
      });
      return d!;
    });

    const segunda = await withTenantContext(parishId, (tx) =>
      proximaDica(tx, parishId, fielId, primeiro),
    );
    expect(segunda!.id).not.toBe(primeira.id);
  });

  it("depois do teto, a trilha cala para sempre", async () => {
    const outro = await registerUser({
      fullName: "Fiel Saturado",
      email: `fiel-saturado-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(outro.id);
    const papelFiel = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(parishId, (tx) =>
      tx.parishMembership.create({
        data: { userId: outro.id, parishId, roleId: papelFiel.id, status: "active" },
      }),
    );

    // Doze dicas entregues e nenhuma usada: quem ignorou doze convites não
    // está esperando o décimo terceiro.
    await withTenantContext(parishId, (tx) =>
      tx.notificationDispatch.createMany({
        data: DICAS.slice(0, 12).map((d) => ({
          parishId,
          chave: `trilha:${outro.id}:${d.id}`,
        })),
      }),
    );

    const dica = await withTenantContext(parishId, (tx) =>
      proximaDica(tx, parishId, outro.id, primeiro),
    );
    expect(dica).toBeNull();
  });

  it("quem desligou 'descoberta' não recebe, e o carimbo não mente sobre isso", async () => {
    const mudo = await registerUser({
      fullName: "Fiel Silencioso",
      email: `fiel-mudo-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(mudo.id);
    const papelFiel = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(parishId, (tx) =>
      tx.parishMembership.create({
        data: { userId: mudo.id, parishId, roleId: papelFiel.id, status: "active" },
      }),
    );
    await setPreference(mudo.id, "descoberta", false);

    await enviarDicasDaTrilha();

    const recebidas = await listMyNotifications(parishId, mudo.id, {});
    expect(recebidas.filter((n) => n.category === "descoberta")).toHaveLength(0);
  });

  it("a faxina de envios NÃO apaga o carimbo da trilha", async () => {
    /*
     * A armadilha: `limparEnviosAntigos` poda registros com mais de 30 dias,
     * porque a pergunta "já mandei o resumo de hoje?" não vale para semana
     * passada. Para a trilha vale para sempre — podar faria a pessoa receber
     * de novo, todo mês, as dicas que já leu.
     */
    const velho = new Date(Date.now() - 90 * 24 * 3_600_000);
    await withTenantContext(parishId, (tx) =>
      tx.notificationDispatch.createMany({
        data: [
          { parishId, chave: `trilha:${fielId}:veterana`, createdAt: velho },
          { parishId, chave: `resumo:${parishId}:2000-01-01`, createdAt: velho },
        ],
      }),
    );

    await limparEnviosAntigos(new Date());

    const sobraram = await withTenantContext(parishId, (tx) =>
      tx.notificationDispatch.findMany({
        where: { parishId, chave: { in: [`trilha:${fielId}:veterana`, `resumo:${parishId}:2000-01-01`] } },
        select: { chave: true },
      }),
    );
    expect(sobraram.map((s) => s.chave)).toEqual([`trilha:${fielId}:veterana`]);
  });

  it("a comunidade só vê a data de quem consentiu — e nunca a de dependente", async () => {
    /*
     * A política publicada promete que "um fiel comum não tem acesso à
     * lista de membros nem aos dados de outros fiéis". Esta lista é a
     * ÚNICA exceção, e ela existe porque a pessoa escolheu. Dependente
     * nunca entra: consentir pela própria data não é consentir pela do
     * filho (LGPD art. 14, já citado na política).
     */
    const hoje = new Date();
    const daquiADois = new Date(
      Date.UTC(1990, hoje.getUTCMonth(), hoje.getUTCDate() + 2),
    );

    const consentiu = await registerUser({
      fullName: "Fiel Que Consentiu",
      email: `consentiu-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const calou = await registerUser({
      fullName: "Fiel Que Nao Quis",
      email: `calou-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(consentiu.id, calou.id);

    const papelFiel = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(parishId, (tx) =>
      tx.parishMembership.createMany({
        data: [consentiu.id, calou.id].map((userId) => ({
          userId,
          parishId,
          roleId: papelFiel.id,
          status: "active" as const,
        })),
      }),
    );

    await prisma.user.update({
      where: { id: consentiu.id },
      data: { birthDate: daquiADois, compartilhaDatas: true },
    });
    await prisma.user.update({
      where: { id: calou.id },
      data: { birthDate: daquiADois, compartilhaDatas: false },
    });

    // Um dependente do fiel que CONSENTIU, com sacramento na mesma semana.
    await withTenantContext(parishId, async (tx) => {
      const filho = await tx.familyMember.create({
        data: { parishId, fullName: "Criança da Catequese", responsibleUserId: consentiu.id },
      });
      await tx.sacrament.create({
        data: { parishId, familyMemberId: filho.id, type: "batismo", date: daquiADois },
      });
    });

    const lista = await listarAniversariosDaComunidade(parishId, new Date(), 7);
    const nomes = lista.map((a) => a.nome);

    expect(nomes).toContain("Fiel Que Consentiu");
    expect(nomes).not.toContain("Fiel Que Nao Quis");
    expect(nomes).not.toContain("Criança da Catequese");
  });

  it("dica de catequista não vai para quem não é catequista", async () => {
    const soDeCatequista = DICAS.filter((d) => d.publico === "catequista").map((d) => d.id);
    expect(soDeCatequista.length).toBeGreaterThan(0);

    // O fiel comum percorre a trilha inteira sem topar com elas.
    const vistas = new Set<string>();
    for (let i = 0; i < DICAS.length + 2; i++) {
      const d = await withTenantContext(parishId, async (tx) => {
        const escolhida = await proximaDica(tx, parishId, fielId, primeiro);
        if (escolhida) {
          await tx.notificationDispatch.createMany({
            data: [{ parishId, chave: `trilha:${fielId}:${escolhida.id}` }],
            skipDuplicates: true,
          });
        }
        return escolhida;
      });
      if (!d) break;
      vistas.add(d.id);
    }

    for (const id of soDeCatequista) expect(vistas.has(id)).toBe(false);
  });
});
