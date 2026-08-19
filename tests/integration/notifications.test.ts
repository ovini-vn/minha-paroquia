import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { prisma } from "@/server/db/prisma";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setPreference,
} from "@/server/modules/notifications/service";
import { updateAppointmentStatus, createAppointment } from "@/server/modules/appointments/service";
import { createSchedule } from "@/server/modules/liturgia/service";
import { createPost } from "@/server/modules/posts/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("notificações: preferência, escopo por usuário e gatilhos", () => {
  let parishId: string;
  let fielId: string;
  let priestUserId: string;
  let priestProfileId: string;
  let celebrationId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Notificações ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const fiel = await registerUser({
      fullName: "Fiel Notificações",
      email: `fiel-notif-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const priest = await registerUser({
      fullName: "Padre Notificações",
      email: `padre-notif-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    priestUserId = priest.id;
    userIds.push(fiel.id, priest.id);

    const priestProfile = await withTenantContext(parishId, (tx) =>
      tx.priestProfile.create({ data: { userId: priestUserId, parishId, title: "Sacerdote" } }),
    );
    priestProfileId = priestProfile.id;

    const celebration = await withTenantContext(parishId, (tx) =>
      tx.celebration.create({
        data: { parishId, type: "missa", startsAt: new Date(Date.now() + 86400000), createdBy: priestUserId },
      }),
    );
    celebrationId = celebration.id;

    // Broadcast de "Palavra do Padre" notifica parish_memberships ativas —
    // sem um vínculo, o fiel não conta como membro para receber o aviso.
    const fielRole = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
    await withTenantContext(parishId, (tx) =>
      tx.parishMembership.create({ data: { userId: fielId, parishId, roleId: fielRole.id, status: "active" } }),
    );
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("confirmar um atendimento notifica o fiel", async () => {
    const appointment = await createAppointment({
      parishId,
      priestProfileId,
      fielUserId: fielId,
      category: "conversa",
      scheduledAt: new Date(Date.now() + 3600_000),
    });

    await updateAppointmentStatus(parishId, appointment.id, priestProfileId, "confirmado");

    const notifications = await listMyNotifications(parishId, fielId);
    expect(notifications.some((n) => n.title === "Atendimento confirmado")).toBe(true);
  });

  it("ser escalado na liturgia notifica quem foi escalado", async () => {
    await createSchedule(parishId, celebrationId, { roleType: "leitor", userId: fielId });

    const notifications = await listMyNotifications(parishId, fielId);
    expect(notifications.some((n) => n.title === "Você foi escalado na liturgia")).toBe(true);
  });

  it("publicar uma palavra do padre notifica os membros ativos da paróquia", async () => {
    await createPost({ parishId, priestProfileId, mediaType: "texto", contentText: "Mensagem de teste" });

    const notifications = await listMyNotifications(parishId, fielId);
    expect(notifications.some((n) => n.title === "Nova Palavra do Padre")).toBe(true);
  });

  it("desativar uma categoria impede novas notificações dela, sem afetar outras", async () => {
    await setPreference(fielId, "pastoral", false);

    const before = await listMyNotifications(parishId, fielId);
    const pastoralBefore = before.filter((n) => n.category === "pastoral").length;

    await createSchedule(parishId, celebrationId, { roleType: "salmista", userId: fielId });
    await createPost({ parishId, priestProfileId, mediaType: "texto", contentText: "Outra mensagem" });

    const after = await listMyNotifications(parishId, fielId);
    const pastoralAfter = after.filter((n) => n.category === "pastoral").length;
    const espiritualAfter = after.filter((n) => n.category === "espiritual").length;

    expect(pastoralAfter).toBe(pastoralBefore);
    expect(espiritualAfter).toBeGreaterThan(0);

    await setPreference(fielId, "pastoral", true);
  });

  it("não permite marcar como lida a notificação de outro usuário", async () => {
    const [notification] = await listMyNotifications(parishId, fielId);
    if (!notification) throw new Error("esperava ao menos uma notificação prévia para o teste");

    const resultAsOther = await markNotificationRead(parishId, notification.id, priestUserId);
    expect(resultAsOther.count).toBe(0);

    const resultAsOwner = await markNotificationRead(parishId, notification.id, fielId);
    expect(resultAsOwner.count).toBe(1);
  });

  it("marcar todas como lidas só afeta as do próprio usuário", async () => {
    const result = await markAllNotificationsRead(parishId, fielId);
    expect(result.count).toBeGreaterThanOrEqual(0);

    const remaining = await listMyNotifications(parishId, fielId);
    expect(remaining.every((n) => n.readAt !== null)).toBe(true);
  });
});
