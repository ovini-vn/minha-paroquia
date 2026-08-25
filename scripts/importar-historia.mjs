/**
 * Carrega o memorial histórico de uma paróquia a partir de um arquivo.
 *
 * A história de cada comunidade é dado, não código: o lugar dela é o banco,
 * e a secretaria a edita pelo Painel. Este script existe só para a carga
 * inicial de um texto longo, que ninguém vai querer digitar numa caixa.
 *
 * Uso:
 *   node scripts/importar-historia.mjs <arquivo.md> "<nome ou slug da paróquia>"
 *
 * Escreve no banco apontado por DATABASE_URL. Para produção, defina a
 * variável antes de rodar — e confira o endereço que o script imprime.
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const [arquivo, alvo] = process.argv.slice(2);
if (!arquivo || !alvo) {
  console.error('Uso: node scripts/importar-historia.mjs <arquivo.md> "<nome ou slug>"');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const historia = (await readFile(arquivo, "utf8")).replace(/\r\n/g, "\n").trim();

  const encontradas = await prisma.parish.findMany({
    where: { OR: [{ slug: alvo }, { name: { equals: alvo, mode: "insensitive" } }] },
    select: { id: true, name: true, slug: true, historia: true },
  });

  if (encontradas.length === 0) {
    console.error(`Nenhuma paróquia encontrada para "${alvo}".`);
    process.exit(1);
  }
  // Escrever no lugar errado é pior do que não escrever.
  if (encontradas.length > 1) {
    console.error(`"${alvo}" casa com mais de uma paróquia. Use o slug:`);
    for (const p of encontradas) console.error(`  - ${p.slug} (${p.name})`);
    process.exit(1);
  }

  const paroquia = encontradas[0];
  const antes = paroquia.historia?.length ?? 0;
  await prisma.parish.update({ where: { id: paroquia.id }, data: { historia } });

  console.log(`${paroquia.name} (${paroquia.slug})`);
  console.log(`  história: ${antes} → ${historia.length} caracteres`);
} finally {
  await prisma.$disconnect();
}
