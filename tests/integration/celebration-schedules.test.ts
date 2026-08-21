import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import {
  createCelebrationSchedule,
  listCelebrationSchedules,
  deactivateCelebrationSchedule,
  setCelebrationCanceled,
  listUpcomingCelebrations,
  generateAllUpcomingOccurrences,
} from "@/server/modules/celebrations/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("missas que se repetem", () => {
  let parishId: string;
  let outraParishId: string;
  let parocoId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const [p, outra] = await Promise.all([
      registerParish({ name: `Par Repeticao ${stamp}`, city: "Londrina", state: "PR" }),
      registerParish({ name: `Par Vizinha ${stamp}`, city: "Maringá", state: "PR" }),
    ]);
    parishId = p.id;
    outraParishId = outra.id;
    parishIds.push(p.id, outra.id);

    const [paroco, fiel] = await Promise.all([
      registerUser({
        fullName: "Pe. Repetição",
        email: `paroco-rep-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Fiel Leitor",
        email: `fiel-rep-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    fielId = fiel.id;
    userIds.push(paroco.id, fiel.id);

    const convite = await createInvitation({
      parishId,
      createdBy: parocoId,
      type: "link",
      role: "SACERDOTE",
    });
    await acceptInvitation({ code: convite.code, userId: parocoId });

    const conviteFiel = await createInvitation({
      parishId,
      createdBy: parocoId,
      type: "link",
      role: "FIEL",
    });
    await acceptInvitation({ code: conviteFiel.code, userId: fielId });
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("criar a regra já lança as próximas datas na agenda", async () => {
    const { schedule, criadas } = await createCelebrationSchedule({
      parishId,
      createdBy: parocoId,
      type: "missa",
      title: "Missa de quarta",
      location: "Igreja Matriz",
      frequency: "semanal",
      weekday: 3,
      timeMinutes: 19 * 60 + 30,
      startsOn: new Date("2020-01-01T00:00:00.000Z"),
    });

    // Horizonte de 120 dias: ~17 quartas-feiras.
    expect(criadas).toBeGreaterThan(15);
    expect(schedule.weekOfMonth).toBeNull();

    const proximas = await listUpcomingCelebrations(parishId, 5);
    expect(proximas.length).toBe(5);
    expect(proximas[0]?.title).toBe("Missa de quarta");
    expect(proximas[0]?.location).toBe("Igreja Matriz");
  });

  it("rodar o job de novo NÃO duplica missa", async () => {
    // Sem isso, uma semana de job diário viraria sete missas empilhadas no
    // mesmo horário — o defeito mais provável de todo este recurso.
    const antes = await withTenantContext(parishId, (tx) =>
      tx.celebration.count({ where: { parishId } }),
    );

    await generateAllUpcomingOccurrences();
    await generateAllUpcomingOccurrences();

    const depois = await withTenantContext(parishId, (tx) =>
      tx.celebration.count({ where: { parishId } }),
    );
    expect(depois).toBe(antes);
  });

  it("recusa uma segunda repetição igual no mesmo dia e horário", async () => {
    // Sem isso, a MESMA missa apareceria duplicada na agenda do fiel: as
    // duas regras geram ocorrências distintas no mesmo instante, e a
    // restrição única não pega porque o schedule_id difere.
    await expect(
      createCelebrationSchedule({
        parishId,
        createdBy: parocoId,
        type: "missa",
        title: "Outra missa de quarta",
        frequency: "semanal",
        weekday: 3,
        timeMinutes: 19 * 60 + 30,
        startsOn: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow(/já existe/i);
  });

  it("regra mensal cria bem menos datas que a semanal", async () => {
    const { criadas } = await createCelebrationSchedule({
      parishId,
      createdBy: parocoId,
      type: "missa",
      title: "Missa de primeira sexta",
      location: "Capela",
      frequency: "mensal",
      weekday: 5,
      weekOfMonth: 1,
      timeMinutes: 15 * 60,
      startsOn: new Date("2020-01-01T00:00:00.000Z"),
    });

    // 120 dias ≈ 4 meses, logo ~4 primeiras-sextas.
    expect(criadas).toBeGreaterThanOrEqual(3);
    expect(criadas).toBeLessThanOrEqual(5);
  });

  it("cancelar uma data tira ela da agenda sem apagar a linha", async () => {
    const proximas = await listUpcomingCelebrations(parishId, 1);
    const alvo = proximas[0]!;

    await setCelebrationCanceled(parishId, alvo.id, true);

    const depois = await listUpcomingCelebrations(parishId, 5);
    expect(depois.some((c) => c.id === alvo.id)).toBe(false);

    // A linha continua lá — é o que preserva a escala que aponta para ela.
    const linha = await withTenantContext(parishId, (tx) =>
      tx.celebration.findUnique({ where: { id: alvo.id } }),
    );
    expect(linha).not.toBeNull();
    expect(linha?.canceledAt).not.toBeNull();

    // E dá para reabrir.
    await setCelebrationCanceled(parishId, alvo.id, false);
    const reaberta = await listUpcomingCelebrations(parishId, 5);
    expect(reaberta.some((c) => c.id === alvo.id)).toBe(true);
  });

  it("encerrar a repetição PRESERVA a data que já tem escala montada", async () => {
    const { schedule } = await createCelebrationSchedule({
      parishId,
      createdBy: parocoId,
      type: "missa",
      title: "Missa de sábado",
      frequency: "semanal",
      weekday: 6,
      timeMinutes: 18 * 60,
      startsOn: new Date("2020-01-01T00:00:00.000Z"),
    });

    // Monta escala em UMA das ocorrências.
    const escalada = await withTenantContext(parishId, async (tx) => {
      const c = await tx.celebration.findFirstOrThrow({
        where: { parishId, scheduleId: schedule.id, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      });
      await tx.liturgicalSchedule.create({
        data: { parishId, celebrationId: c.id, roleType: "leitor", userId: fielId },
      });
      return c;
    });

    const { removidas, mantidas } = await deactivateCelebrationSchedule(parishId, schedule.id);

    expect(removidas).toBeGreaterThan(0);
    expect(mantidas).toBe(1);

    // A que tinha escala continua de pé, e a escala junto.
    const sobreviveu = await withTenantContext(parishId, (tx) =>
      tx.celebration.findUnique({
        where: { id: escalada.id },
        include: { liturgicalSchedules: true },
      }),
    );
    expect(sobreviveu).not.toBeNull();
    expect(sobreviveu?.liturgicalSchedules).toHaveLength(1);
  });

  it("regra encerrada para de gerar data nova", async () => {
    const encerradas = (await listCelebrationSchedules(parishId)).filter((s) => !s.active);
    expect(encerradas.length).toBeGreaterThan(0);

    const antes = await withTenantContext(parishId, (tx) =>
      tx.celebration.count({ where: { parishId, scheduleId: encerradas[0]!.id } }),
    );
    await generateAllUpcomingOccurrences();
    const depois = await withTenantContext(parishId, (tx) =>
      tx.celebration.count({ where: { parishId, scheduleId: encerradas[0]!.id } }),
    );

    expect(depois).toBe(antes);
  });

  it("a repetição de uma paróquia não vaza para a outra", async () => {
    const daVizinha = await listCelebrationSchedules(outraParishId);
    expect(daVizinha).toHaveLength(0);

    const missasDaVizinha = await listUpcomingCelebrations(outraParishId, 10);
    expect(missasDaVizinha).toHaveLength(0);
  });
});
