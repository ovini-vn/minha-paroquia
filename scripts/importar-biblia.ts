/**
 * Carga da Bíblia — tradução do Pe. Manuel de Matos Soares.
 *
 * A Escritura é dado, não código: 35 mil versículos não cabem num arquivo
 * do repositório e não mudam nunca. O lugar deles é o banco.
 *
 * Fonte: github.com/Dancrf/biblia-db (biblia.json). A tradução é de Matos
 * Soares (1880-1950) e está em domínio público no Brasil desde 2021 — Lei
 * 9.610/98, art. 41: setenta anos contados de 1º de janeiro do ano seguinte
 * ao da morte do autor. O arquivo traz SÓ o texto dos versículos: nenhuma
 * nota, introdução ou comentário, que é justamente onde poderia haver obra
 * de terceiro com prazo próprio correndo.
 *
 * Uso:
 *   npx tsx scripts/importar-biblia.ts <biblia.json>              (confere)
 *   npx tsx scripts/importar-biblia.ts <biblia.json> --confirmar  (grava)
 *   npx tsx scripts/importar-biblia.ts <biblia.json> --confirmar --recarregar
 *
 * `--recarregar` apaga o que está lá e grava de novo. É o que se usa quando
 * a LIMPEZA muda, não a fonte: preencher lacunas não conserta linha que já
 * existe com texto errado.
 *
 * Sem --confirmar ele apenas confere e mostra o que faria. A conferência
 * roda sempre, e um único desencontro aborta antes de escrever: importar
 * uma Bíblia com um livro trocado é pior do que não ter Bíblia nenhuma.
 *
 * Rodar duas vezes não duplica: a chave é o endereço do versículo.
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { BIBLE_BOOKS } from "../src/lib/bible-books";

type VersiculoDaFonte = { numero: number; texto: string };
type CapituloDaFonte = { capitulo: number; versiculos: VersiculoDaFonte[] };
type LivroDaFonte = { livro: string; capitulos: CapituloDaFonte[] };

const [arquivo, ...flags] = process.argv.slice(2);
const confirmar = flags.includes("--confirmar");
// createMany com skipDuplicates só PREENCHE lacunas: não corrige uma linha
// que já existe com texto errado. Quando a limpeza da fonte muda — foi o
// caso ao remover os marcadores de rodapé — é preciso trocar tudo.
const recarregar = flags.includes("--recarregar");

if (!arquivo) {
  console.error("Uso: npx tsx scripts/importar-biblia.ts <biblia.json> [--confirmar]");
  process.exit(1);
}

// Depois do guarda acima, o caminho é certamente uma string. A checagem
// não atravessa a fronteira da função main() sozinha, então fica gravada
// aqui, uma vez.
const caminhoDoArquivo: string = arquivo;

const prisma = new PrismaClient();

/**
 * A fonte usa português europeu e nomes longos ("Livro Primeiro de Samuel",
 * "Deuteronómio"); o catálogo do app usa os nomes brasileiros. O casamento
 * é POSICIONAL, porque as duas listas seguem a mesma ordem do cânon
 * católico — e é exatamente por isso que a contagem de capítulos de cada
 * livro é conferida antes: ela prova que a posição corresponde ao livro
 * certo, em vez de a gente confiar na ordem no escuro.
 */
/**
 * Tira os marcadores de rodapé da edição impressa.
 *
 * A fonte traz "(ver nota)" colado ao fim de 1.722 versículos — a marca que
 * no papel remetia ao pé da página. As notas em si não estão no arquivo, só
 * as marcas, e elas são apparatus da edição, não Escritura. Saem.
 */
function limpar(texto: string): string {
  return texto.replace(/\s*\(ver nota\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Endereços em que a fonte traz DOIS textos diferentes.
 *
 * Cada um foi examinado e tem uma decisão nomeada. Nada é inventado: ou se
 * fica com uma das versões que já estão no arquivo, ou se juntam as duas.
 *
 * "segunda"  — a primeira ocorrência é intrusa ou errada
 * "primeira" — a segunda é que está truncada
 * "juntar"   — são as duas metades de um versículo partido, na ordem dada
 *
 * Colisão que não estiver aqui ABORTA a importação. Se a fonte mudar, é
 * melhor parar do que escolher no escuro qual metade da Escritura vale.
 */
const DECISOES: Record<string, "primeira" | "segunda" | "juntar" | "juntar-invertido"> = {
  // Mesma frase, com um erro de digitação corrigido na segunda.
  "josue 8:9": "segunda",

  // Bloco intruso: os versículos 14 a 22 aparecem primeiro com o texto da
  // carta a Artaxerxes, que pertence ao capítulo 4 — e que continua lá, em
  // Esdras 4:18. A segunda ocorrência é o capítulo 6 de verdade.
  "esdras 6:14": "segunda",
  "esdras 6:15": "segunda",
  "esdras 6:16": "segunda",
  "esdras 6:17": "segunda",
  "esdras 6:18": "segunda",
  "esdras 6:19": "segunda",
  "esdras 6:20": "segunda",
  "esdras 6:21": "segunda",
  "esdras 6:22": "segunda",

  // Versículo partido em dois, com as metades trocadas de ordem.
  "ester 1:12": "juntar-invertido",

  // Versículo partido, metades na ordem certa.
  "jo 34:20": "juntar",
  "daniel 2:28": "juntar",

  // A primeira ocorrência é o fecho do capítulo anterior (Oseias 10,15).
  "oseias 11:1": "segunda",

  // Aqui é o contrário do resto: a SEGUNDA é um toco que só remete a uma
  // nota de rodapé. O versículo inteiro é o primeiro.
  "lucas 9:41": "primeira",
};

function conferir(fonte: LivroDaFonte[]): string[] {
  const problemas: string[] = [];

  if (fonte.length !== BIBLE_BOOKS.length) {
    problemas.push(`O arquivo tem ${fonte.length} livros; o cânon católico tem ${BIBLE_BOOKS.length}.`);
    return problemas;
  }

  BIBLE_BOOKS.forEach((livro, i) => {
    const daFonte = fonte[i];
    if (!daFonte) {
      problemas.push(`${livro.name} (posição ${i + 1}): faltando no arquivo.`);
      return;
    }
    if (daFonte.capitulos.length !== livro.chapters) {
      problemas.push(
        `${livro.name} (posição ${i + 1}): o catálogo diz ${livro.chapters} capítulos, ` +
          `o arquivo traz ${daFonte.capitulos.length} em "${daFonte.livro}".`,
      );
      return;
    }
    for (const capitulo of daFonte.capitulos) {
      if (capitulo.versiculos.length === 0) {
        problemas.push(`${livro.name} ${capitulo.capitulo}: capítulo sem versículos.`);
      }
      for (const versiculo of capitulo.versiculos) {
        if (!versiculo.texto?.trim()) {
          problemas.push(`${livro.name} ${capitulo.capitulo}:${versiculo.numero}: versículo vazio.`);
        }
      }
    }
  });

  return problemas;
}

async function main() {
  const fonte: LivroDaFonte[] = JSON.parse(await readFile(caminhoDoArquivo, "utf8"));

  const problemas = conferir(fonte);
  if (problemas.length > 0) {
    console.error(`Conferência falhou (${problemas.length}):\n`);
    for (const p of problemas.slice(0, 20)) console.error("  - " + p);
    if (problemas.length > 20) console.error(`  ... e mais ${problemas.length - 20}.`);
    process.exit(1);
  }

  // Limpa, junta as ocorrências repetidas de um mesmo endereço e resolve.
  const porEndereco = new Map<string, { book: string; chapter: number; number: number; textos: string[] }>();

  BIBLE_BOOKS.forEach((livro, i) => {
    const daFonte = fonte[i];
    if (!daFonte) return;
    for (const capitulo of daFonte.capitulos) {
      for (const versiculo of capitulo.versiculos) {
        const chave = `${livro.slug} ${capitulo.capitulo}:${versiculo.numero}`;
        const atual = porEndereco.get(chave);
        const texto = limpar(versiculo.texto);
        if (atual) atual.textos.push(texto);
        else
          porEndereco.set(chave, {
            book: livro.slug,
            chapter: capitulo.capitulo,
            number: versiculo.numero,
            textos: [texto],
          });
      }
    }
  });

  const semDecisao: string[] = [];
  let resolvidos = 0;

  const linhas = [...porEndereco.entries()].map(([chave, v]) => {
    const primeira = v.textos[0] ?? "";
    const segunda = v.textos[1] ?? primeira;
    let text = primeira;

    if (v.textos.length > 1) {
      const unicos = [...new Set(v.textos.map(normalizar))];
      if (unicos.length > 1) {
        const decisao = DECISOES[chave];
        if (!decisao) semDecisao.push(chave);
        resolvidos += 1;
        if (decisao === "segunda") text = segunda;
        else if (decisao === "juntar") text = `${primeira} ${segunda}`;
        else if (decisao === "juntar-invertido") text = `${segunda} ${primeira}`;
        // "primeira" e o caso sem decisão mantêm v.textos[0].
      }
      // Cópia idêntica: fica a primeira, sem cerimônia.
    }

    return { book: v.book, chapter: v.chapter, number: v.number, text };
  });

  if (semDecisao.length > 0) {
    console.error("");
    console.error(semDecisao.length + " endereco(s) com textos diferentes e SEM decisao registrada:");
    for (const c of semDecisao) console.error("  - " + c);
    console.error("");
    console.error("Adicione cada um em DECISOES depois de olhar o texto. Nada foi gravado.");
    process.exit(1);
  }

  const jaTem = await prisma.bibleVerse.count();

  console.log(`Conferência OK: ${BIBLE_BOOKS.length} livros, todas as contagens de capítulo batem.`);
  console.log(`Endereços únicos: ${linhas.length.toLocaleString("pt-BR")}`);
  console.log(`Colisões de texto diferente resolvidas por DECISOES: ${resolvidos}`);
  console.log(`Versículos já no banco: ${jaTem.toLocaleString("pt-BR")}`);

  if (recarregar && confirmar && jaTem > 0) {
    const { count } = await prisma.bibleVerse.deleteMany({});
    console.log(`Apagados ${count.toLocaleString("pt-BR")} versículos antigos para recarregar.`);
  } else if (jaTem > 0 && jaTem !== linhas.length) {
    console.error("");
    console.error("AVISO: o banco ja tem versiculos e o numero nao bate com o do arquivo.");
    console.error("Sem --recarregar, so as lacunas sao preenchidas: o texto existente fica como esta.");
  }

  if (!confirmar) {
    console.log("\nNada foi gravado. Rode de novo com --confirmar para importar.");
    process.exit(0);
  }

  // Em lotes: 35 mil linhas numa tacada só estoura o limite de parâmetros
  // do Postgres. skipDuplicates deixa a carga retomável — se cair no meio,
  // rodar de novo continua de onde parou em vez de recomeçar.
  const LOTE = 2000;
  let gravados = 0;
  for (let i = 0; i < linhas.length; i += LOTE) {
    const { count } = await prisma.bibleVerse.createMany({
      data: linhas.slice(i, i + LOTE),
      skipDuplicates: true,
    });
    gravados += count;
    process.stdout.write(`\r  ${Math.min(i + LOTE, linhas.length)}/${linhas.length}…`);
  }

  const total = await prisma.bibleVerse.count();
  console.log(`\nPronto: ${gravados.toLocaleString("pt-BR")} versículos novos. Total: ${total.toLocaleString("pt-BR")}.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
