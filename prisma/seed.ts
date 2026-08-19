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

const prisma = new PrismaClient();

const DEV_PASSWORD = "ComunidadeDev123!";

async function seedDemoParish() {
  const parish = await prisma.parish.upsert({
    where: { slug: "nossa-senhora-de-fatima" },
    update: {},
    create: { name: "Paróquia Nossa Senhora de Fátima", slug: "nossa-senhora-de-fatima" },
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

  const parocoRole = await prisma.role.findUniqueOrThrow({ where: { code: "PAROCO" } });
  const fielRole = await prisma.role.findUniqueOrThrow({ where: { code: "FIEL" } });

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
  });

  return { parish, platformAdmin, paroco, fiel };
}

async function main() {
  await ensureRolesAndPermissionsSeeded();
  const { parish, paroco, fiel } = await seedDemoParish();

  console.log("\nSeed concluído.\n");
  console.log(`Paróquia demo: ${parish.name} (${parish.slug})\n`);
  console.log("Usuários de teste (senha para todos, só em dev):", DEV_PASSWORD);
  console.log(`  Admin da plataforma: vini.bode@gmail.com`);
  console.log(`  Pároco:              ${paroco.email}`);
  console.log(`  Fiel:                ${fiel.email}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
