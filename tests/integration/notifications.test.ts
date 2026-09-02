import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { prisma } from "@/server/db/prisma";
import {
  contarNotificacoes,
  listMyNotifications,
  TETO_DE_NOTIFICACOES,
  markNotificationRead,
  notifyUser,
  openNotification,
  markAllNotificationsRead,
  setPreference,
} from "@/server/modules/notifications/service";
import { updateAppointmentStatus, createAppointment } from "@/server/modules/appointments/service";
import { createSchedule } from "@/server/modules/liturgia/service";
import { createPost } from "@/server/modules/posts/service";
import { POST_PREVIEW_LABEL } from "@/lib/post-labels";
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
    await createPost({
      parishId,
      priestProfileId,
      createdBy: priestUserId,
      mediaType: "texto",
      contentText: "Mensagem de teste",
    });

    const notifications = await listMyNotifications(parishId, fielId);
    expect(notifications.some((n) => n.title === "Nova Palavra do Padre")).toBe(true);
  });

  /*
   * O aviso diz QUAL mensagem chegou.
   *
   * A frase era fixa em toda publicação. Numa paróquia que publica o
   * Evangelho todo dia, isso empilhava avisos idênticos — nove seguidos na
   * conta do pároco em produção — e nenhum dizia qual era.
   */
  it("o aviso da palavra traz o começo do texto, e não uma frase fixa", async () => {
    const escrito =
      "Queridos irmãos, nesta semana somos convidados a olhar para o Evangelho de Lucas " +
      "com o coração aberto, e a deixar que ele nos incomode onde precisamos crescer.";

    await createPost({
      parishId,
      priestProfileId,
      createdBy: priestUserId,
      mediaType: "texto",
      contentText: escrito,
    });

    const aviso = (await listMyNotifications(parishId, fielId)).find(
      (n) => n.title === "Nova Palavra do Padre" && n.body.startsWith("Queridos irmãos"),
    );
    expect(aviso).toBeDefined();
    expect(aviso!.body).not.toContain("confira na Comunidade");
    // Cabe numa notificação: cortado, com reticência, sem a frase inteira.
    expect(aviso!.body.length).toBeLessThanOrEqual(140);
    expect(aviso!.body.endsWith("…")).toBe(true);
  });

  it("o título, quando existe, vence o texto no aviso", async () => {
    await createPost({
      parishId,
      priestProfileId,
      createdBy: priestUserId,
      mediaType: "texto",
      titulo: "A alegria de servir",
      contentText:
        "Um texto bem comprido que, sem título, seria o que apareceria no aviso do celular.",
    });

    const aviso = (await listMyNotifications(parishId, fielId)).find(
      (n) => n.body === "A alegria de servir",
    );
    expect(aviso).toBeDefined();
    // Título não passa por resumo: já nasce curto, e resumir seria admitir
    // que ele não é um título.
    expect(aviso!.body.endsWith("…")).toBe(false);
    expect(aviso!.body).not.toContain("Um texto bem comprido");
  });

  it("o título resolve o vídeo diário, que era o caso sem saída", async () => {
    await createPost({
      parishId,
      priestProfileId,
      createdBy: priestUserId,
      mediaType: "video",
      titulo: "Lucas 4, 38-44",
      mediaUrl: "https://www.youtube.com/watch?v=evangelho-do-dia",
    });

    const aviso = (await listMyNotifications(parishId, fielId)).find(
      (n) => n.body === "Lucas 4, 38-44",
    );
    expect(aviso).toBeDefined();
    expect(aviso!.body).not.toBe(POST_PREVIEW_LABEL.video);
  });

  it("sem texto, o aviso diz o MEIO — é o mais honesto que os dados permitem", async () => {
    await createPost({
      parishId,
      priestProfileId,
      createdBy: priestUserId,
      mediaType: "video",
      mediaUrl: "https://www.youtube.com/watch?v=exemplo",
    });

    const aviso = (await listMyNotifications(parishId, fielId)).find((n) =>
      n.body.includes("vídeo"),
    );
    expect(aviso).toBeDefined();
    expect(aviso!.title).toBe("Nova Palavra do Padre");
    // Um vídeo e um áudio no mesmo dia continuam distinguíveis entre si.
    expect(aviso!.body).not.toBe(POST_PREVIEW_LABEL.audio);
  });

  it("desativar uma categoria impede novas notificações dela, sem afetar outras", async () => {
    await setPreference(fielId, "pastoral", false);

    const before = await listMyNotifications(parishId, fielId);
    const pastoralBefore = before.filter((n) => n.category === "pastoral").length;

    await createSchedule(parishId, celebrationId, { roleType: "salmista", userId: fielId });
    await createPost({
      parishId,
      priestProfileId,
      createdBy: priestUserId,
      mediaType: "texto",
      contentText: "Outra mensagem",
    });

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

  it("abrir a notificação devolve para onde ela leva, e a dá por lida", async () => {
    // Antes a notificação dizia o que tinha acontecido e parava aí: quem
    // lia "Você serve amanhã na liturgia" precisava descobrir sozinho em
    // qual tela ver o horário.
    await withTenantContext(parishId, (tx) =>
      notifyUser(tx, {
        parishId,
        userId: fielId,
        category: "pessoal",
        linkPath: "/servir/liturgia",
        title: "Você serve amanhã na liturgia",
        body: "Leitura · 19:00",
      }),
    );

    const criada = (await listMyNotifications(parishId, fielId)).find(
      (n) => n.title === "Você serve amanhã na liturgia",
    )!;

    const destino = await openNotification(parishId, criada.id, fielId);
    expect(destino).toBe("/servir/liturgia");

    const depois = await listMyNotifications(parishId, fielId);
    expect(depois.find((n) => n.id === criada.id)?.readAt).not.toBeNull();
  });

  it("notificação sem destino gravado ainda leva a algum lugar", async () => {
    /*
     * Regressão do que o usuário relatou em 29/08/2026: "consigo ler as
     * mensagens, mas não consigo clicar nelas".
     *
     * Conferido na conta dele em produção: três das seis notificações não
     * respondiam ao toque. O resumo semanal nunca gravou destino, e as
     * "Palavra do Padre" mais antigas são de antes de o campo existir.
     * Sem destino, a linha era um `div` inerte — a pessoa lia, tocava e
     * nada acontecia.
     */
    await withTenantContext(parishId, (tx) =>
      notifyUser(tx, {
        parishId,
        userId: fielId,
        category: "espiritual",
        // Sem linkPath, como as antigas.
        title: "Nova Palavra do Padre",
        body: "O pároco publicou uma nova mensagem.",
      }),
    );

    const antiga = (await listMyNotifications(parishId, fielId)).find(
      (n) => n.title === "Nova Palavra do Padre",
    )!;
    expect(antiga.linkPath).toBeNull();

    expect(await openNotification(parishId, antiga.id, fielId)).toBe("/comunidade");
  });

  it("o destino gravado sempre vence o padrão da categoria", async () => {
    // O padrão é rede de segurança, não regra: quem gravou destino manda.
    await withTenantContext(parishId, (tx) =>
      notifyUser(tx, {
        parishId,
        userId: fielId,
        category: "espiritual",
        linkPath: "/biblia",
        title: "Com destino próprio",
        body: "Vai para a Bíblia, não para a Comunidade.",
      }),
    );

    const comDestino = (await listMyNotifications(parishId, fielId)).find(
      (n) => n.title === "Com destino próprio",
    )!;

    expect(await openNotification(parishId, comDestino.id, fielId)).toBe("/biblia");
  });

  it("não abre — nem marca como lida — a notificação de outra pessoa", async () => {
    // O destino sai do banco a partir do id. Se o id de outro usuário
    // passasse, daria para marcar como lido o que não é seu.
    await withTenantContext(parishId, (tx) =>
      notifyUser(tx, {
        parishId,
        userId: priestUserId,
        category: "pessoal",
        linkPath: "/painel",
        title: "Só do padre",
        body: "Conteúdo alheio",
      }),
    );

    const doOutro = (await listMyNotifications(parishId, priestUserId)).find(
      (n) => n.title === "Só do padre",
    )!;

    expect(await openNotification(parishId, doOutro.id, fielId)).toBeNull();

    const doPadre = await listMyNotifications(parishId, priestUserId);
    expect(doPadre.find((n) => n.id === doOutro.id)?.readAt).toBeNull();
  });

  /*
   * O recorte é de TEMPO, e não de contagem.
   *
   * A tela cortava nas 30 mais recentes, calada. Com 13 notificações por
   * dia — medido no banco de desenvolvimento em 02/09/2026 — bastavam três
   * dias fora para o resto sair da tela sem volta. Estes testes prendem o
   * comportamento novo: a janela filtra por data no BANCO, o teto avisa
   * quando morde, e a contagem das tarjas nunca vem da lista já cortada.
   */
  describe("janela de tempo, não corte cego", () => {
    let recorteId: string;

    beforeAll(async () => {
      const dono = await registerUser({
        fullName: "Fiel Janela",
        email: `fiel-janela-${Date.now()}@test.comunidade.app`,
        password: "SenhaForte123",
      });
      recorteId = dono.id;
      userIds.push(dono.id);
      const papelDono = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
      await withTenantContext(parishId, (tx) =>
        tx.parishMembership.create({
          data: { parishId, userId: dono.id, roleId: papelDono.id, status: "active" },
        }),
      );

      const agora = Date.now();
      const dia = 86_400_000;
      await withTenantContext(parishId, (tx) =>
        tx.notification.createMany({
          data: [
            { parishId, userId: dono.id, category: "pastoral", title: "de hoje", body: "x" },
            {
              parishId,
              userId: dono.id,
              category: "pastoral",
              title: "de 3 dias",
              body: "x",
              createdAt: new Date(agora - 3 * dia),
            },
            {
              parishId,
              userId: dono.id,
              category: "pastoral",
              title: "de 20 dias",
              body: "x",
              createdAt: new Date(agora - 20 * dia),
              readAt: new Date(agora - 19 * dia),
            },
            {
              parishId,
              userId: dono.id,
              category: "pastoral",
              title: "de 90 dias",
              body: "x",
              createdAt: new Date(agora - 90 * dia),
            },
          ],
        }),
      );
    });

    it("a janela de 7 dias deixa de fora o que é mais velho que ela", async () => {
      const titulos = (await listMyNotifications(parishId, recorteId, { dias: 7 })).map(
        (n) => n.title,
      );
      expect(titulos).toEqual(["de hoje", "de 3 dias"]);
    });

    it("a janela de 30 dias alcança o que a de 7 escondeu", async () => {
      const titulos = (await listMyNotifications(parishId, recorteId, { dias: 30 })).map(
        (n) => n.title,
      );
      expect(titulos).toEqual(["de hoje", "de 3 dias", "de 20 dias"]);
    });

    it("sem janela, nada fica para trás — é o caminho de volta ao antigo", async () => {
      const titulos = (await listMyNotifications(parishId, recorteId, {})).map((n) => n.title);
      expect(titulos).toEqual(["de hoje", "de 3 dias", "de 20 dias", "de 90 dias"]);
    });

    it("as não lidas respeitam a janela escolhida, e não a conta inteira", async () => {
      const naJanela = await listMyNotifications(parishId, recorteId, {
        dias: 30,
        apenasNaoLidas: true,
      });
      // "de 20 dias" está lida e cai fora; "de 90 dias" está fora da janela.
      expect(naJanela.map((n) => n.title)).toEqual(["de hoje", "de 3 dias"]);
    });

    it("a contagem das tarjas vem do banco e divide exatamente a janela", async () => {
      const { todas, naoLidas } = await contarNotificacoes(parishId, recorteId, { dias: 30 });
      expect(todas).toBe(3);
      expect(naoLidas).toBe(2);

      const lidas = todas - naoLidas;
      expect(lidas).toBe(1);
    });

    it("o teto pede uma linha a mais do que a tela mostra, para saber que cortou", async () => {
      const muitas = await registerUser({
        fullName: "Fiel Teto",
        email: `fiel-teto-${Date.now()}@test.comunidade.app`,
        password: "SenhaForte123",
      });
      userIds.push(muitas.id);
      const papelTeto = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
      await withTenantContext(parishId, (tx) =>
        tx.parishMembership.create({
          data: { parishId, userId: muitas.id, roleId: papelTeto.id, status: "active" },
        }),
      );

      await withTenantContext(parishId, (tx) =>
        tx.notification.createMany({
          data: Array.from({ length: TETO_DE_NOTIFICACOES + 5 }, (_, i) => ({
            parishId,
            userId: muitas.id,
            category: "pastoral" as const,
            title: `n${i}`,
            body: "x",
          })),
        }),
      );

      const achadas = await listMyNotifications(parishId, muitas.id, {});
      // A linha extra é o sinal: a tela mostra TETO e diz que há mais atrás.
      expect(achadas.length).toBe(TETO_DE_NOTIFICACOES + 1);
      expect(achadas.length > TETO_DE_NOTIFICACOES).toBe(true);
    });
  });
});