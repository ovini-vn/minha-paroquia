/**
 * Deixa a catequese do banco LOCAL apresentável para as capturas do passo a
 * passo.
 *
 * O roteiro impresso mostra telas reais do app, e tela vazia não ensina
 * nada: um itinerário sem encontros digitados não deixa ver a lista que a
 * catequista escolhe, e uma turma sem atraso não deixa ver o aviso.
 *
 * Nada aqui inventa funcionalidade. É conteúdo de demonstração para o que a
 * ferramenta já sabe guardar, e o roteiro diz isso.
 *
 * Idempotente: pode rodar quantas vezes quiser.
 * Uso: npm run passo:dados
 */
import { withPlatformContext } from "../../src/server/db/tenant-context";

const NOME_DO_ITINERARIO = "Eucaristia · 1º ano";

/** O material de um itinerário real, encontro a encontro. */
const TEMAS = [
  {
    titulo: "Deus é Pai e nos criou por amor",
    descricao: "Livro do catequizando, p. 8. Leitura: Gn 1,26-31.",
  },
  {
    titulo: "Jesus nos ensina a rezar",
    descricao: "O Pai-Nosso, oração por oração. Livro, p. 16.",
  },
  {
    titulo: "A Igreja é a nossa família",
    descricao: "Visita à matriz, conhecendo os espaços da celebração.",
  },
  {
    titulo: "O pão da vida",
    descricao: "A multiplicação dos pães. Leitura: Jo 6,1-15.",
  },
  { titulo: "A missa, por dentro", descricao: "As partes da celebração e o que cada uma diz." },
  { titulo: "Comungar é receber Jesus", descricao: "Preparação imediata para a Primeira Eucaristia." },
];

async function main() {
  const host = (process.env.DATABASE_URL ?? "").replace(/.*@/, "").split("/")[0] ?? "";
  console.log(`Banco: ${host}`);
  if (/falling-glitter/.test(host)) {
    throw new Error("Este script é para o banco LOCAL. Isso parece produção — abortando.");
  }

  await withPlatformContext(async (tx) => {
    const turma = await tx.catechismGroup.findFirst({
      where: { name: { contains: "Eucaristia" } },
      orderBy: { createdAt: "asc" },
    });
    if (!turma) throw new Error("Nenhuma turma de catequese no banco local.");

    const itinerario =
      (await tx.itinerario.findFirst({ where: { parishId: turma.parishId, nome: NOME_DO_ITINERARIO } })) ??
      (await tx.itinerario.create({
        data: {
          parishId: turma.parishId,
          nome: NOME_DO_ITINERARIO,
          descricao: "Material da Arquidiocese, edição de 2026",
        },
      }));

    for (const [i, tema] of TEMAS.entries()) {
      const existe = await tx.itinerarioTema.findFirst({
        where: { itinerarioId: itinerario.id, titulo: tema.titulo },
      });
      if (existe) continue;
      await tx.itinerarioTema.create({
        data: {
          parishId: turma.parishId,
          itinerarioId: itinerario.id,
          ordem: i + 1,
          titulo: tema.titulo,
          descricao: tema.descricao,
        },
      });
    }

    await tx.catechismGroup.update({
      where: { id: turma.id },
      data: { itinerarioId: itinerario.id },
    });

    const temas = await tx.itinerarioTema.findMany({
      where: { itinerarioId: itinerario.id },
      orderBy: { ordem: "asc" },
    });

    /*
     * Três encontros já dados e UM sem conteúdo, com mais de uma semana.
     *
     * O encontro em branco é de propósito: é o único jeito de a captura
     * mostrar o aviso vermelho, que é justamente o que o roteiro explica.
     */
    const hoje = new Date();
    const diasAtras = (n: number) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() - n);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    const planejados = [
      { data: diasAtras(28), tema: temas[0]?.id },
      { data: diasAtras(21), tema: temas[1]?.id },
      { data: diasAtras(14), tema: temas[2]?.id },
      { data: diasAtras(9), tema: null },
    ];

    for (const p of planejados) {
      const existe = await tx.catechismSession.findFirst({
        where: { catechismGroupId: turma.id, date: p.data },
      });
      if (existe) {
        await tx.catechismSession.update({
          where: { id: existe.id },
          data: { itinerarioTemaId: p.tema ?? null, topic: null },
        });
        continue;
      }
      await tx.catechismSession.create({
        data: {
          parishId: turma.parishId,
          catechismGroupId: turma.id,
          date: p.data,
          itinerarioTemaId: p.tema ?? null,
        },
      });
    }

    // O catequista precisa ter passado pelas boas-vindas, senão o layout do
    // fiel manda ele para /bem-vindo e a captura sai da tela errada.
    if (turma.catechistUserId) {
      await tx.user.updateMany({
        where: { id: turma.catechistUserId, onboardedAt: null },
        data: { onboardedAt: new Date() },
      });
    }

    console.log(`Itinerário "${itinerario.nome}" com ${temas.length} encontros.`);
    console.log(`Turma "${turma.name}" apontada para ele, com 4 encontros (1 sem conteúdo).`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
