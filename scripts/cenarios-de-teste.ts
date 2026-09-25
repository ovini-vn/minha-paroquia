/**
 * Cenários para olhar as fases 3 a 6 no ambiente de teste.
 *
 * Preenche UMA paróquia do banco de DESENVOLVIMENTO com o mínimo para as
 * telas novas não abrirem vazias: intenções no rol da próxima missa e um
 * pedido a conferir, a preparação de batismo e casamento, um recado e uma
 * tarefa no grupo mais movimentado. Tudo marcado "(teste)".
 *
 * Só roda no banco de desenvolvimento: confere o host antes da primeira
 * escrita e recusa qualquer outro. Rodar de novo não duplica — cada cenário
 * procura a própria marca antes de criar.
 *
 * Uso:
 *   npx tsx scripts/cenarios-de-teste.ts                       ensaio
 *   npx tsx scripts/cenarios-de-teste.ts --confirmar           grava
 *   npx tsx scripts/cenarios-de-teste.ts outra-slug --confirmar
 */
import { readFileSync } from "node:fs";
import { withPlatformContext } from "../src/server/db/tenant-context";

const HOST_DE_DESENVOLVIMENTO = "ep-silent-salad";
const MARCA = "(teste)";

function hostDoBanco(): string {
  const url = process.env.DATABASE_URL ?? readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)/m)?.[1] ?? "";
  return url.match(/@([^/:?]+)/)?.[1] ?? "";
}

async function principal(): Promise<number> {
  const host = hostDoBanco();
  console.log(`banco: ${host || "(desconhecido)"}`);
  if (!host.includes(HOST_DE_DESENVOLVIMENTO)) {
    console.error("Recusado: este script só escreve no banco de desenvolvimento.");
    return 1;
  }
  const argumentos = process.argv.slice(2);
  const confirmado = argumentos.includes("--confirmar");
  const slug = argumentos.find((a) => !a.startsWith("--")) ?? "nossa-senhora-de-fatima";
  const agora = new Date();

  return withPlatformContext(async (tx) => {
    const paroquia = await tx.parish.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!paroquia) {
      console.error(`Paróquia "${slug}" não existe neste banco.`);
      return 1;
    }
    const parishId = paroquia.id;
    const autor = await tx.parishMembership.findFirst({
      where: { parishId, status: "active", role: { code: { in: ["PAROCO", "ADMINISTRADOR_PAROQUIAL", "SECRETARIA"] } } },
      select: { userId: true },
    });
    if (!autor) {
      console.error("A paróquia não tem ninguém na administração para assinar os cenários.");
      return 1;
    }
    console.log(`paróquia: ${paroquia.name}${confirmado ? "" : "  (ensaio — nada será gravado)"}\n`);

    // Intenções: rol da próxima missa, e um pedido a conferir na seguinte.
    const missas = await tx.celebration.findMany({
      where: { parishId, type: "missa", canceledAt: null, startsAt: { gt: agora } },
      orderBy: { startsAt: "asc" },
      take: 2,
      select: { id: true, startsAt: true },
    });
    const jaTemIntencoes = await tx.intencaoDeMissa.count({ where: { parishId, texto: { endsWith: MARCA } } });
    if (missas.length === 0) console.log("intenções: nenhuma missa futura — cadastre horários antes");
    else if (jaTemIntencoes > 0) console.log("intenções: já existem");
    else {
      console.log(`intenções: 3 no rol de ${missas[0]!.startsAt.toISOString()} e 1 pedido a conferir`);
      if (confirmado) {
        const noRol = [
          { tipo: "setimo_dia" as const, texto: `José Antônio Ferreira ${MARCA}` },
          { tipo: "sufragio" as const, texto: `Almas do purgatório ${MARCA}` },
          { tipo: "saude" as const, texto: `Dona Aparecida, em tratamento ${MARCA}` },
        ];
        for (const i of noRol) {
          await tx.intencaoDeMissa.create({
            data: { parishId, celebrationId: missas[0]!.id, ...i, estado: "confirmada", registradaPor: autor.userId, pedidoPorNome: "Balcão" },
          });
        }
        await tx.intencaoDeMissa.create({
          data: {
            parishId,
            celebrationId: (missas[1] ?? missas[0]!).id,
            tipo: "acao_de_gracas",
            texto: `Pelos 25 anos de casamento de Rita e Paulo ${MARCA}`,
            estado: "pedida",
            pedidoPorId: autor.userId,
          },
        });
      }
    }

    // Preparação de batismo e casamento — texto de exemplo, só no desenvolvimento.
    const preparacoes = {
      batismo: {
        orientacao: `Procure a secretaria com pelo menos dois meses de antecedência para marcar a data. Pais e padrinhos participam de um encontro de preparação antes do batismo. ${MARCA}`,
        documentos: ["Certidão de nascimento da criança", "RG e CPF dos pais", "Comprovante de batismo e crisma dos padrinhos", "Comprovante de residência"],
        encontros: "Segundo sábado do mês, às 15h, no salão paroquial.",
      },
      matrimonio: {
        orientacao: `Procure a secretaria com pelo menos seis meses de antecedência para marcar a data e o encontro de noivos. ${MARCA}`,
        documentos: ["Certidão de batismo atualizada (até 6 meses) dos noivos", "RG e CPF", "Certidão de nascimento ou de casamento civil", "Certificado do encontro de noivos"],
        encontros: "Encontro de noivos: um fim de semana por trimestre. A secretaria informa a próxima data.",
      },
    } as const;
    for (const [tipo, dados] of Object.entries(preparacoes) as ["batismo" | "matrimonio", (typeof preparacoes)["batismo"]][]) {
      const existe = await tx.preparacaoDeSacramento.findUnique({ where: { parishId_tipo: { parishId, tipo } } });
      console.log(`preparação ${tipo}: ${existe ? "já existe" : "criar"}`);
      if (!existe && confirmado) {
        await tx.preparacaoDeSacramento.create({ data: { parishId, tipo, ...dados, documentos: [...dados.documentos] } });
      }
    }

    // O grupo mais movimentado recebe um recado e uma tarefa no próximo encontro.
    const grupo = await tx.pastoralGroup.findFirst({
      where: { parishId, status: "ativa" },
      orderBy: { membros: { _count: "desc" } },
      select: { id: true, name: true },
    });
    if (grupo) {
      const recado = await tx.recadoDoGrupo.findFirst({ where: { groupId: grupo.id, texto: { endsWith: MARCA } } });
      console.log(`recado em "${grupo.name}": ${recado ? "já existe" : "criar"}`);
      if (!recado && confirmado) {
        await tx.recadoDoGrupo.create({
          data: { parishId, groupId: grupo.id, autorId: autor.userId, texto: `Lembrete: tragam a Bíblia no próximo encontro. ${MARCA}` },
        });
      }
      const hoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
      const proximo = await tx.encontroDoGrupo.findFirst({
        where: { groupId: grupo.id, data: { gte: hoje } },
        orderBy: { data: "asc" },
        select: { id: true },
      });
      if (proximo) {
        const tarefa = await tx.tarefaDoEncontro.findFirst({ where: { encontroId: proximo.id, descricao: { endsWith: MARCA } } });
        console.log(`tarefa no próximo encontro: ${tarefa ? "já existe" : "criar (sem responsável, para alguém assumir)"}`);
        if (!tarefa && confirmado) {
          await tx.tarefaDoEncontro.create({
            data: { parishId, encontroId: proximo.id, descricao: `Lanche da partilha ${MARCA}` },
          });
        }
      } else console.log("tarefa: o grupo não tem encontro marcado adiante");
    }

    console.log(confirmado ? "\nGravado." : "\nEnsaio. Rode com --confirmar para gravar.");
    return 0;
  });
}

principal().then((codigo) => process.exit(codigo));
