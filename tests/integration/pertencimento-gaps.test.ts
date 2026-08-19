import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { acceptInvitation, createInvitation } from "@/server/modules/invitations/service";
import { updateOwnParishProfile, getParish } from "@/server/modules/parishes/service";
import { updateOwnProfile } from "@/server/modules/users/service";
import { findUserById } from "@/server/modules/users/repository";
import {
  createEvent,
  listUpcomingEvents,
  listAllEvents,
  updateEvent,
  setEventStatus,
} from "@/server/modules/events/service";
import {
  createAviso,
  listPublishedAvisos,
  listAllAvisos,
  updateAviso,
  setAvisoStatus,
} from "@/server/modules/avisos/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("fechamento de lacunas — Pertencimento + Minha Comunidade", () => {
  let parishId: string;
  let secondParishId: string;
  let adminId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Lacunas ${Date.now()}` });
    const secondParish = await registerParish({ name: `Segunda Paróquia Lacunas ${Date.now()}` });
    parishId = parish.id;
    secondParishId = secondParish.id;
    parishIds.push(parish.id, secondParish.id);

    const admin = await registerUser({
      fullName: "Admin Lacunas",
      email: `admin-lacunas-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fiel = await registerUser({
      fullName: "Fiel Lacunas",
      email: `fiel-lacunas-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    adminId = admin.id;
    fielId = fiel.id;
    userIds.push(admin.id, fiel.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("aceitar um convite sempre vincula à paróquia do convite, nunca a outra", async () => {
    const invitation = await createInvitation({ parishId, createdBy: adminId, type: "link", role: "FIEL" });
    const membership = await acceptInvitation({ code: invitation.code, userId: fielId });
    expect(membership.parishId).toBe(parishId);
    expect(membership.parishId).not.toBe(secondParishId);
  });

  it("atualiza o perfil da paróquia (endereço, telefone, descrição, logo)", async () => {
    await updateOwnParishProfile(parishId, {
      address: "Rua das Flores, 123",
      phone: "(11) 99999-0000",
      description: "Uma comunidade acolhedora.",
      logoUrl: "https://example.com/logo.png",
    });

    const parish = await getParish(parishId);
    expect(parish?.address).toBe("Rua das Flores, 123");
    expect(parish?.phone).toBe("(11) 99999-0000");
    expect(parish?.description).toBe("Uma comunidade acolhedora.");
    expect(parish?.logoUrl).toBe("https://example.com/logo.png");
  });

  it("o fiel edita o próprio perfil (nome, telefone, data de nascimento, foto)", async () => {
    await updateOwnProfile(fielId, {
      fullName: "Fiel Lacunas Editado",
      phone: "(11) 98888-0000",
      birthDate: new Date("1990-05-20"),
      photoUrl: "https://example.com/foto.jpg",
    });

    const user = await findUserById(fielId);
    expect(user?.fullName).toBe("Fiel Lacunas Editado");
    expect(user?.phone).toBe("(11) 98888-0000");
    expect(user?.birthDate?.toISOString().slice(0, 10)).toBe("1990-05-20");
    expect(user?.photoUrl).toBe("https://example.com/foto.jpg");
  });

  it("editar um evento atualiza os dados; arquivar remove da listagem pública sem apagar o registro", async () => {
    const event = await createEvent({
      parishId,
      createdBy: adminId,
      title: "Festa Original",
      startsAt: new Date(Date.now() + 86400000),
    });

    await updateEvent(parishId, event.id, {
      title: "Festa Atualizada",
      startsAt: new Date(Date.now() + 172800000),
      description: undefined,
      location: undefined,
    });

    const upcomingBefore = await listUpcomingEvents(parishId);
    expect(upcomingBefore.some((e) => e.title === "Festa Atualizada")).toBe(true);

    await setEventStatus(parishId, event.id, "archived");

    const upcomingAfter = await listUpcomingEvents(parishId);
    expect(upcomingAfter.some((e) => e.id === event.id)).toBe(false);

    const all = await listAllEvents(parishId);
    const archived = all.find((e) => e.id === event.id);
    expect(archived?.status).toBe("archived");
    expect(archived?.title).toBe("Festa Atualizada");
  });

  it("publicar um aviso o torna visível ao fiel; arquivar remove da visualização pública", async () => {
    const aviso = await createAviso({ parishId, createdBy: adminId, title: "Aviso Original", body: "Corpo original" });

    const publishedBefore = await listPublishedAvisos(parishId);
    expect(publishedBefore.some((a) => a.title === "Aviso Original")).toBe(true);

    await updateAviso(parishId, aviso.id, { title: "Aviso Atualizado", body: "Corpo atualizado" });
    await setAvisoStatus(parishId, aviso.id, "archived");

    const publishedAfter = await listPublishedAvisos(parishId);
    expect(publishedAfter.some((a) => a.id === aviso.id)).toBe(false);

    const all = await listAllAvisos(parishId);
    const archived = all.find((a) => a.id === aviso.id);
    expect(archived?.status).toBe("archived");
    expect(archived?.title).toBe("Aviso Atualizado");
  });
});
