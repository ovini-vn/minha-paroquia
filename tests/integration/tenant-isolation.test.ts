import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { acceptInvitation, createInvitation } from "@/server/modules/invitations/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O teste mais importante desta fase (docs/FUNDACAO.md, seção 13): garante
 * que a política de Row-Level Security de fato bloqueia acesso cross-tenant,
 * não só que o código da aplicação "esqueceu de perguntar" pela paróquia
 * errada. Ver prisma/rls-policies.sql.
 */
describe("isolamento multi-paróquia (RLS)", () => {
  let parishAId: string;
  let parishBId: string;
  let userAId: string;
  let priestProfileId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const parishA = await registerParish({ name: `Paróquia Isolamento A ${Date.now()}` });
    const parishB = await registerParish({ name: `Paróquia Isolamento B ${Date.now()}` });
    parishAId = parishA.id;
    parishBId = parishB.id;
    parishIds.push(parishA.id, parishB.id);

    const creator = await registerUser({
      fullName: "Criador A",
      email: `criador-a-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fielA = await registerUser({
      fullName: "Fiel A",
      email: `fiel-a-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userAId = fielA.id;
    userIds.push(creator.id, fielA.id);

    const invitation = await createInvitation({ parishId: parishA.id, createdBy: creator.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: invitation.code, userId: fielA.id });

    await withTenantContext(parishAId, (tx) =>
      tx.celebration.create({
        data: { parishId: parishAId, type: "missa", startsAt: new Date(Date.now() + 86400000), createdBy: creator.id },
      }),
    );

    const priestProfile = await withTenantContext(parishAId, (tx) =>
      tx.priestProfile.create({ data: { userId: creator.id, parishId: parishAId, title: "Sacerdote" } }),
    );
    priestProfileId = priestProfile.id;
    await withTenantContext(parishAId, (tx) =>
      tx.post.create({
        data: { parishId: parishAId, priestProfileId: priestProfile.id, mediaType: "texto", contentText: "Teste" },
      }),
    );

    await withTenantContext(parishAId, (tx) =>
      tx.priestAvailability.create({
        data: { parishId: parishAId, priestProfileId: priestProfile.id, weekday: 1, startTime: "09:00", endTime: "10:00" },
      }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.appointment.create({
        data: {
          parishId: parishAId,
          priestProfileId: priestProfile.id,
          fielUserId: userAId,
          category: "conversa",
          scheduledAt: new Date(Date.now() + 86400000),
        },
      }),
    );
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("não retorna o vínculo do usuário A ao consultar dentro do contexto da paróquia B", async () => {
    const rows = await withTenantContext(parishBId, (tx) =>
      tx.parishMembership.findMany({ where: { userId: userAId } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("ignora um WHERE parish_id manipulado apontando para a paróquia A dentro do contexto B", async () => {
    const rows = await withTenantContext(parishBId, (tx) =>
      tx.parishMembership.findMany({ where: { parishId: parishAId } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("retorna o vínculo normalmente dentro do contexto correto (paróquia A)", async () => {
    const rows = await withTenantContext(parishAId, (tx) =>
      tx.parishMembership.findMany({ where: { userId: userAId } }),
    );
    expect(rows).toHaveLength(1);
  });

  it("não retorna celebrações da paróquia A dentro do contexto da paróquia B", async () => {
    const rows = await withTenantContext(parishBId, (tx) => tx.celebration.findMany({ where: { parishId: parishAId } }));
    expect(rows).toHaveLength(0);
  });

  it("retorna a celebração normalmente dentro do contexto correto (paróquia A)", async () => {
    const rows = await withTenantContext(parishAId, (tx) => tx.celebration.findMany({}));
    expect(rows).toHaveLength(1);
  });

  it("não retorna posts da paróquia A dentro do contexto da paróquia B", async () => {
    const rows = await withTenantContext(parishBId, (tx) => tx.post.findMany({ where: { parishId: parishAId } }));
    expect(rows).toHaveLength(0);
  });

  it("retorna o post normalmente dentro do contexto correto (paróquia A)", async () => {
    const rows = await withTenantContext(parishAId, (tx) => tx.post.findMany({}));
    expect(rows).toHaveLength(1);
  });

  it("não retorna disponibilidade nem agendamentos da paróquia A dentro do contexto da paróquia B", async () => {
    const availability = await withTenantContext(parishBId, (tx) =>
      tx.priestAvailability.findMany({ where: { priestProfileId } }),
    );
    const appointments = await withTenantContext(parishBId, (tx) =>
      tx.appointment.findMany({ where: { priestProfileId } }),
    );
    expect(availability).toHaveLength(0);
    expect(appointments).toHaveLength(0);
  });

  it("retorna disponibilidade e agendamentos normalmente dentro do contexto correto (paróquia A)", async () => {
    const availability = await withTenantContext(parishAId, (tx) => tx.priestAvailability.findMany({}));
    const appointments = await withTenantContext(parishAId, (tx) => tx.appointment.findMany({}));
    expect(availability).toHaveLength(1);
    expect(appointments).toHaveLength(1);
  });

  it("não retorna perfis de voluntário, oportunidades nem interesses da paróquia A dentro do contexto B", async () => {
    const opportunity = await withTenantContext(parishAId, (tx) =>
      tx.serviceOpportunity.create({ data: { parishId: parishAId, title: "Teste", createdBy: userAId } }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.volunteerProfile.create({ data: { userId: userAId, parishId: parishAId } }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.serviceInterest.create({
        data: { opportunityId: opportunity.id, userId: userAId, parishId: parishAId },
      }),
    );

    const volunteers = await withTenantContext(parishBId, (tx) => tx.volunteerProfile.findMany({ where: { userId: userAId } }));
    const opportunities = await withTenantContext(parishBId, (tx) => tx.serviceOpportunity.findMany({ where: { parishId: parishAId } }));
    const interests = await withTenantContext(parishBId, (tx) => tx.serviceInterest.findMany({ where: { parishId: parishAId } }));
    expect(volunteers).toHaveLength(0);
    expect(opportunities).toHaveLength(0);
    expect(interests).toHaveLength(0);
  });

  it("retorna perfis de voluntário, oportunidades e interesses normalmente dentro do contexto correto (paróquia A)", async () => {
    const volunteers = await withTenantContext(parishAId, (tx) => tx.volunteerProfile.findMany({}));
    const opportunities = await withTenantContext(parishAId, (tx) => tx.serviceOpportunity.findMany({}));
    const interests = await withTenantContext(parishAId, (tx) => tx.serviceInterest.findMany({}));
    expect(volunteers).toHaveLength(1);
    expect(opportunities).toHaveLength(1);
    expect(interests).toHaveLength(1);
  });

  it("não retorna participações, sacramentos nem confissões da paróquia A dentro do contexto B", async () => {
    await withTenantContext(parishAId, (tx) =>
      tx.massParticipation.create({
        data: { parishId: parishAId, userId: userAId, participatedAt: new Date(), reflectionText: "Teste" },
      }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.sacrament.create({
        data: { parishId: parishAId, userId: userAId, type: "batismo", date: new Date() },
      }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.confessionLog.create({ data: { parishId: parishAId, userId: userAId, date: new Date() } }),
    );

    const participations = await withTenantContext(parishBId, (tx) => tx.massParticipation.findMany({ where: { userId: userAId } }));
    const sacraments = await withTenantContext(parishBId, (tx) => tx.sacrament.findMany({ where: { userId: userAId } }));
    const confessions = await withTenantContext(parishBId, (tx) => tx.confessionLog.findMany({ where: { userId: userAId } }));
    expect(participations).toHaveLength(0);
    expect(sacraments).toHaveLength(0);
    expect(confessions).toHaveLength(0);
  });

  it("retorna participações, sacramentos e confissões normalmente dentro do contexto correto (paróquia A)", async () => {
    const participations = await withTenantContext(parishAId, (tx) => tx.massParticipation.findMany({}));
    const sacraments = await withTenantContext(parishAId, (tx) => tx.sacrament.findMany({}));
    const confessions = await withTenantContext(parishAId, (tx) => tx.confessionLog.findMany({}));
    expect(participations).toHaveLength(1);
    expect(sacraments).toHaveLength(1);
    expect(confessions).toHaveLength(1);
  });

  it("não retorna família nem catequese da paróquia A dentro do contexto B", async () => {
    const familyMember = await withTenantContext(parishAId, (tx) =>
      tx.familyMember.create({
        data: { parishId: parishAId, responsibleUserId: userAId, fullName: "Dependente Teste", relationship: "filho" },
      }),
    );
    const group = await withTenantContext(parishAId, (tx) =>
      tx.catechismGroup.create({ data: { parishId: parishAId, name: "Turma Teste", year: 2026 } }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.catechismEnrollment.create({
        data: { parishId: parishAId, catechismGroupId: group.id, familyMemberId: familyMember.id },
      }),
    );

    const familyMembers = await withTenantContext(parishBId, (tx) => tx.familyMember.findMany({ where: { responsibleUserId: userAId } }));
    const groups = await withTenantContext(parishBId, (tx) => tx.catechismGroup.findMany({ where: { parishId: parishAId } }));
    const enrollments = await withTenantContext(parishBId, (tx) => tx.catechismEnrollment.findMany({ where: { parishId: parishAId } }));
    expect(familyMembers).toHaveLength(0);
    expect(groups).toHaveLength(0);
    expect(enrollments).toHaveLength(0);
  });

  it("retorna família e catequese normalmente dentro do contexto correto (paróquia A)", async () => {
    const familyMembers = await withTenantContext(parishAId, (tx) => tx.familyMember.findMany({}));
    const groups = await withTenantContext(parishAId, (tx) => tx.catechismGroup.findMany({}));
    const enrollments = await withTenantContext(parishAId, (tx) => tx.catechismEnrollment.findMany({}));
    expect(familyMembers).toHaveLength(1);
    expect(groups).toHaveLength(1);
    expect(enrollments).toHaveLength(1);
  });

  it("não retorna disponibilidade nem escala litúrgica da paróquia A dentro do contexto B", async () => {
    const celebration = await withTenantContext(parishAId, (tx) => tx.celebration.findFirstOrThrow({}));
    await withTenantContext(parishAId, (tx) =>
      tx.liturgicalAvailability.create({
        data: { parishId: parishAId, userId: userAId, roleType: "leitor" },
      }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.liturgicalSchedule.create({
        data: { parishId: parishAId, celebrationId: celebration.id, roleType: "leitor", userId: userAId },
      }),
    );

    const availability = await withTenantContext(parishBId, (tx) => tx.liturgicalAvailability.findMany({ where: { userId: userAId } }));
    const schedule = await withTenantContext(parishBId, (tx) => tx.liturgicalSchedule.findMany({ where: { userId: userAId } }));
    expect(availability).toHaveLength(0);
    expect(schedule).toHaveLength(0);
  });

  it("retorna disponibilidade e escala litúrgica normalmente dentro do contexto correto (paróquia A)", async () => {
    const availability = await withTenantContext(parishAId, (tx) => tx.liturgicalAvailability.findMany({}));
    const schedule = await withTenantContext(parishAId, (tx) => tx.liturgicalSchedule.findMany({}));
    expect(availability).toHaveLength(1);
    expect(schedule).toHaveLength(1);
  });

  it("não retorna participação de dízimo da paróquia A dentro do contexto B", async () => {
    await withTenantContext(parishAId, (tx) =>
      tx.titheParticipation.create({
        data: { parishId: parishAId, userId: userAId, period: "2026-08", registeredBy: userAId },
      }),
    );

    const rows = await withTenantContext(parishBId, (tx) => tx.titheParticipation.findMany({ where: { userId: userAId } }));
    expect(rows).toHaveLength(0);
  });

  it("retorna participação de dízimo normalmente dentro do contexto correto (paróquia A)", async () => {
    const rows = await withTenantContext(parishAId, (tx) => tx.titheParticipation.findMany({}));
    expect(rows).toHaveLength(1);
  });

  it("não retorna notificações da paróquia A dentro do contexto B", async () => {
    await withTenantContext(parishAId, (tx) =>
      tx.notification.create({
        data: { parishId: parishAId, userId: userAId, category: "espiritual", title: "Teste", body: "Teste" },
      }),
    );

    const rows = await withTenantContext(parishBId, (tx) => tx.notification.findMany({ where: { userId: userAId } }));
    expect(rows).toHaveLength(0);
  });

  it("retorna notificações normalmente dentro do contexto correto (paróquia A)", async () => {
    const rows = await withTenantContext(parishAId, (tx) => tx.notification.findMany({}));
    expect(rows).toHaveLength(1);
  });

  it("não retorna eventos nem avisos da paróquia A dentro do contexto da paróquia B", async () => {
    await withTenantContext(parishAId, (tx) =>
      tx.event.create({
        data: { parishId: parishAId, title: "Festa Teste", startsAt: new Date(Date.now() + 86400000), createdBy: userAId },
      }),
    );
    await withTenantContext(parishAId, (tx) =>
      tx.aviso.create({ data: { parishId: parishAId, title: "Aviso Teste", body: "Corpo do aviso", createdBy: userAId } }),
    );

    const events = await withTenantContext(parishBId, (tx) => tx.event.findMany({ where: { parishId: parishAId } }));
    const avisos = await withTenantContext(parishBId, (tx) => tx.aviso.findMany({ where: { parishId: parishAId } }));
    expect(events).toHaveLength(0);
    expect(avisos).toHaveLength(0);
  });

  it("retorna eventos e avisos normalmente dentro do contexto correto (paróquia A)", async () => {
    const events = await withTenantContext(parishAId, (tx) => tx.event.findMany({}));
    const avisos = await withTenantContext(parishAId, (tx) => tx.aviso.findMany({}));
    expect(events).toHaveLength(1);
    expect(avisos).toHaveLength(1);
  });

  it("não retorna pedidos de oração da paróquia A dentro do contexto da paróquia B", async () => {
    await withTenantContext(parishAId, (tx) =>
      tx.prayerRequest.create({
        data: { parishId: parishAId, requesterUserId: userAId, contentText: "Teste", visibility: "padre" },
      }),
    );

    const rows = await withTenantContext(parishBId, (tx) => tx.prayerRequest.findMany({ where: { parishId: parishAId } }));
    expect(rows).toHaveLength(0);
  });

  it("retorna pedidos de oração normalmente dentro do contexto correto (paróquia A)", async () => {
    const rows = await withTenantContext(parishAId, (tx) => tx.prayerRequest.findMany({}));
    expect(rows).toHaveLength(1);
  });
});
