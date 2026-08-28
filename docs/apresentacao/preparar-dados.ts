/**
 * Deixa o banco LOCAL apresentável para as capturas.
 *
 * O banco de desenvolvimento acumulou lixo de teste — um vídeo do Rick
 * Astley na Palavra do Padre, gente chamada "Teste Fase 1", posts com
 * "Teste de notificação". Serve para testar; não serve para mostrar.
 *
 * Nada aqui inventa FUNCIONALIDADE: só preenche com conteúdo plausível o
 * que a ferramenta já sabe guardar. É conteúdo de demonstração, e a
 * apresentação diz isso.
 *
 * Idempotente: pode rodar quantas vezes quiser.
 * Uso: npx tsx docs/apresentacao/preparar-dados.ts
 */
import { withPlatformContext } from "../../src/server/db/tenant-context";

const PARISH_ID = "a0ad29dd-a724-4029-8325-5ce1ce4baf49";

const NOMES: Record<string, string> = {
  "Pe. João Demo": "Pe. João Batista Ferreira",
  "Maria Demo": "Maria Aparecida Souza",
  "Ana Catequista": "Ana Lúcia Moreira",
  "Teste Fase 1": "Rosa Meireles",
  "Visitante Sem Convite": "Antônio Prado",
};

const AVISOS = [
  {
    title: "Missa das 19h de domingo será às 18h",
    body: "Neste domingo, por causa da celebração diocesana na Catedral, a missa das 19h será antecipada para as 18h. As demais permanecem no horário de sempre.",
  },
  {
    title: "Inscrições para a catequese abertas",
    body: "As inscrições para a catequese de primeira eucaristia vão até o dia 15. A secretaria atende de segunda a sexta, das 8h às 17h. Traga a certidão de batismo da criança.",
  },
  {
    title: "Mutirão de limpeza no salão paroquial",
    body: "No sábado, a partir das 8h, faremos o mutirão de limpeza do salão. Quem puder ajudar, apareça — há serviço para todo tipo de disposição, e o café fica por nossa conta.",
  },
];

const PASTORAIS = [
  { name: "Pastoral do Dízimo", description: "Cuida da consciência e da transparência da contribuição da comunidade." },
  { name: "Pastoral da Liturgia", description: "Prepara as celebrações: leituras, canto, acólitos e a beleza do altar." },
  { name: "Pastoral do Batismo", description: "Acolhe e prepara as famílias que pedem o batismo dos seus filhos." },
];

async function main() {
  await withPlatformContext(async (tx) => {
    // 1. Fora o que é claramente teste.
    const lixo = await tx.post.findMany({
      where: {
        parishId: PARISH_ID,
        OR: [{ mediaUrl: { contains: "dQw4w9WgXcQ" } }, { contentText: { startsWith: "Teste de notificação" } }],
      },
      select: { id: true },
    });
    if (lixo.length) {
      await tx.post.deleteMany({ where: { id: { in: lixo.map((p) => p.id) } } });
      console.log(`Removidos ${lixo.length} post(s) de teste.`);
    }

    // 2. Nomes de gente de verdade.
    for (const [de, para] of Object.entries(NOMES)) {
      const { count } = await tx.user.updateMany({ where: { fullName: de }, data: { fullName: para } });
      if (count) console.log(`  ${de} -> ${para}`);
    }

    // 3. Avisos: a tela de um aviso só não mostra o que a ferramenta faz.
    const autor = await tx.parishMembership.findFirst({
      where: { parishId: PARISH_ID, role: { code: "PAROCO" } },
      select: { userId: true },
    });
    if (!autor) throw new Error("Sem pároco nesta paróquia.");

    for (const aviso of AVISOS) {
      const existe = await tx.aviso.findFirst({ where: { parishId: PARISH_ID, title: aviso.title } });
      if (existe) continue;
      await tx.aviso.create({ data: { parishId: PARISH_ID, createdBy: autor.userId, ...aviso } });
      console.log(`  aviso: ${aviso.title}`);
    }

    // 3b. Títulos de teste que aparecem na Agenda e no painel.
    //     "Missa Dominical CORRIGIDA" ficou de um teste da edição de
    //     horário; "com cartaz" e "de teste" falam por si.
    const RENOMEAR: [string, string][] = [
      ["Missa Dominical CORRIGIDA", "Missa dominical"],
      ["Missa extra de teste", "Missa de Nossa Senhora"],
    ];
    for (const [de, para] of RENOMEAR) {
      const a = await tx.celebration.updateMany({ where: { parishId: PARISH_ID, title: de }, data: { title: para } });
      const b = await tx.celebrationSchedule.updateMany({ where: { parishId: PARISH_ID, title: de }, data: { title: para } });
      if (a.count || b.count) console.log(`  "${de}" -> "${para}"`);
    }

    // O cartaz do evento no banco de desenvolvimento é uma foto de dados,
    // vinda de um teste de upload. Numa apresentação para paróquia, some.
    const evento = await tx.event.updateMany({
      where: { parishId: PARISH_ID, title: "Quermesse com cartaz" },
      data: { title: "Quermesse da padroeira", imageUrl: null },
    });
    if (evento.count) console.log("  evento: Quermesse da padroeira (cartaz de teste removido)");

    // 4. Perfil da paróquia: campos vazios e "paroquiateste" nas redes
    //    aparecem no print do painel.
    await tx.parish.update({
      where: { id: PARISH_ID },
      data: {
        city: "Londrina",
        state: "PR",
        instagramUrl: "https://instagram.com/paroquianossasenhoradefatima",
        facebookUrl: "https://facebook.com/paroquianossasenhoradefatima",
      },
    });
    console.log("  perfil da paróquia completado");

    // 5. Pastorais.
    for (const grupo of PASTORAIS) {
      const existe = await tx.pastoralGroup.findFirst({ where: { parishId: PARISH_ID, name: grupo.name } });
      if (existe) continue;
      await tx.pastoralGroup.create({ data: { parishId: PARISH_ID, createdBy: autor.userId, ...grupo } });
      console.log(`  pastoral: ${grupo.name}`);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
