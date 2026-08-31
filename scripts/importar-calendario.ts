/**
 * Importa o calendário pastoral de um ano para dentro do app.
 *
 * A fonte é o HTML que a paróquia já usa — o mesmo calendário impresso,
 * publicado como página. Ele traz 286 marcações de 2026 em doze categorias,
 * mais os horários fixos de toda semana e todo mês.
 *
 * TRÊS DECISÕES QUE VALEM EXPLICAÇÃO:
 *
 * 1. Nada de hora inventada. 90% das marcações dizem só o DIA. Onde a fonte
 *    dá a hora ("Adoração — Mãe Admirável, 16h"), ela é usada; onde não dá,
 *    o evento entra como `semHora` e a agenda mostra apenas a data. Escolher
 *    um horário plausível faria alguém aparecer na hora errada.
 *
 * 2. Não duplica o que o app já sabe. O calendário litúrgico universal é
 *    calculado (`src/lib/liturgical-feasts.ts`): Natal, Epifania, Páscoa. As
 *    marcações da fonte que coincidem com uma festa já calculada NO MESMO
 *    DIA são puladas — senão o fiel veria "Epifania do Senhor" duas vezes.
 *
 * 3. Idempotente por (dia + título). Rodar de novo corrige e completa, em
 *    vez de duplicar. Sem isso, uma segunda execução dobraria o ano inteiro.
 *
 * 4. Não briga com as ROTINAS. A página impressa repete todo mês, sem hora,
 *    o que os horários fixos dizem uma vez com hora ("Missa do Apostolado
 *    da Oração, 1ª sexta, 19h30"). Se a paróquia já tem essa rotina
 *    cadastrada, a marcação sem hora é pulada — senão a mesma missa
 *    apareceria duas vezes no dia, uma delas sem horário.
 *
 * Uso:
 *   npx tsx scripts/importar-calendario.ts <arquivo.html> <ano> [--aplicar]
 *
 * Sem `--aplicar` é ENSAIO: lê, mapeia e conta, sem escrever nada.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { withPlatformContext } from "../src/server/db/tenant-context";
import { getFeastOn } from "../src/lib/liturgical-feasts";
import { brasiliaWallClockToUtc, hojeEmBrasilia } from "../src/lib/brasilia";
import { occurrencesBetween, type RecurrenceRule } from "../src/lib/recurrence";
import type { CelebrationType } from "@prisma/client";

export type Marcacao = { t: string; c: string; m?: string };
type Mes = { n: number; name: string; days: Record<string, Marcacao[]> };

/** Lê os dados executando as PRÓPRIAS estruturas do arquivo. */
function lerCalendario(caminho: string): { CATS: Record<string, string>; MONTHS: Mes[] } {
  const html = readFileSync(caminho, "utf8");
  const de = html.indexOf("const CATS");
  const ate = html.indexOf("}];", html.indexOf("{ n:12", de)) + 3;
  if (de < 0 || ate < 3) throw new Error("Não encontrei as estruturas do calendário no arquivo.");

  const caixa = vm.createContext({});
  vm.runInContext(html.slice(de, ate), caixa);
  return vm.runInContext("({ CATS, MONTHS })", caixa);
}

/**
 * O que é celebração e o que é evento.
 *
 * Celebração é ato litúrgico com lugar e hora na vida da paróquia — missa,
 * adoração, batizado. Evento é encontro, formação, reunião, festa. A
 * diferença importa: celebração entra na agenda litúrgica e pode receber
 * escala de quem serve; evento não.
 */
export function classificar(m: Marcacao): { tipo: "celebracao"; ct: CelebrationType } | { tipo: "evento" } {
  const t = m.t.toLowerCase();

  /*
   * Missa é missa, esteja na gaveta que estiver.
   *
   * A categoria da fonte serve ao filtro da página impressa, e não diz o
   * que a coisa É: "Missa dos coroinhas na Catedral" e "Missa de
   * aniversário da IAM" estão em "Juventude e IAM", "Missa no setor 7"
   * está em "GBR e setores". Indo pela categoria, as três entrariam como
   * evento — sem tratamento litúrgico, sem poder receber escala de quem
   * serve, e escapando da regra que evita duas missas no mesmo dia.
   */
  if (m.c === "mis" || /^missas?\s/.test(t)) return { tipo: "celebracao", ct: "missa" };
  if (/ador(a|)ção ao santíssimo/.test(t)) return { tipo: "celebracao", ct: "adoracao" };
  if (/^batizados?$/.test(t) || /celebração dos batizados/.test(t))
    return { tipo: "celebracao", ct: "batizado" };
  if (/confiss(ão|ões)/.test(t)) return { tipo: "celebracao", ct: "confissao" };

  // Devoção e sacramento CELEBRADO são atos litúrgicos; curso e retiro não.
  if (m.c === "dev" && !/curso|formação|encontro de coordena/.test(t))
    return { tipo: "celebracao", ct: "outro" };
  if (m.c === "sac" && /celebração|primeira eucaristia|crisma/.test(t) && !/curso|retiro/.test(t))
    return { tipo: "celebracao", ct: "outro" };

  return { tipo: "evento" };
}

/** "Mãe Admirável, 16h" -> 960. "9h30" -> 570. Sem hora -> null. */
export function minutosDoDetalhe(detalhe?: string): number | null {
  if (!detalhe) return null;
  const m = /(\d{1,2})\s*h\s*(\d{2})?/i.exec(detalhe);
  if (!m) return null;
  const hora = Number(m[1]);
  const minuto = m[2] ? Number(m[2]) : 0;
  if (hora > 23 || minuto > 59) return null;
  return hora * 60 + minuto;
}

/**
 * O local — e SÓ quando o detalhe realmente traz um.
 *
 * O campo de detalhe da fonte é solto: às vezes é lugar e hora ("Mãe
 * Admirável, 16h"), às vezes é uma nota ("1º dia", "31 anos", "para
 * retirada", "até 4 de setembro"). Das trinta variações do arquivo, vinte
 * não são lugar.
 *
 * A regra que separa as duas coisas: lugar é o que vem ANTES de uma hora.
 * Sem hora no detalhe, não há lugar — e a nota vai para a descrição do
 * evento, em vez de aparecer na tela onde se lê o endereço da missa.
 */
export function localDoDetalhe(detalhe?: string): string | null {
  if (!detalhe) return null;
  if (!/\d{1,2}\s*h/i.test(detalhe)) return null;
  const semHora = detalhe.replace(/,?\s*\d{1,2}\s*h\s*(\d{2})?/i, "").trim();
  return semHora.replace(/[,;]$/, "").trim() || null;
}

/** O título sem preposições: "Apostolado DE Oração" == "Apostolado DA Oração". */
function tituloSolto(titulo: string): string {
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

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type RotinaDaParoquia = RecurrenceRule & { type: string; title: string | null };

/**
 * Os dias do ano em que a paróquia já tem MISSA por rotina, de hoje em diante.
 *
 * Serve a uma pergunta diferente de `cobertoPorRotina`: lá é "esta marcação
 * é a mesma que a rotina"; aqui é "já há missa neste dia, com qualquer
 * nome". A paróquia tem "Missa Sexta, toda sexta, 19h30", e o calendário
 * repete a missa da primeira sexta com outro nome e sem hora.
 *
 * Só rotina de MISSA conta: a Adoração de sábado não deve calar uma missa.
 *
 * Vale a REGRA, e não as datas já geradas, porque a regra é verdadeira além
 * do horizonte que o job da madrugada preenche. E só do dia de hoje em
 * diante: a rotina não gera para trás, então o que já passou fica.
 */
export function diasComMissaDeRotina(
  rotinas: RotinaDaParoquia[],
  ano: number,
  hoje: Date,
): Set<string> {
  const inicioDoAno = new Date(Date.UTC(ano, 0, 1));
  const fimDoAno = new Date(Date.UTC(ano + 1, 0, 1));
  const daquiPraFrente = hoje > inicioDoAno ? hoje : inicioDoAno;

  const dias = new Set<string>();
  for (const rotina of rotinas) {
    if (rotina.type !== "missa") continue;
    for (const dia of occurrencesBetween(rotina, daquiPraFrente, fimDoAno)) {
      dias.add(dia.toISOString().slice(0, 10));
    }
  }
  return dias;
}

async function main() {
  const [caminho, anoBruto, bandeira] = process.argv.slice(2);
  const aplicar = bandeira === "--aplicar";
  const ano = Number(anoBruto);
  if (!caminho || !ano) {
    console.error("Uso: npx tsx scripts/importar-calendario.ts <arquivo.html> <ano> [--aplicar]");
    process.exit(1);
  }

  const host = (process.env.DATABASE_URL ?? "").replace(/.*@/, "").split("/")[0] ?? "";
  console.log(`Banco: ${host}`);
  console.log(aplicar ? "Modo: APLICANDO no banco." : "Modo: ENSAIO (nada será escrito).");

  const { MONTHS } = lerCalendario(caminho);

  /*
   * As festas que o app já calcula, dia a dia do ano.
   *
   * `getFeastOn` responde por data, então a varredura é do 1º de janeiro ao
   * 31 de dezembro — 365 perguntas a uma função pura, o que custa nada e
   * evita depender de um formato de lista que o módulo não expõe.
   */
  const jaCalculadas = new Map<string, string>();
  for (let d = new Date(Date.UTC(ano, 0, 1)); d.getUTCFullYear() === ano; d.setUTCDate(d.getUTCDate() + 1)) {
    const festa = getFeastOn(new Date(d));
    if (festa) jaCalculadas.set(d.toISOString().slice(0, 10), normalizar(festa.name));
  }

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

    console.log(`Paróquia: ${paroquia.name}`);

    /*
     * Os dias que as rotinas da paróquia já cobrem, por título solto.
     *
     * A regra tem hora; a marcação da página, não. Onde as duas caem no
     * mesmo dia, a rotina ganha — ela diz mais.
     */
    const cobertoPorRotina = new Set<string>();
    const rotinas = await tx.celebrationSchedule.findMany({
      where: { parishId: paroquia.id, active: true },
      select: {
        title: true,
        type: true,
        frequency: true,
        weekday: true,
        weekOfMonth: true,
        timeMinutes: true,
        startsOn: true,
        endsOn: true,
      },
    });
    /*
     * Os dias em que a paróquia já tem MISSA por rotina, daqui pra frente.
     *
     * Separado do conjunto acima porque a pergunta é outra: lá é "esta
     * marcação é a mesma que a rotina"; aqui é "já há missa neste dia". A
     * paróquia tem "Missa Sexta, toda sexta, 19h30", e o calendário repete
     * a missa da primeira sexta com outro nome e sem hora — sem isto, a
     * mesma missa aparece duas vezes, uma delas sem horário.
     *
     * Só do dia de hoje em diante: janeiro já passou, e a rotina não gera
     * para trás. Vale a REGRA, não as datas já materializadas, porque a
     * regra é verdadeira além do horizonte que o job preenche.
     */
    const diasComMissa = diasComMissaDeRotina(rotinas, ano, new Date(hojeEmBrasilia()));

    for (const rotina of rotinas) {
      if (!rotina.title) continue;
      const dias = occurrencesBetween(
        rotina,
        new Date(Date.UTC(ano, 0, 1)),
        new Date(Date.UTC(ano + 1, 0, 1)),
      );
      for (const dia of dias) {
        cobertoPorRotina.add(`${dia.toISOString().slice(0, 10)}|${tituloSolto(rotina.title)}`);
      }
    }

    let celebracoes = 0;
    let eventos = 0;
    let pulados = 0;
    let jaExistiam = 0;
    let porRotina = 0;
    const missaNoMesmoDia: string[] = [];
    let corrigidos = 0;

    for (const mes of MONTHS) {
      for (const [diaBruto, marcacoes] of Object.entries(mes.days)) {
        const dia = Number(diaBruto);
        const chaveDoDia = `${ano}-${String(mes.n).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

        for (const marcacao of marcacoes) {
          const festa = jaCalculadas.get(chaveDoDia);
          if (festa && normalizar(marcacao.t) === festa) {
            pulados++;
            continue;
          }

          const minutos = minutosDoDetalhe(marcacao.m);
          if (
            minutos === null &&
            cobertoPorRotina.has(`${chaveDoDia}|${tituloSolto(marcacao.t)}`)
          ) {
            porRotina++;
            continue;
          }

          const classe = classificar(marcacao);

          /*
           * Missa sem hora num dia em que a paróquia já tem missa.
           *
           * Decisão do pároco, e ela custa: quando houver de fato DUAS
           * missas no mesmo dia — "Missa na Colina", numa comunidade —, a
           * segunda some. Por isso as puladas são listadas nome por nome no
           * fim, e não contadas: quem lê decide se falta alguma, em vez de
           * descobrir pela ausência.
           */
          if (minutos === null && classe.tipo === "celebracao" && classe.ct === "missa" && diasComMissa.has(chaveDoDia)) {
            missaNoMesmoDia.push(`${chaveDoDia} · ${marcacao.t}`);
            continue;
          }
          const local = localDoDetalhe(marcacao.m);
          const quando = brasiliaWallClockToUtc(ano, mes.n - 1, dia, minutos ?? 0);

          if (classe.tipo === "celebracao") {
            const existe = await tx.celebration.findFirst({
              where: { parishId: paroquia.id, startsAt: quando, title: marcacao.t },
              select: { id: true, semHora: true, location: true },
            });
            if (existe) {
              /*
               * Conserta o que entrou numa passada anterior: a marca de "só
               * o dia", que não existia no começo, e o local, que já recebeu
               * nota em vez de lugar. Rodar de novo passa a ser conserto, e
               * não só uma contagem.
               */
              const arrumar: { semHora?: boolean; location?: string | null } = {};
              if (existe.semHora !== (minutos === null)) arrumar.semHora = minutos === null;
              if (existe.location !== local) arrumar.location = local;
              if (aplicar && Object.keys(arrumar).length > 0) {
                await tx.celebration.update({ where: { id: existe.id }, data: arrumar });
                corrigidos++;
              }
              jaExistiam++;
              continue;
            }
            if (aplicar) {
              await tx.celebration.create({
                data: {
                  parishId: paroquia.id,
                  type: classe.ct,
                  title: marcacao.t,
                  startsAt: quando,
                  location: local,
                  semHora: minutos === null,
                  createdBy: autor.userId,
                },
              });
            }
            celebracoes++;
          } else {
            const existe = await tx.event.findFirst({
              where: { parishId: paroquia.id, startsAt: quando, title: marcacao.t },
              select: { id: true, location: true },
            });
            if (existe) {
              if (aplicar && existe.location !== local) {
                await tx.event.update({ where: { id: existe.id }, data: { location: local } });
                corrigidos++;
              }
              jaExistiam++;
              continue;
            }
            if (aplicar) {
              await tx.event.create({
                data: {
                  parishId: paroquia.id,
                  title: marcacao.t,
                  description: marcacao.m ?? null,
                  startsAt: quando,
                  location: local,
                  semHora: minutos === null,
                  createdBy: autor.userId,
                },
              });
            }
            eventos++;
          }
        }
      }
    }

    console.log("");
    console.log(`Celebrações: ${celebracoes}`);
    console.log(`Eventos:     ${eventos}`);
    console.log(`Já existiam: ${jaExistiam}${corrigidos ? ` (${corrigidos} corrigidos)` : ""}`);
    console.log(`Pulados (o app já calcula a festa naquele dia): ${pulados}`);
    console.log(`Pulados (a paróquia já tem a rotina, com hora): ${porRotina}`);
    console.log(`Pulados (missa sem hora num dia que já tem missa): ${missaNoMesmoDia.length}`);
    for (const linha of missaNoMesmoDia) console.log(`  · ${linha}`);
  });
}

/*
 * Só roda quando é CHAMADO, nunca quando é importado.
 *
 * Sem esta guarda, um teste que importa `importar-calendario` para exercitar uma
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
