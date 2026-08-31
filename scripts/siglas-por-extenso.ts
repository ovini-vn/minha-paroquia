/**
 * Reescreve por extenso as siglas já gravadas no banco.
 *
 * Os importadores passaram a expandir na entrada, mas o que já entrou
 * continua com "GBR" e "Congresso da IAM". Isto é a passagem de conserto —
 * uma vez, sobre o que existe.
 *
 * Não é parte de nenhum importador de propósito: um importador que reescreve
 * texto existente apagaria a edição que a paróquia fez à mão. Aqui a
 * mudança é pedida, mostrada linha por linha e só então aplicada.
 *
 * Toca em tudo que o fiel LÊ: título, local e descrição de celebração e
 * evento, nome e horário de pastoral, e o plano pastoral inteiro.
 *
 * Uso:
 *   npx tsx scripts/siglas-por-extenso.ts [--aplicar]
 *
 * Sem `--aplicar` é ENSAIO: mostra cada troca e não escreve nada.
 */
import { pathToFileURL } from "node:url";
import { withPlatformContext } from "../src/server/db/tenant-context";
import { porExtenso } from "../src/lib/siglas";

/** Devolve o valor trocado, ou `undefined` quando nada muda. */
function trocar(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const novo = porExtenso(valor);
  return novo === valor ? undefined : novo;
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(`Banco: ${(process.env.DATABASE_URL ?? "").replace(/.*@/, "").split("/")[0]}`);
  console.log(aplicar ? "Modo: APLICANDO no banco." : "Modo: ENSAIO (nada será escrito).");
  console.log("");

  const mudancas: string[] = [];

  await withPlatformContext(async (tx) => {
    const celebracoes = await tx.celebration.findMany({
      select: { id: true, title: true, location: true },
    });
    for (const c of celebracoes) {
      const title = trocar(c.title);
      const location = trocar(c.location);
      if (!title && !location) continue;
      mudancas.push(`celebração  ${c.title ?? ""} → ${title ?? c.title ?? ""}`);
      if (aplicar) {
        await tx.celebration.update({
          where: { id: c.id },
          data: { ...(title ? { title } : {}), ...(location ? { location } : {}) },
        });
      }
    }

    const eventos = await tx.event.findMany({
      select: { id: true, title: true, description: true, location: true },
    });
    for (const e of eventos) {
      const title = trocar(e.title);
      const description = trocar(e.description);
      const location = trocar(e.location);
      if (!title && !description && !location) continue;
      mudancas.push(`evento      ${e.title} → ${title ?? e.title}`);
      if (aplicar) {
        await tx.event.update({
          where: { id: e.id },
          data: {
            ...(title ? { title } : {}),
            ...(description ? { description } : {}),
            ...(location ? { location } : {}),
          },
        });
      }
    }

    const grupos = await tx.pastoralGroup.findMany({
      select: { id: true, name: true, description: true, meetsWhen: true, meetsWhere: true },
    });
    for (const g of grupos) {
      const name = trocar(g.name);
      const description = trocar(g.description);
      const meetsWhen = trocar(g.meetsWhen);
      const meetsWhere = trocar(g.meetsWhere);
      if (!name && !description && !meetsWhen && !meetsWhere) continue;
      mudancas.push(`pastoral    ${g.name} → ${name ?? g.name}`);
      if (aplicar) {
        await tx.pastoralGroup.update({
          where: { id: g.id },
          data: {
            ...(name ? { name } : {}),
            ...(description ? { description } : {}),
            ...(meetsWhen ? { meetsWhen } : {}),
            ...(meetsWhere ? { meetsWhere } : {}),
          },
        });
      }
    }

    const planos = await tx.planoPastoral.findMany({
      select: { id: true, titulo: true, introducao: true },
    });
    for (const p of planos) {
      const titulo = trocar(p.titulo);
      const introducao = trocar(p.introducao);
      if (!titulo && !introducao) continue;
      mudancas.push(`plano       ${p.titulo}`);
      if (aplicar) {
        await tx.planoPastoral.update({
          where: { id: p.id },
          data: { ...(titulo ? { titulo } : {}), ...(introducao ? { introducao } : {}) },
        });
      }
    }

    const secoes = await tx.planoSecao.findMany({
      select: { id: true, rotulo: true, titulo: true, corpo: true },
    });
    for (const s of secoes) {
      const rotulo = trocar(s.rotulo);
      const titulo = trocar(s.titulo);
      const corpo = trocar(s.corpo);
      if (!rotulo && !titulo && !corpo) continue;
      mudancas.push(`seção       ${s.titulo}${corpo ? " (corpo)" : ""}`);
      if (aplicar) {
        await tx.planoSecao.update({
          where: { id: s.id },
          data: {
            ...(rotulo ? { rotulo } : {}),
            ...(titulo ? { titulo } : {}),
            ...(corpo ? { corpo } : {}),
          },
        });
      }
    }
  });

  for (const linha of mudancas) console.log(`  · ${linha}`);
  console.log("");
  console.log(`Registros ${aplicar ? "alterados" : "que mudariam"}: ${mudancas.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((erro) => {
      console.error(erro);
      process.exit(1);
    });
}
