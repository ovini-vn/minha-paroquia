import {
  AGRADECIMENTO,
  AVE_MARIA,
  CREIO,
  DEUS_SANTO,
  ETERNO_PAI,
  GLORIA,
  JESUS_EU_CONFIO,
  OFERECIMENTO_DO_TERCO,
  O_MEU_JESUS,
  PAI_NOSSO,
  PELA_SUA_DOLOROSA_PAIXAO,
  SALVE_RAINHA,
  SINAL_DA_CRUZ,
  SINAL_DA_CRUZ_FINAL,
  type Oracao,
} from "./textos";
import {
  MISTERIOS,
  NOMES_DOS_CONJUNTOS,
  ORDEM_DO_ROSARIO,
  SINGULAR_DOS_CONJUNTOS,
  enderecoDaBiblia,
  type ConjuntoDeMisterios,
} from "./misterios";
import type { Novena } from "./novenas";

/**
 * Uma oração guiada é uma lista de PASSOS, e cada passo é uma coisa só.
 *
 * É a ideia do terço de chaveiro: a mão não vê o terço inteiro, sente a
 * conta da vez. A tela faz o mesmo — mostra um pedaço do terço com a conta
 * acesa, diz o que fazer nela, mostra só a oração daquela conta, e o botão
 * das mãos em oração passa para a próxima.
 *
 * Os roteiros são montados aqui, longe da tela, por dois motivos: dá para
 * testar que o terço tem cinco dezenas de dez Ave-Marias sem abrir
 * navegador, e a tela não precisa saber o que é um terço — só percorre
 * passos.
 */

export type TipoDeConta = "cruz" | "grande" | "pequena" | "elo" | "medalha";
export type EstadoDeConta = "feita" | "atual" | "futura";
export type Conta = { tipo: TipoDeConta; estado: EstadoDeConta };

export type Passo = {
  /** Estável dentro do roteiro: é a chave de React e o que se guarda para retomar. */
  id: string;
  oracao: Oracao;
  /** O que fazer, dito para quem nunca rezou: "Na primeira conta grande, reze o Pai-Nosso." */
  instrucao: string;
  /** Em que parte está: "Início", "3ª dezena de 5", "Final", "Dia 3 de 9". */
  parte: string;
  /** Onde, dentro da parte: "2ª de 3 Ave-Marias", "7ª Ave-Maria de 10". */
  contador: string;
  /** O pedaço do terço desta parte, com a conta da vez acesa. */
  contas: Conta[];
  misterio?: {
    ordem: string;
    titulo: string;
    contemplar: string;
    referencia: string;
    href: string;
  };
  /** A leitura do dia, nas novenas. */
  leitura?: { referencia: string; href: string };
  /** Passo de silêncio — o pedido pessoal — em que a pessoa fala com as próprias palavras. */
  silencio?: boolean;
};

export type Roteiro = {
  /** "terco:dolorosos", "rosario", "misericordia", "novena:fatima:3" */
  id: string;
  titulo: string;
  subtitulo: string;
  /** A explicação antes de começar: o que é e como vai ser. */
  apresentacao: { texto: string; partes: string[] };
  passos: Passo[];
  conclusao: { titulo: string; texto: string };
};

// ---- utilitários -------------------------------------------------------------

const ORDINAIS = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª", "9ª", "10ª", "11ª", "12ª", "13ª", "14ª", "15ª", "16ª", "17ª", "18ª", "19ª", "20ª"];
const ORDINAIS_MASC = ["1º", "2º", "3º", "4º", "5º"];

function ordinal(n: number): string {
  return ORDINAIS[n - 1] ?? `${n}ª`;
}

/** O pedaço do terço com a conta `atual` acesa, as anteriores já rezadas. */
function segmento(tipos: TipoDeConta[], atual: number): Conta[] {
  return tipos.map((tipo, i) => ({
    tipo,
    estado: i < atual ? "feita" : i === atual ? "atual" : "futura",
  }));
}

function juntar(a: Oracao, b: Oracao): Oracao {
  return { titulo: `${a.titulo} e ${b.titulo}`, texto: `${a.texto}\n\n${b.texto}` };
}

// ---- Terço e Rosário ---------------------------------------------------------

const CONTAS_DO_INICIO: TipoDeConta[] = ["cruz", "grande", "pequena", "pequena", "pequena", "elo"];
const CONTAS_DA_DEZENA: TipoDeConta[] = ["grande", ...Array<TipoDeConta>(10).fill("pequena"), "elo"];

const VIRTUDES = ["o aumento da fé", "o aumento da esperança", "o aumento da caridade"];

function inicioDoTerco(): Passo[] {
  const parte = "Início";
  return [
    {
      id: "inicio-sinal",
      oracao: SINAL_DA_CRUZ,
      instrucao: "Segure a cruz do terço e faça o sinal da cruz.",
      parte,
      contador: "Na cruz",
      contas: segmento(CONTAS_DO_INICIO, 0),
    },
    {
      id: "inicio-oferecimento",
      oracao: OFERECIMENTO_DO_TERCO,
      instrucao: "Ainda na cruz, ofereça o terço a Jesus.",
      parte,
      contador: "Na cruz",
      contas: segmento(CONTAS_DO_INICIO, 0),
    },
    {
      id: "inicio-creio",
      oracao: CREIO,
      instrucao: "Ainda na cruz, reze o Creio.",
      parte,
      contador: "Na cruz",
      contas: segmento(CONTAS_DO_INICIO, 0),
    },
    {
      id: "inicio-pai-nosso",
      oracao: PAI_NOSSO,
      instrucao: "Na primeira conta grande, reze o Pai-Nosso.",
      parte,
      contador: "Conta grande",
      contas: segmento(CONTAS_DO_INICIO, 1),
    },
    ...VIRTUDES.map((virtude, i) => ({
      id: `inicio-ave-${i + 1}`,
      oracao: AVE_MARIA,
      instrucao: `Na ${ordinal(i + 1).toLowerCase()} das três contas pequenas, reze a Ave-Maria pedindo ${virtude}.`,
      parte,
      contador: `${ordinal(i + 1)} de 3 Ave-Marias`,
      contas: segmento(CONTAS_DO_INICIO, 2 + i),
    })),
    {
      id: "inicio-gloria",
      oracao: GLORIA,
      instrucao: "Depois das três contas pequenas, reze o Glória.",
      parte,
      contador: "Glória",
      contas: segmento(CONTAS_DO_INICIO, 5),
    },
  ];
}

function dezena(opcoes: {
  numero: number;
  totalDeDezenas: number;
  conjunto: ConjuntoDeMisterios;
  posicaoNoConjunto: number;
  prefixo: string;
  /** No Rosário, a dezena diz também o conjunto: são quatro na mesma sessão. */
  mostrarConjuntoNaParte: boolean;
}): Passo[] {
  const { numero, totalDeDezenas, conjunto, posicaoNoConjunto, prefixo } = opcoes;
  const m = MISTERIOS[conjunto][posicaoNoConjunto];
  if (!m) throw new Error(`Não há ${posicaoNoConjunto + 1}º mistério em ${conjunto}.`);
  const parte = opcoes.mostrarConjuntoNaParte
    ? `${ordinal(numero)} dezena de ${totalDeDezenas} · ${NOMES_DOS_CONJUNTOS[conjunto]}`
    : `${ordinal(numero)} dezena de ${totalDeDezenas}`;
  const misterio = {
    ordem: `${ORDINAIS_MASC[posicaoNoConjunto]} Mistério ${SINGULAR_DOS_CONJUNTOS[conjunto]}`,
    titulo: m.titulo,
    contemplar: m.contemplar,
    referencia: m.referencia,
    href: enderecoDaBiblia(m),
  };

  return [
    {
      id: `${prefixo}-pai-nosso`,
      oracao: PAI_NOSSO,
      instrucao: "Anuncie o mistério. Depois, na conta grande, reze o Pai-Nosso.",
      parte,
      contador: "Conta grande",
      contas: segmento(CONTAS_DA_DEZENA, 0),
      misterio,
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `${prefixo}-ave-${i + 1}`,
      oracao: AVE_MARIA,
      instrucao:
        i === 0
          ? "Na primeira conta pequena, reze a Ave-Maria. Pense no mistério enquanto reza."
          : `Na ${ordinal(i + 1).toLowerCase()} conta pequena, reze a Ave-Maria.`,
      parte,
      contador: `${ordinal(i + 1)} Ave-Maria de 10`,
      contas: segmento(CONTAS_DA_DEZENA, i + 1),
      misterio,
    })),
    {
      id: `${prefixo}-gloria`,
      oracao: juntar(GLORIA, O_MEU_JESUS),
      instrucao: "Terminadas as dez Ave-Marias, reze o Glória e o Ó meu Jesus.",
      parte,
      contador: "Fim da dezena",
      contas: segmento(CONTAS_DA_DEZENA, 11),
      misterio,
    },
  ];
}

function finalDoTerco(): Passo[] {
  const contas = segmento(["medalha"], 0);
  return [
    {
      id: "final-agradecimento",
      oracao: AGRADECIMENTO,
      instrucao: "Terminadas as dezenas, agradeça a Nossa Senhora.",
      parte: "Final",
      contador: "Agradecimento",
      contas,
    },
    {
      id: "final-salve-rainha",
      oracao: SALVE_RAINHA,
      instrucao: "Reze a Salve-Rainha.",
      parte: "Final",
      contador: "Salve-Rainha",
      contas,
    },
    {
      id: "final-sinal",
      oracao: SINAL_DA_CRUZ_FINAL,
      instrucao: "Termine fazendo o sinal da cruz.",
      parte: "Final",
      contador: "Sinal da cruz",
      contas,
    },
  ];
}

export function roteiroDoTerco(conjunto: ConjuntoDeMisterios): Roteiro {
  return {
    id: `terco:${conjunto}`,
    titulo: "Terço",
    subtitulo: NOMES_DOS_CONJUNTOS[conjunto],
    apresentacao: {
      texto:
        "O terço tem três partes. Em cada dezena você pensa num momento da vida de Jesus e de Maria — os mistérios — enquanto reza. Não precisa decorar nada: a cada toque nas mãos, aparece a oração da vez.",
      partes: [
        "Início: sinal da cruz, oferecimento, Creio, Pai-Nosso, três Ave-Marias e Glória",
        `Cinco dezenas, com os ${NOMES_DOS_CONJUNTOS[conjunto]}: um Pai-Nosso, dez Ave-Marias, o Glória e o Ó meu Jesus`,
        "Final: agradecimento e Salve-Rainha",
      ],
    },
    passos: [
      ...inicioDoTerco(),
      ...MISTERIOS[conjunto].flatMap((_, i) =>
        dezena({
          numero: i + 1,
          totalDeDezenas: 5,
          conjunto,
          posicaoNoConjunto: i,
          prefixo: `dezena-${i + 1}`,
          mostrarConjuntoNaParte: false,
        }),
      ),
      ...finalDoTerco(),
    ],
    conclusao: {
      titulo: "Terço rezado",
      texto: "Que Nossa Senhora leve a Jesus tudo o que você colocou em cada conta.",
    },
  };
}

export function roteiroDoRosario(): Roteiro {
  return {
    id: "rosario",
    titulo: "Rosário",
    subtitulo: "Os quatro conjuntos de mistérios",
    apresentacao: {
      texto:
        "O Rosário completo são quatro terços seguidos: os mistérios Gozosos, Luminosos, Dolorosos e Gloriosos — vinte dezenas. É longo: pode parar quando precisar, e o aplicativo guarda onde você estava.",
      partes: [
        "Início: sinal da cruz, oferecimento, Creio, Pai-Nosso, três Ave-Marias e Glória",
        "Vinte dezenas, cinco de cada conjunto: um Pai-Nosso, dez Ave-Marias, o Glória e o Ó meu Jesus",
        "Final: agradecimento e Salve-Rainha",
      ],
    },
    passos: [
      ...inicioDoTerco(),
      ...ORDEM_DO_ROSARIO.flatMap((conjunto, c) =>
        MISTERIOS[conjunto].flatMap((_, i) =>
          dezena({
            numero: c * 5 + i + 1,
            totalDeDezenas: 20,
            conjunto,
            posicaoNoConjunto: i,
            prefixo: `${conjunto}-${i + 1}`,
            mostrarConjuntoNaParte: true,
          }),
        ),
      ),
      ...finalDoTerco(),
    ],
    conclusao: {
      titulo: "Rosário rezado",
      texto: "Vinte mistérios da vida de Jesus e de Maria. Que eles acompanhem o seu dia.",
    },
  };
}

// ---- Terço da Misericórdia ---------------------------------------------------

const CONTAS_INICIO_MISERICORDIA: TipoDeConta[] = ["cruz", "grande", "pequena", "pequena"];
const CONTAS_DEZENA_MISERICORDIA: TipoDeConta[] = ["grande", ...Array<TipoDeConta>(10).fill("pequena")];
const CONTAS_FINAL_MISERICORDIA: TipoDeConta[] = ["elo", "elo", "elo", "medalha"];

export function roteiroDaMisericordia(): Roteiro {
  const inicio: Passo[] = [
    {
      id: "inicio-sinal",
      oracao: SINAL_DA_CRUZ_FINAL,
      instrucao: "Segure a cruz do terço e faça o sinal da cruz.",
      parte: "Início",
      contador: "Na cruz",
      contas: segmento(CONTAS_INICIO_MISERICORDIA, 0),
    },
    {
      id: "inicio-pai-nosso",
      oracao: PAI_NOSSO,
      instrucao: "Na primeira conta grande, reze o Pai-Nosso.",
      parte: "Início",
      contador: "Pai-Nosso",
      contas: segmento(CONTAS_INICIO_MISERICORDIA, 1),
    },
    {
      id: "inicio-ave",
      oracao: AVE_MARIA,
      instrucao: "Na conta pequena seguinte, reze a Ave-Maria.",
      parte: "Início",
      contador: "Ave-Maria",
      contas: segmento(CONTAS_INICIO_MISERICORDIA, 2),
    },
    {
      id: "inicio-creio",
      oracao: CREIO,
      instrucao: "Na próxima conta pequena, reze o Creio.",
      parte: "Início",
      contador: "Creio",
      contas: segmento(CONTAS_INICIO_MISERICORDIA, 3),
    },
  ];

  const dezenas: Passo[] = Array.from({ length: 5 }, (_, d) => {
    const parte = `${ordinal(d + 1)} dezena de 5`;
    return [
      {
        id: `dezena-${d + 1}-eterno-pai`,
        oracao: ETERNO_PAI,
        instrucao: "Na conta grande, reze o Eterno Pai.",
        parte,
        contador: "Conta grande",
        contas: segmento(CONTAS_DEZENA_MISERICORDIA, 0),
      },
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `dezena-${d + 1}-paixao-${i + 1}`,
        oracao: PELA_SUA_DOLOROSA_PAIXAO,
        instrucao: `Na ${ordinal(i + 1).toLowerCase()} conta pequena, reze:`,
        parte,
        contador: `${ordinal(i + 1)} de 10`,
        contas: segmento(CONTAS_DEZENA_MISERICORDIA, i + 1),
      })),
    ];
  }).flat();

  const final: Passo[] = [
    ...[1, 2, 3].map((vez) => ({
      id: `final-deus-santo-${vez}`,
      oracao: DEUS_SANTO,
      instrucao:
        vez === 1
          ? "Terminadas as cinco dezenas, reze três vezes:"
          : `Reze de novo — é a ${ordinal(vez).toLowerCase()} vez.`,
      parte: "Final",
      contador: `${ordinal(vez)} de 3 vezes`,
      contas: segmento(CONTAS_FINAL_MISERICORDIA, vez - 1),
    })),
    {
      id: "final-confio",
      oracao: JESUS_EU_CONFIO,
      instrucao: "Termine entregando tudo a Jesus:",
      parte: "Final",
      contador: "Jesus, eu confio em Vós",
      contas: segmento(CONTAS_FINAL_MISERICORDIA, 3),
    },
  ];

  return {
    id: "misericordia",
    titulo: "Terço da Misericórdia",
    subtitulo: "A oração que Jesus ensinou a Santa Faustina",
    apresentacao: {
      texto:
        "Reza-se com as contas de um terço comum. É tradição rezá-lo às três da tarde, a hora em que Jesus morreu na cruz, mas pode ser rezado a qualquer momento — por você, por alguém que sofre, por quem está morrendo.",
      partes: [
        "Início: sinal da cruz, Pai-Nosso, Ave-Maria e Creio",
        "Cinco dezenas: o Eterno Pai na conta grande e, nas dez pequenas, “Pela sua dolorosa Paixão”",
        "Final: três vezes “Deus Santo” e “Jesus, eu confio em Vós”",
      ],
    },
    passos: [...inicio, ...dezenas, ...final],
    conclusao: {
      titulo: "Terço da Misericórdia rezado",
      texto: "Jesus, eu confio em Vós.",
    },
  };
}

// ---- Novenas -----------------------------------------------------------------

export function roteiroDoDiaDaNovena(novena: Novena, dia: number): Roteiro {
  const d = novena.dias[dia - 1];
  if (!d) throw new Error(`A novena ${novena.slug} não tem o dia ${dia}.`);

  const parte = `Dia ${dia} de 9`;
  // O pedaço do terço de uma novena são os nove dias: o de hoje aceso.
  const contas = segmento(Array<TipoDeConta>(9).fill("pequena"), dia - 1);
  const leitura = { referencia: d.referencia, href: `/biblia/${d.biblia.livro}/${d.biblia.capitulo}` };

  const passos: Passo[] = [
    { id: "sinal", oracao: SINAL_DA_CRUZ_FINAL, instrucao: "Comece fazendo o sinal da cruz.", parte, contador: "Sinal da cruz", contas },
    { id: "oracao-inicial", oracao: novena.oracaoInicial, instrucao: "Reze a oração de todos os dias da novena.", parte, contador: "Oração inicial", contas },
    {
      id: "meditacao",
      contador: "Meditação do dia",
      oracao: { titulo: d.tema, texto: d.meditacao },
      instrucao: "Leia devagar a meditação de hoje.",
      parte,
      contas,
      leitura,
    },
    {
      id: "pedido",
      contador: "O seu pedido",
      oracao: {
        titulo: "O seu pedido",
        texto: `Em silêncio, apresente agora o seu pedido a ${novena.aQuem}. Diga com as suas palavras o que está no seu coração — por você, pela sua família, por alguém que precisa.`,
      },
      instrucao: "Um momento só seu.",
      parte,
      contas,
      silencio: true,
    },
    { id: "pai-nosso", oracao: PAI_NOSSO, instrucao: "Reze o Pai-Nosso.", parte, contador: "Pai-Nosso", contas },
    { id: "ave-maria", oracao: AVE_MARIA, instrucao: "Reze a Ave-Maria.", parte, contador: "Ave-Maria", contas },
    { id: "gloria", oracao: GLORIA, instrucao: "Reze o Glória.", parte, contador: "Glória", contas },
    { id: "oracao-final", oracao: novena.oracaoFinal, instrucao: "Para terminar, reze:", parte, contador: "Oração final", contas },
  ];

  return {
    id: `novena:${novena.slug}:${dia}`,
    titulo: novena.nome,
    subtitulo: `Dia ${dia} · ${d.tema}`,
    apresentacao: {
      texto:
        dia === 1
          ? `${novena.descricao} Uma novena são nove dias seguidos de oração. Hoje é o primeiro — leva poucos minutos.`
          : `Hoje é o dia ${dia} de 9. Leva poucos minutos.`,
      partes: ["Sinal da cruz e oração inicial", `Meditação: ${d.tema}`, "O seu pedido, Pai-Nosso, Ave-Maria e Glória", "Oração final"],
    },
    passos,
    conclusao:
      dia === 9
        ? { titulo: "Novena concluída", texto: `Nove dias com ${novena.aQuem}. Continue confiando: Deus ouve quem reza com fé.` }
        : { titulo: `Dia ${dia} rezado`, texto: `Amanhã, o dia ${dia + 1}. O aplicativo guarda onde você parou.` },
  };
}
