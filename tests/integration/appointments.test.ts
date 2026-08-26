import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createAvailability } from "@/server/modules/availability/service";
import { createAppointment, getAvailableSlots } from "@/server/modules/appointments/service";
import { listPriestsWithOpenings } from "@/server/modules/priests/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("atendimento pastoral: geração de horários e agendamento", () => {
  let parishId: string;
  let priestProfileId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Atendimento ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const priestUser = await registerUser({
      fullName: "Padre Teste",
      email: `padre-atendimento-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fiel = await registerUser({
      fullName: "Fiel Atendimento",
      email: `fiel-atendimento-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    userIds.push(priestUser.id, fiel.id);

    const priestProfile = await withTenantContext(parishId, (tx) =>
      tx.priestProfile.create({ data: { userId: priestUser.id, parishId, title: "Sacerdote" } }),
    );
    priestProfileId = priestProfile.id;

    // Disponibilidade cobrindo todos os dias da semana, para não depender
    // de qual dia o teste roda.
    for (let weekday = 0; weekday <= 6; weekday++) {
      await createAvailability({
        parishId,
        priestProfileId,
        weekday,
        startTime: "00:00",
        endTime: "23:30",
        type: "atendimento",
        slotMinutes: 30,
      });
    }
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("gera horários futuros a partir da disponibilidade cadastrada", async () => {
    const slots = await getAvailableSlots(parishId, priestProfileId, 3);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.startsAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("remove da lista um horário que acabou de ser reservado", async () => {
    const [firstSlot] = await getAvailableSlots(parishId, priestProfileId, 3);
    expect(firstSlot).toBeDefined();

    await createAppointment({
      parishId,
      priestProfileId,
      fielUserId: fielId,
      category: "conversa",
      scheduledAt: firstSlot!.startsAt,
    });

    const slotsAfter = await getAvailableSlots(parishId, priestProfileId, 3);
    const stillThere = slotsAfter.some((s) => s.startsAt.getTime() === firstSlot!.startsAt.getTime());
    expect(stillThere).toBe(false);
  });

  it("rejeita reservar o mesmo horário duas vezes", async () => {
    const slots = await getAvailableSlots(parishId, priestProfileId, 3);
    const slot = slots[1];
    expect(slot).toBeDefined();

    await createAppointment({
      parishId,
      priestProfileId,
      fielUserId: fielId,
      category: "conversa",
      scheduledAt: slot!.startsAt,
    });

    await expect(
      createAppointment({
        parishId,
        priestProfileId,
        fielUserId: fielId,
        category: "outro",
        scheduledAt: slot!.startsAt,
      }),
    ).rejects.toThrow();
  });

  it("a lista de sacerdotes diz quem tem horário ANTES do toque", async () => {
    // Sem isso, quem procura confissão escolhe um nome, chega na tela de
    // agendar e só ali descobre que aquele padre não abriu horário nenhum.
    const comVagas = await listPriestsWithOpenings(parishId);
    const nosso = comVagas.find((p) => p.id === priestProfileId);

    expect(nosso?.vagas).toBeGreaterThan(0);
  });

  it("sacerdote sem disponibilidade aparece na lista, com zero horários", async () => {
    // Aparecer importa: ele continua sendo alguém da paróquia. O que não
    // pode é a lista prometer horário que não existe.
    const semAgenda = await registerUser({
      fullName: "Padre Sem Agenda",
      email: `padre-sem-agenda-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(semAgenda.id);

    const perfil = await withTenantContext(parishId, (tx) =>
      tx.priestProfile.create({ data: { userId: semAgenda.id, parishId, title: "Vigário" } }),
    );

    const comVagas = await listPriestsWithOpenings(parishId);
    expect(comVagas.map((p) => p.id)).toContain(perfil.id);
    expect(comVagas.find((p) => p.id === perfil.id)?.vagas).toBe(0);
  });
});