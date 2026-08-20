/**
 * Seed de desenvolvimento: papéis/permissões (fonte de verdade em
 * src/server/auth/rbac.ts), uma paróquia demo, e 3 usuários de teste.
 * Roda com: npm run db:seed
 *
 * Import relativo (não "@/...") porque tsx não resolve os path aliases do
 * tsconfig fora do Next.js.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { ensureRolesAndPermissionsSeeded } from "../src/server/auth/seed-rbac";
import { ensurePriestProfile } from "../src/server/modules/priests/ensure-priest-profile";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const prisma = new PrismaClient();

const DEV_PASSWORD = "ComunidadeDev123!";

async function seedDemoParish() {
  const parishProfile = {
    city: "São Paulo",
    state: "SP",
    address: "Rua das Palmeiras, 210 — Centro",
    phone: "(11) 3333-4455",
    description: "Uma comunidade acolhedora, caminhando junto há mais de 40 anos.",
  };
  const parish = await prisma.parish.upsert({
    where: { slug: "nossa-senhora-de-fatima" },
    update: parishProfile,
    create: { name: "Paróquia Nossa Senhora de Fátima", slug: "nossa-senhora-de-fatima", ...parishProfile },
  });

  const passwordHash = await hash(DEV_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const platformAdmin = await prisma.user.upsert({
    where: { email: "vini.bode@gmail.com" },
    update: { isPlatformAdmin: true },
    create: {
      email: "vini.bode@gmail.com",
      fullName: "Vinicius (admin da plataforma)",
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  const paroco = await prisma.user.upsert({
    where: { email: "paroco.demo@comunidade.app" },
    update: {},
    create: { email: "paroco.demo@comunidade.app", fullName: "Pe. João Demo", passwordHash },
  });

  const fiel = await prisma.user.upsert({
    where: { email: "fiel.demo@comunidade.app" },
    update: {},
    create: { email: "fiel.demo@comunidade.app", fullName: "Maria Demo", passwordHash },
  });

  const catequista = await prisma.user.upsert({
    where: { email: "catequista.demo@comunidade.app" },
    update: {},
    create: { email: "catequista.demo@comunidade.app", fullName: "Ana Catequista", passwordHash },
  });

  const parocoRole = await prisma.role.findUniqueOrThrow({ where: { code: "PAROCO" } });
  const fielRole = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });
  const catequistaRole = await prisma.role.findUniqueOrThrow({ where: { code: "CATEQUISTA" } });

  // Seed roda fora do contexto de requisição HTTP: usamos SET LOCAL direto
  // (equivalente a withTenantContext) numa transação simples, já que
  // parish_memberships tem RLS com FORCE ROW LEVEL SECURITY.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_parish_id = '${parish.id}'`);

    const existingParocoMembership = await tx.parishMembership.findFirst({
      where: { userId: paroco.id, status: "active" },
    });
    if (!existingParocoMembership) {
      await tx.parishMembership.create({
        data: { userId: paroco.id, parishId: parish.id, roleId: parocoRole.id, status: "active" },
      });
    }
    await ensurePriestProfile(tx, { userId: paroco.id, parishId: parish.id, roleCode: "PAROCO" });
    await tx.priestProfile.updateMany({
      where: { userId: paroco.id, parishId: parish.id, bio: null },
      data: { bio: "A caminho com vocês há 12 anos, com alegria de servir esta comunidade." },
    });

    const existingFielMembership = await tx.parishMembership.findFirst({
      where: { userId: fiel.id, status: "active" },
    });
    if (!existingFielMembership) {
      await tx.parishMembership.create({
        data: { userId: fiel.id, parishId: parish.id, roleId: fielRole.id, status: "active" },
      });
    }

    const existingCatequistaMembership = await tx.parishMembership.findFirst({
      where: { userId: catequista.id, status: "active" },
    });
    if (!existingCatequistaMembership) {
      await tx.parishMembership.create({
        data: { userId: catequista.id, parishId: parish.id, roleId: catequistaRole.id, status: "active" },
      });
    }

    const priest = await tx.priestProfile.findUniqueOrThrow({
      where: { userId_parishId: { userId: paroco.id, parishId: parish.id } },
    });

    const existingCelebrations = await tx.celebration.count({ where: { parishId: parish.id } });
    if (existingCelebrations === 0) {
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
      nextSunday.setHours(19, 0, 0, 0);

      const nextWednesday = new Date();
      nextWednesday.setDate(nextWednesday.getDate() + ((3 - nextWednesday.getDay() + 7) % 7 || 7));
      nextWednesday.setHours(7, 0, 0, 0);

      await tx.celebration.createMany({
        data: [
          {
            parishId: parish.id,
            type: "missa",
            title: "Missa dominical",
            startsAt: nextSunday,
            location: "Igreja Matriz",
            priestProfileId: priest.id,
            createdBy: paroco.id,
          },
          {
            parishId: parish.id,
            type: "missa",
            title: "Missa da manhã",
            startsAt: nextWednesday,
            location: "Capela Santa Rita",
            priestProfileId: priest.id,
            createdBy: paroco.id,
          },
        ],
      });
    }

    const existingEvents = await tx.event.count({ where: { parishId: parish.id } });
    if (existingEvents === 0) {
      const inThreeWeeks = new Date();
      inThreeWeeks.setDate(inThreeWeeks.getDate() + 21);
      inThreeWeeks.setHours(18, 0, 0, 0);

      await tx.event.create({
        data: {
          parishId: parish.id,
          title: "Festa da Padroeira",
          description: "Celebração, procissão e ação social — todos são bem-vindos.",
          startsAt: inThreeWeeks,
          location: "Salão paroquial",
          createdBy: paroco.id,
        },
      });
    }

    const existingPosts = await tx.post.count({ where: { parishId: parish.id } });
    if (existingPosts === 0) {
      await tx.post.create({
        data: {
          parishId: parish.id,
          priestProfileId: priest.id,
          mediaType: "texto",
          contentText:
            "Que a paz de Cristo esteja com todos vocês. Nesta semana, quero convidar cada um a viver com mais gratidão o dom da comunidade — somos chamados a caminhar juntos, não sozinhos.",
        },
      });
    }

    const existingAvailability = await tx.priestAvailability.count({ where: { parishId: parish.id } });
    if (existingAvailability === 0) {
      await tx.priestAvailability.createMany({
        data: [
          {
            parishId: parish.id,
            priestProfileId: priest.id,
            weekday: 3, // quarta-feira
            startTime: "14:00",
            endTime: "17:00",
            type: "atendimento",
            slotMinutes: 30,
          },
          {
            parishId: parish.id,
            priestProfileId: priest.id,
            weekday: 4, // quinta-feira
            startTime: "18:00",
            endTime: "19:30",
            type: "confissao",
            slotMinutes: 15,
          },
        ],
      });
    }

    const existingOpportunities = await tx.serviceOpportunity.count({ where: { parishId: parish.id } });
    if (existingOpportunities === 0) {
      await tx.serviceOpportunity.create({
        data: {
          parishId: parish.id,
          title: "Festa da Padroeira",
          description: "Precisamos: fotógrafo, recepção, música, organização.",
          createdBy: paroco.id,
        },
      });
    }

    const existingParticipations = await tx.massParticipation.count({ where: { parishId: parish.id, userId: fiel.id } });
    if (existingParticipations === 0) {
      const lastSunday = new Date();
      lastSunday.setDate(lastSunday.getDate() - ((lastSunday.getDay() + 7) % 7 || 7));

      await tx.massParticipation.create({
        data: {
          parishId: parish.id,
          userId: fiel.id,
          participatedAt: lastSunday,
          reflectionText: "Aprendi que a paciência com a família é também uma forma de oração.",
        },
      });
    }

    const existingSacraments = await tx.sacrament.count({ where: { parishId: parish.id, userId: fiel.id } });
    if (existingSacraments === 0) {
      await tx.sacrament.create({
        data: {
          parishId: parish.id,
          userId: fiel.id,
          type: "batismo",
          date: new Date("1998-04-12"),
          location: "Igreja Matriz",
        },
      });
    }

    let cecilia = await tx.familyMember.findFirst({
      where: { parishId: parish.id, responsibleUserId: fiel.id, fullName: "Cecília Demo" },
    });
    if (!cecilia) {
      cecilia = await tx.familyMember.create({
        data: {
          parishId: parish.id,
          responsibleUserId: fiel.id,
          fullName: "Cecília Demo",
          relationship: "filha",
          birthDate: new Date("2016-03-02"),
        },
      });
    }

    for (const guardianUserId of [fiel.id, catequista.id]) {
      const existingGuardian = await tx.familyMemberGuardian.findUnique({
        where: { familyMemberId_userId: { familyMemberId: cecilia.id, userId: guardianUserId } },
      });
      if (!existingGuardian) {
        await tx.familyMemberGuardian.create({
          data: { parishId: parish.id, familyMemberId: cecilia.id, userId: guardianUserId },
        });
      }
    }

    let group = await tx.catechismGroup.findFirst({
      where: { parishId: parish.id, name: "Primeira Eucaristia A" },
    });
    if (!group) {
      group = await tx.catechismGroup.create({
        data: {
          parishId: parish.id,
          name: "Primeira Eucaristia A",
          year: new Date().getFullYear(),
          catechistUserId: catequista.id,
        },
      });
    }

    const existingEnrollment = await tx.catechismEnrollment.findUnique({
      where: { catechismGroupId_familyMemberId: { catechismGroupId: group.id, familyMemberId: cecilia.id } },
    });
    const enrollment =
      existingEnrollment ??
      (await tx.catechismEnrollment.create({
        data: { parishId: parish.id, catechismGroupId: group.id, familyMemberId: cecilia.id },
      }));

    const existingSession = await tx.catechismSession.count({ where: { catechismGroupId: group.id } });
    if (existingSession === 0) {
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
      await tx.catechismSession.create({
        data: { parishId: parish.id, catechismGroupId: group.id, date: nextSaturday, topic: "Os dez mandamentos" },
      });
    }

    const existingRite = await tx.catechismRite.count({ where: { enrollmentId: enrollment.id } });
    if (existingRite === 0) {
      await tx.catechismRite.create({
        data: { parishId: parish.id, enrollmentId: enrollment.id, name: "Rito de Acolhida" },
      });
    }

    const existingLiturgicalAvailability = await tx.liturgicalAvailability.findFirst({
      where: { parishId: parish.id, userId: fiel.id, roleType: "leitor" },
    });
    if (!existingLiturgicalAvailability) {
      await tx.liturgicalAvailability.create({
        data: { parishId: parish.id, userId: fiel.id, roleType: "leitor", weekdayPref: 0 },
      });
    }

    const sundayMass = await tx.celebration.findFirst({
      where: { parishId: parish.id, title: "Missa dominical" },
    });
    if (sundayMass) {
      const existingSchedule = await tx.liturgicalSchedule.findUnique({
        where: {
          celebrationId_roleType_userId: { celebrationId: sundayMass.id, roleType: "leitor", userId: fiel.id },
        },
      });
      if (!existingSchedule) {
        await tx.liturgicalSchedule.create({
          data: { parishId: parish.id, celebrationId: sundayMass.id, roleType: "leitor", userId: fiel.id },
        });
      }
    }

    const existingTithe = await tx.titheParticipation.findUnique({
      where: { userId_period: { userId: fiel.id, period: currentPeriod() } },
    });
    if (!existingTithe) {
      await tx.titheParticipation.create({
        data: { parishId: parish.id, userId: fiel.id, period: currentPeriod(), registeredBy: paroco.id },
      });
    }

    const existingAviso = await tx.aviso.findFirst({ where: { parishId: parish.id } });
    if (!existingAviso) {
      await tx.aviso.create({
        data: {
          parishId: parish.id,
          title: "Mudança de horário neste domingo",
          body: "Atenção: neste domingo a missa das 19h será realizada às 18h.",
          createdBy: paroco.id,
        },
      });
    }

    const existingPrayerRequest = await tx.prayerRequest.findFirst({ where: { parishId: parish.id, requesterUserId: fiel.id } });
    if (!existingPrayerRequest) {
      await tx.prayerRequest.create({
        data: {
          parishId: parish.id,
          requesterUserId: fiel.id,
          contentText: "Peço orações pela saúde da minha família.",
          visibility: "comunidade",
          isAnonymous: false,
        },
      });
    }

    const existingNotification = await tx.notification.findFirst({ where: { parishId: parish.id, userId: fiel.id } });
    if (!existingNotification) {
      await tx.notification.create({
        data: {
          parishId: parish.id,
          userId: fiel.id,
          category: "espiritual",
          title: "Bem-vinda à Comunidade",
          body: "Que alegria ter você conosco! Explore a paróquia pelo app.",
        },
      });
    }
  });

  return { parish, platformAdmin, paroco, fiel, catequista };
}

async function main() {
  await ensureRolesAndPermissionsSeeded();
  const { parish, paroco, fiel, catequista } = await seedDemoParish();

  console.log("\nSeed concluído.\n");
  console.log(`Paróquia demo: ${parish.name} (${parish.slug})\n`);
  console.log("Usuários de teste (senha para todos, só em dev):", DEV_PASSWORD);
  console.log(`  Admin da plataforma: vini.bode@gmail.com`);
  console.log(`  Pároco:              ${paroco.email}`);
  console.log(`  Fiel:                ${fiel.email}`);
  console.log(`  Catequista:          ${catequista.email}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
