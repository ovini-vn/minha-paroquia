/**
 * Importa a parte do calendário pastoral que NÃO é data marcada.
 *
 * O arquivo da paróquia tem três coisas além da agenda: os horários fixos
 * (o que acontece toda semana e todo mês), o plano pastoral do ano e a
 * palavra dos padres. O importador da agenda
 * (`scripts/importar-calendario.ts`) deixou tudo isso de fora — este pega o
 * que tem casa no app.
 *
 * ONDE CADA COISA VAI, E POR QUÊ:
 *
 * - Ato litúrgico COM hora ("Missa do Apostolado da Oração, 1ª sexta,
 *   19h30") vira `CelebrationSchedule`: o app já sabe expandir uma regra
 *   dessas em celebrações reais, mês a mês, sem ninguém relançar.
 *
 * - Reunião de grupo ("Alcoólicos Anônimos, quartas, 19h") vira
 *   `PastoralGroup`, com o horário no campo de texto `meetsWhen`. É texto
 *   de propósito: "Uma terça por mês" e "A cada dois meses" são verdades
 *   que nenhuma regra de recorrência expressa, e transformá-las em regra
 *   seria inventar a data.
 *
 * - A palavra dos padres vira um `Post` no mural — que é exatamente o que
 *   um Post é: um recado dos padres para a paróquia.
 *
 * - O plano do ano vira um `PlanoPastoral` com suas seções, em RASCUNHO.
 *   Nunca publicado: o que sai de um HTML é ponto de partida, e quem decide
 *   se aquilo é o que a paróquia quer mostrar é a paróquia, revisando em
 *   /painel/plano.
 *
 * O QUE NÃO ENTRA, e é dito no fim da execução em vez de forçado: ato
 * litúrgico SEM hora (Batizados no 3º domingo, Dia da Palavra na 1ª
 * quinta), porque a regra de recorrência exige um horário e não há um a
 * copiar.
 *
 * Uso:
 *   npx tsx scripts/importar-plano-pastoral.ts <arquivo.html> [--aplicar]
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { lerPlanoDoHtml } from "../src/lib/plano-do-html";
import { porExtenso } from "../src/lib/siglas";
import { withPlatformContext } from "../src/server/db/tenant-context";
import { hojeEmBrasilia } from "../src/lib/brasilia";
import { generateAllUpcomingOccurrences } from "../src/server/modules/celebrations/service";
import type { CelebrationType } from "@prisma/client";

type Fixo = {
  /** "Reunião da Pastoral Familiar" */
  nome: string;
  /** "Terças, 19h30" — o texto da fonte, sem tradução. */
  quando: string;
  /** "Capela Santa Inês", quando a fonte diz. */
  onde: string | null;
  ritmo: "semanal" | "mensal";
};

/**
 * Lê as duas listas de horários fixos do HTML.
 *
 * A marcação é regular — `<li><span>nome[<span class="d">local</span>]
 * </span><span class="w">quando</span></li>` — então a leitura é do
 * formato, e não de um palpite sobre o texto.
 */
function lerHorariosFixos(caminho: string): Fixo[] {
  const html = readFileSync(caminho, "utf8");
  const listas = [
    ...html.matchAll(/<h2>(Toda semana|Todo mês)<\/h2>\s*<ul class="sched">([\s\S]*?)<\/ul>/g),
  ];
  if (listas.length !== 2) {
    throw new Error(`Esperava 2 listas de horários fixos, achei ${listas.length}.`);
  }

  const fixos: Fixo[] = [];
  for (const lista of listas) {
    const ritmo = lista[1] === "Toda semana" ? "semanal" : "mensal";
    for (const item of (lista[2] ?? "").matchAll(/<li>([\s\S]*?)<\/li>/g)) {
      const dentro = item[1] ?? "";
      const quando = /<span class="w">([\s\S]*?)<\/span>/.exec(dentro)?.[1]?.trim();
      const onde = /<span class="d">([\s\S]*?)<\/span>/.exec(dentro)?.[1]?.trim() ?? null;
      const nome = dentro
        .replace(/<span class="w">[\s\S]*?<\/span>/, "")
        .replace(/<span class="d">[\s\S]*?<\/span>/, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      if (!nome || !quando) throw new Error(`Linha de horário fixo ilegível: ${dentro}`);
      // Sigla por extenso já na leitura: "Visita da Pastoral da Saúde ao
      // HU" vira o nome do grupo que o fiel vê na lista de pastorais.
      fixos.push({ nome: porExtenso(nome), quando, onde, ritmo });
    }
  }
  return fixos;
}

/** Lê a palavra dos padres, com a assinatura. */
function lerPalavraDosPadres(caminho: string): string {
  const html = readFileSync(caminho, "utf8");
  const bloco = /<h2>Palavra dos padres<\/h2>([\s\S]*?)<\/section>/.exec(html)?.[1];
  if (!bloco) throw new Error("Não achei a palavra dos padres.");
  const paragrafos = [...bloco.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => (m[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragrafos.length === 0) throw new Error("A palavra dos padres veio vazia.");
  return paragrafos.join("\n\n");
}

const DIAS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terça: 2,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sábado: 6,
  sabado: 6,
};

/** "Sábados, 10h" -> {weekday:6, minutos:600}. "Terças-feiras" -> sem hora. */
export function lerQuando(quando: string): {
  weekday: number | null;
  minutos: number | null;
  semana: number | null;
} {
  const texto = quando.toLowerCase();

  let weekday: number | null = null;
  for (const [nome, n] of Object.entries(DIAS)) {
    if (texto.includes(nome)) {
      weekday = n;
      break;
    }
  }

  const hora = /(\d{1,2})\s*h\s*(\d{2})?/.exec(texto);
  const minutos = hora ? Number(hora[1]) * 60 + (hora[2] ? Number(hora[2]) : 0) : null;

  // "1ª sexta-feira" -> 1. "Último sábado" -> 5, que é como o app diz "a última".
  const ordinal = /(\d)[ªº°]/.exec(texto);
  const semana = /últim/.test(texto) ? 5 : ordinal ? Number(ordinal[1]) : null;

  return { weekday, minutos, semana };
}

/**
 * O que a lista traz que NÃO é grupo de pessoas que se reúne.
 *
 * "Dia da Palavra" é uma celebração; "Curso de Batismo" é um curso. Os dois
 * têm ritmo mensal, mas virar `PastoralGroup` daria à paróquia duas
 * pastorais que não existem, e ao fiel um botão de "quero participar" que
 * não leva a lugar nenhum.
 */
const NAO_E_GRUPO = /^(dia da palavra|curso de)/i;

/** Ato litúrgico que o app sabe agendar — ou nada. */
function tipoLiturgico(nome: string): CelebrationType | null {
  const t = nome.toLowerCase();
  if (/ador(a|)ção ao santíssimo/.test(t)) return "adoracao";
  if (/^batizados?$/.test(t)) return "batizado";
  if (/^missas?\b/.test(t)) return "missa";
  return null;
}

/**
 * O título sem preposições, para comparar com folga.
 *
 * O próprio calendário escreve "Missa do Apostolado DE Oração" na agenda e
 * "Missa do Apostolado DA Oração" nos horários fixos. São a mesma missa, e
 * uma comparação literal não veria isso.
 */
export function tituloSolto(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((palavra) => !/^(de|da|do|dos|das|ao|aos|as|e)$/.test(palavra))
    .join(" ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * O nome do GRUPO, tirando o rótulo do encontro.
 *
 * A fonte escreve "Reunião da Pastoral Familiar" porque a lista é de
 * horários. Numa lista de pastorais, isso passa a ser errado: a pastoral se
 * chama Pastoral Familiar, e "Reunião" é o que ela faz às terças.
 *
 * Só o prefixo "Reunião de/da/do" sai. "Visita da Pastoral da Saúde ao HU" e
 * "Brechó da Pastoral da Saúde" ficam inteiros: ali o nome descreve uma
 * atividade que a paróquia distingue, e encurtar apagaria a distinção.
 */
export function nomeDoGrupo(nome: string): string {
  return nome.replace(/^Reuni(ã|a)o (de|do|da|dos|das) /i, "").trim();
}

/** "Reunião da Pastoral Familiar" e "Pastoral Familiar" são a mesma coisa. */
export function chaveDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(reuniao|visita) (do|da|dos|das) /, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Apaga as marcações SEM HORA que a rotina passa a cobrir.
 *
 * A agenda do calendário traz "Missa do Apostolado de Oração — 4 de
 * setembro", sem hora, porque a página imprimível repete todo mês o que os
 * horários fixos já dizem uma vez: primeira sexta, 19h30. Com a rotina
 * cadastrada, manter as duas faria a mesma missa aparecer duas vezes no
 * mesmo dia — uma delas sem horário.
 *
 * Três travas, porque isto apaga:
 *  - só `semHora`, então nunca some um horário que alguém digitou;
 *  - só o que não pertence a nenhuma rotina (`scheduleId: null`);
 *  - só de hoje em diante — o passado a rotina não regenera, e apagar
 *    janeiro deixaria um buraco no histórico da paróquia.
 */
async function apagarAvulsasCobertas(
  tx: Parameters<Parameters<typeof withPlatformContext>[0]>[0],
  parishId: string,
  titulo: string,
  aplicar: boolean,
): Promise<number> {
  const candidatas = await tx.celebration.findMany({
    where: {
      parishId,
      semHora: true,
      scheduleId: null,
      startsAt: { gte: new Date(hojeEmBrasilia()) },
    },
    select: { id: true, title: true },
  });
  const alvo = tituloSolto(titulo);
  const ids = candidatas.filter((c) => c.title && tituloSolto(c.title) === alvo).map((c) => c.id);
  if (ids.length > 0 && aplicar) {
    await tx.celebration.deleteMany({ where: { id: { in: ids } } });
  }
  return ids.length;
}

/** O ano do calendário, dito pelo próprio arquivo. */
function anoDoArquivo(html: string): number {
  const achado = /calend[áa]rio[^<]*?(20\d{2})/i.exec(html) ?? /(20\d{2})/.exec(html);
  const ano = Number(achado?.[1]);
  if (!ano) throw new Error("Não achei o ano do calendário no arquivo.");
  return ano;
}

async function main() {
  const [caminho, bandeira] = process.argv.slice(2);
  const aplicar = bandeira === "--aplicar";
  if (!caminho) {
    console.error("Uso: npx tsx scripts/importar-plano-pastoral.ts <arquivo.html> [--aplicar]");
    process.exit(1);
  }

  console.log(`Banco: ${(process.env.DATABASE_URL ?? "").replace(/.*@/, "").split("/")[0]}`);
  console.log(aplicar ? "Modo: APLICANDO no banco." : "Modo: ENSAIO (nada será escrito).");

  const fixos = lerHorariosFixos(caminho);
  const palavra = lerPalavraDosPadres(caminho);
  const html = readFileSync(caminho, "utf8");
  const plano = lerPlanoDoHtml(html);
  const ano = anoDoArquivo(html);

  await withPlatformContext(async (tx) => {
    const paroquia = await tx.parish.findFirst({
      where: { name: { contains: "Fátima" } },
      select: { id: true, name: true },
    });
    if (!paroquia) throw new Error("Não achei a paróquia neste banco.");
    /*
     * Quem assina os lançamentos.
     *
     * Todo registro guarda `createdBy`, e essa coluna é o que a auditoria
     * responde depois. Era só o pároco — e a paróquia real não tem um: ela
     * tem um administrador paroquial. Um importador que exige o cargo mais
     * alto para de funcionar na única paróquia que existe.
     *
     * A ordem é a de quem responde pela agenda: pároco, administrador,
     * secretaria. Quem ficou é impresso, porque assinar em nome de alguém
     * não pode ser silencioso.
     */
    const PODEM_ASSINAR = ["PAROCO", "ADMINISTRADOR_PAROQUIAL", "SECRETARIA"];
    const responsaveis = await tx.parishMembership.findMany({
      where: { parishId: paroquia.id, role: { code: { in: PODEM_ASSINAR } } },
      select: { userId: true, role: { select: { code: true } }, user: { select: { fullName: true } } },
    });
    const autor = PODEM_ASSINAR.map((code) =>
      responsaveis.find((m) => m.role.code === code),
    ).find(Boolean);
    if (!autor) {
      throw new Error(
        `Não achei quem assine os lançamentos: a paróquia não tem ninguém com ${PODEM_ASSINAR.join(", ")}.`,
      );
    }
    console.log(`Assinando como: ${autor.user.fullName} (${autor.role.code})`);
    console.log(`Paróquia: ${paroquia.name}\n`);

    const jaTem = await tx.pastoralGroup.findMany({
      where: { parishId: paroquia.id },
      select: { id: true, name: true, meetsWhen: true, meetsWhere: true },
    });
    const porChave = new Map(jaTem.map((g) => [chaveDoNome(g.name), g.id]));

    const rotinas: string[] = [];
    const grupos: string[] = [];
    const completados: string[] = [];
    const foraDeAlcance: string[] = [];
    let substituidas = 0;

    for (const fixo of fixos) {
      const { weekday, minutos, semana } = lerQuando(fixo.quando);
      const tipo = tipoLiturgico(fixo.nome);

      if (tipo) {
        // Ato litúrgico. Só vira regra se a fonte deu dia da semana E hora —
        // uma regra sem horário não é agendável, e um horário chutado
        // colocaria gente na porta da igreja na hora errada.
        if (weekday === null || minutos === null) {
          foraDeAlcance.push(`${fixo.nome} (${fixo.quando}) — a fonte não dá a hora`);
          continue;
        }
        const existe = await tx.celebrationSchedule.findFirst({
          where: { parishId: paroquia.id, title: fixo.nome, weekday, timeMinutes: minutos },
          select: { id: true },
        });
        if (existe) {
          completados.push(`${fixo.nome} — a rotina já estava cadastrada`);
          substituidas += await apagarAvulsasCobertas(tx, paroquia.id, fixo.nome, aplicar);
          continue;
        }

        /*
         * A paróquia real já tem sua grade. Na Nossa Senhora de Fátima existe
         * "Missa Sexta, toda sexta, 19h30" — e o calendário chama a missa da
         * primeira sexta de "Missa do Apostolado da Oração", mesmo dia, mesma
         * hora. É a MESMA missa com dois nomes; cadastrar a rotina faria a
         * agenda mostrar duas às 19h30 toda primeira sexta.
         *
         * A guarda do app (`createCelebrationSchedule`) não pega este caso:
         * ela compara regras iguais, e semanal contra mensal são diferentes.
         * Aqui a comparação é pelo que o fiel vê — dia da semana e horário.
         */
        const ocupado = await tx.celebrationSchedule.findFirst({
          where: { parishId: paroquia.id, active: true, weekday, timeMinutes: minutos },
          select: { id: true, title: true, frequency: true },
        });
        if (ocupado) {
          foraDeAlcance.push(
            `${fixo.nome} (${fixo.quando}) — a paróquia já tem "${ocupado.title ?? "sem título"}" nesse dia e horário`,
          );
          continue;
        }
        if (aplicar) {
          await tx.celebrationSchedule.create({
            data: {
              parishId: paroquia.id,
              type: tipo,
              title: fixo.nome,
              location: fixo.onde,
              frequency: fixo.ritmo,
              weekday,
              weekOfMonth: fixo.ritmo === "mensal" ? (semana ?? 1) : null,
              timeMinutes: minutos,
              // `@db.Date` guarda dia, e o app grava a meia-noite UTC do dia
              // escrito no formulário (`z.coerce.date()` sobre "2026-08-31").
              // Aqui vale a mesma conversão, senão a regra nasce com um
              // formato que o resto do sistema não usa.
              startsOn: new Date(hojeEmBrasilia()),
              createdBy: autor.userId,
            },
          });
        }
        rotinas.push(`${fixo.nome} — ${fixo.quando}`);
        substituidas += await apagarAvulsasCobertas(tx, paroquia.id, fixo.nome, aplicar);
        continue;
      }

      if (NAO_E_GRUPO.test(fixo.nome)) {
        foraDeAlcance.push(`${fixo.nome} (${fixo.quando}) — não é grupo nem tem hora`);
        continue;
      }

      // Reunião de grupo: o horário entra como texto, do jeito que a
      // paróquia escreveu. "Uma terça por mês" continua sendo verdade.
      const nome = nomeDoGrupo(fixo.nome);
      const achadoId = porChave.get(chaveDoNome(fixo.nome));
      if (achadoId) {
        const atual = jaTem.find((g) => g.id === achadoId);
        /*
         * Só renomeia o que ESTE importador criou com o nome cru — nunca um
         * nome que a paróquia escolheu. A comparação é com o texto exato da
         * fonte; qualquer outra coisa é escolha de alguém e fica de pé.
         */
        const corrigirNome = atual?.name === fixo.nome && fixo.nome !== nome;
        if (
          atual &&
          !corrigirNome &&
          atual.meetsWhen === fixo.quando &&
          atual.meetsWhere === fixo.onde
        ) {
          continue;
        }
        if (aplicar) {
          await tx.pastoralGroup.update({
            where: { id: achadoId },
            data: {
              ...(corrigirNome ? { name: nome } : {}),
              meetsWhen: fixo.quando,
              meetsWhere: fixo.onde,
            },
          });
        }
        completados.push(
          corrigirNome
            ? `${fixo.nome} — renomeado para ${nome}`
            : `${nome} — horário preenchido: ${fixo.quando}`,
        );
      } else {
        if (aplicar) {
          const criado = await tx.pastoralGroup.create({
            data: {
              parishId: paroquia.id,
              name: nome,
              meetsWhen: fixo.quando,
              meetsWhere: fixo.onde,
              createdBy: autor.userId,
            },
          });
          porChave.set(chaveDoNome(fixo.nome), criado.id);
          jaTem.push({
            id: criado.id,
            name: criado.name,
            meetsWhen: criado.meetsWhen,
            meetsWhere: criado.meetsWhere,
          });
        }
        grupos.push(`${nome} — ${fixo.quando}${fixo.onde ? ` · ${fixo.onde}` : ""}`);
      }
    }

    const temPost = await tx.post.findFirst({
      where: { parishId: paroquia.id, contentText: palavra },
      select: { id: true },
    });
    if (!temPost && aplicar) {
      await tx.post.create({
        data: { parishId: paroquia.id, contentText: palavra, mediaType: "texto" },
      });
    }

    /*
     * O plano pastoral do ano.
     *
     * Entra como RASCUNHO, sempre. O que sai de um HTML é ponto de partida:
     * a hierarquia de títulos acerta a estrutura, mas quem decide se aquilo
     * é o que a paróquia quer mostrar é a paróquia — e ela revisa em
     * /painel/plano antes de publicar.
     *
     * Idempotente pelo ano: existindo plano daquele ano, não mexe. Reescrever
     * um plano que alguém já editou à mão apagaria o trabalho dessa pessoa,
     * que é exatamente o oposto do que o importador serve.
     */
    let planoDito = "";
    const planoExistente = await tx.planoPastoral.findFirst({
      where: { parishId: paroquia.id, ano },
      select: { id: true, publicado: true },
    });

    if (planoExistente) {
      planoDito = `já existe o plano de ${ano} — não foi tocado`;
    } else if (!aplicar) {
      planoDito = `${plano.secoes.length} seções seriam criadas como rascunho`;
    } else {
      const criado = await tx.planoPastoral.create({
        data: {
          parishId: paroquia.id,
          ano,
          titulo: `${plano.titulo} ${ano}`,
          introducao: plano.introducao ? porExtenso(plano.introducao) : null,
          createdBy: autor.userId,
        },
      });
      await tx.planoSecao.createMany({
        data: plano.secoes.map((secao, i) => ({
          parishId: paroquia.id,
          planoId: criado.id,
          ordem: i + 1,
          rotulo: secao.rotulo ? porExtenso(secao.rotulo) : null,
          titulo: porExtenso(secao.titulo),
          corpo: porExtenso(secao.corpo),
        })),
      });
      planoDito = `${plano.secoes.length} seções criadas como RASCUNHO — revise e publique em /painel/plano`;
    }

    const listar = (titulo: string, linhas: string[]) => {
      console.log(`${titulo} (${linhas.length})`);
      for (const linha of linhas) console.log(`  · ${linha}`);
      console.log("");
    };
    listar("Rotinas de celebração", rotinas);
    listar("Grupos e pastorais criados", grupos);
    listar("Completados / já existiam", completados);
    listar("NÃO importados", foraDeAlcance);
    console.log(
      `Marcações sem hora substituídas pela rotina (daqui pra frente): ${substituidas}`,
    );
    console.log(`Palavra dos padres no mural: ${temPost ? "já estava lá" : "publicada"}`);
    console.log(`Plano pastoral: ${planoDito}`);
  });

  /*
   * Uma regra recém-cadastrada ainda não tem datas na agenda — quem as cria
   * é o job da madrugada. Chamá-lo aqui é o que a tela faz quando a
   * secretaria cadastra uma repetição pela mão: o resultado aparece na
   * hora, em vez de a paróquia ficar um dia com a rotina cadastrada e o
   * calendário vazio no lugar onde a marcação sem hora foi retirada.
   *
   * Roda sempre, e não só quando cria: é idempotente (`skipDuplicates` sobre
   * a única de (schedule_id, starts_at)) e é o mesmo job da madrugada.
   */
  if (aplicar) {
    const { criadas } = await generateAllUpcomingOccurrences();
    console.log(`Datas geradas a partir das rotinas: ${criadas}`);
  }
}

/*
 * Só roda quando é CHAMADO, nunca quando é importado.
 *
 * Sem esta guarda, um teste que importa `importar-plano-pastoral` para exercitar uma
 * das funções puras dispara o import inteiro: ele tenta abrir o banco, não
 * acha o arquivo do calendário e derruba o processo com exit(1) no meio da
 * suíte.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((erro) => {
      console.error(erro);
      process.exit(1);
    });
}
