import type { Oracao } from "./textos";

/**
 * As novenas.
 *
 * AS MEDITAÇÕES FORAM ESCRITAS PARA O APLICATIVO, e não copiadas de livreto.
 * Novenas impressas de editora têm direito autoral; as orações tradicionais
 * (a do Anjo de Fátima, o "Vinde, Espírito Santo") são de uso livre, e só
 * elas vêm da tradição. Todo o resto — meditações, oração inicial e final
 * das outras — é texto próprio, curto de propósito: quem reza pelo celular
 * reza em poucos minutos. Vale o pároco revisar antes de divulgar.
 *
 * Cada dia aponta para um capítulo da Bíblia do próprio app (tradução Matos
 * Soares, numeração da Vulgata — nos livros usados aqui ela coincide com a
 * das Bíblias atuais).
 */

export type DiaDeNovena = {
  tema: string;
  referencia: string;
  biblia: { livro: string; capitulo: number };
  meditacao: string;
};

export type Novena = {
  slug: string;
  nome: string;
  /** Para o pedido: "a Nossa Senhora de Fátima". */
  aQuem: string;
  descricao: string;
  /** Quando é costume rezar. */
  quando: string;
  oracaoInicial: Oracao;
  oracaoFinal: Oracao;
  dias: DiaDeNovena[];
};

const FATIMA: Novena = {
  slug: "nossa-senhora-de-fatima",
  nome: "Novena a Nossa Senhora de Fátima",
  aQuem: "Nossa Senhora de Fátima",
  descricao: "A padroeira da nossa paróquia, que em 1917 pediu aos pastorinhos oração, conversão e o terço pela paz.",
  quando: "A qualquer tempo. É costume de 4 a 12 de maio, antes do dia 13.",
  oracaoInicial: {
    titulo: "Oração do Anjo",
    texto:
      "Meu Deus, eu creio, adoro, espero e amo-Vos. Peço-Vos perdão pelos que não creem, não adoram, não esperam e não Vos amam.",
  },
  oracaoFinal: {
    titulo: "Oração a Nossa Senhora de Fátima",
    texto:
      "Nossa Senhora de Fátima, Mãe da nossa paróquia, que aparecestes aos pastorinhos pedindo oração e conversão: acolhei no vosso Imaculado Coração o pedido que hoje vos confiamos. Ensinai-nos a rezar o terço com amor, a oferecer nossas dores pela paz e a confiar sempre em vosso Filho Jesus. Amém.",
  },
  dias: [
    {
      tema: "Não tenhais medo",
      referencia: "Lucas 1,26-38",
      biblia: { livro: "lucas", capitulo: 1 },
      meditacao:
        "As primeiras palavras de Nossa Senhora aos pastorinhos foram: não tenhais medo. São as mesmas do anjo a Maria, em Nazaré. Deus não chega para assustar, chega para acompanhar. Hoje, entregue a Nossa Senhora o medo que você carrega — de doença, de perder alguém, do futuro — e deixe que Ela diga a você o que disse a Lúcia, Francisco e Jacinta.",
    },
    {
      tema: "Adorar a Deus",
      referencia: "João 4,19-26",
      biblia: { livro: "joao", capitulo: 4 },
      meditacao:
        "Antes de Nossa Senhora, um anjo ensinou às crianças a rezar de joelhos: meu Deus, eu creio, adoro, espero e amo-Vos. Adorar é reconhecer que Deus é Deus, e que nós não somos. Hoje, faça uma pausa de verdade: um minuto em silêncio diante de Deus, sem pedir nada, só estando com Ele.",
    },
    {
      tema: "O terço todos os dias",
      referencia: "Lucas 2,15-19",
      biblia: { livro: "lucas", capitulo: 2 },
      meditacao:
        "Em todas as aparições, Nossa Senhora pediu a mesma coisa: rezai o terço todos os dias, pela paz. O terço é rezar com Maria, que guardava tudo no coração. Não é preciso tempo sobrando: dá para rezar uma dezena no ônibus, na fila, antes de dormir. Hoje, escolha a hora em que o terço vai caber no seu dia.",
    },
    {
      tema: "Oferecer o que dói",
      referencia: "Colossenses 1,24-29",
      biblia: { livro: "colossenses", capitulo: 1 },
      meditacao:
        "Os pastorinhos aprenderam a oferecer pequenos sacrifícios pela conversão dos pecadores: um lanche dado a quem tinha fome, um cansaço aceito sem reclamar. O sofrimento que se oferece a Deus não é desperdiçado. Hoje, pense numa dor ou num incômodo que você está vivendo e ofereça-o a Jesus, por alguém que precisa.",
    },
    {
      tema: "O Imaculado Coração de Maria",
      referencia: "João 19,25-27",
      biblia: { livro: "joao", capitulo: 19 },
      meditacao:
        "Nossa Senhora mostrou aos pastorinhos o seu coração, e prometeu: o meu Imaculado Coração será o teu refúgio. Na cruz, Jesus nos entregou a Ela como filhos. Um coração de mãe não fecha a porta. Hoje, coloque nesse coração as pessoas que você ama e as que você tem dificuldade de amar.",
    },
    {
      tema: "Deus fala aos pequenos",
      referencia: "Mateus 11,25-30",
      biblia: { livro: "mateus", capitulo: 11 },
      meditacao:
        "Deus não escolheu doutores nem autoridades para a mensagem de Fátima: escolheu três crianças pastoras, que mal sabiam ler. Jesus agradece ao Pai por revelar essas coisas aos pequeninos. Hoje, peça a graça de uma fé simples — que confia, que obedece, que não precisa entender tudo para amar.",
    },
    {
      tema: "Conversão",
      referencia: "Marcos 1,14-20",
      biblia: { livro: "marcos", capitulo: 1 },
      meditacao:
        "Nossa Senhora pediu conversão: voltar o coração para Deus. Converter-se não é coisa de um dia só; é deixar, aos poucos, o que nos afasta de Jesus. Hoje, pense com sinceridade numa atitude que você quer mudar — uma palavra dura, um rancor, uma ausência — e peça a Nossa Senhora a força para dar o primeiro passo. A confissão é um bom lugar para começar.",
    },
    {
      tema: "Jesus escondido",
      referencia: "João 6,32-40",
      biblia: { livro: "joao", capitulo: 6 },
      meditacao:
        "São Francisco Marto passava horas diante do sacrário, fazendo companhia ao que chamava de Jesus escondido. Na Eucaristia, Jesus fica conosco de verdade. Hoje, se puder, faça uma visita ao Santíssimo na igreja, ou participe de uma missa durante a semana. Se não puder, faça a comunhão espiritual: diga a Jesus que deseja recebê-Lo.",
    },
    {
      tema: "Por fim, o Coração triunfará",
      referencia: "Apocalipse 12,1-6",
      biblia: { livro: "apocalipse", capitulo: 12 },
      meditacao:
        "Depois de falar de guerras e sofrimentos, Nossa Senhora deixou uma promessa: por fim, o meu Imaculado Coração triunfará. A última palavra é de Deus, e é de paz. Hoje, termine esta novena com esperança. Agradeça pelas graças destes nove dias, as que você percebeu e as que ainda vai perceber.",
    },
  ],
};

const APARECIDA: Novena = {
  slug: "nossa-senhora-aparecida",
  nome: "Novena a Nossa Senhora Aparecida",
  aQuem: "Nossa Senhora Aparecida",
  descricao: "A Mãe do Brasil, encontrada em 1717 nas redes de três pescadores no rio Paraíba.",
  quando: "A qualquer tempo. É costume de 3 a 11 de outubro, antes do dia 12.",
  oracaoInicial: {
    titulo: "Oração inicial",
    texto:
      "Ó Maria, Mãe de Deus e nossa Mãe, que em Aparecida quisestes ficar perto do vosso povo: nestes nove dias queremos caminhar convosco até Jesus. Abri o nosso coração para ouvir a Palavra e para rezar com fé. Amém.",
  },
  oracaoFinal: {
    titulo: "Oração a Nossa Senhora Aparecida",
    texto:
      "Nossa Senhora da Conceição Aparecida, Mãe do povo brasileiro, que fostes encontrada nas águas pelas mãos simples de pescadores: olhai por nossas famílias, pelo nosso trabalho e por quem mais sofre. Juntai o que está partido em nossa vida e levai-nos sempre a Jesus. Amém.",
  },
  dias: [
    {
      tema: "Deus nas coisas simples",
      referencia: "Lucas 5,1-11",
      biblia: { livro: "lucas", capitulo: 5 },
      meditacao:
        "Nossa Senhora não apareceu num palácio: veio nas redes de três pescadores, no meio do trabalho. Deus gosta de nos encontrar no meio da vida comum — no trabalho, na cozinha, no caminho. Hoje, preste atenção nas coisas simples do seu dia e reconheça nelas a presença de Deus.",
    },
    {
      tema: "Juntar o que está partido",
      referencia: "Isaías 61,1-3",
      biblia: { livro: "isaias", capitulo: 61 },
      meditacao:
        "Primeiro veio o corpo da imagem; depois, a cabeça. Os pescadores juntaram as partes e a imagem ficou inteira. Deus faz assim conosco: junta o que a vida quebrou. Hoje, apresente a Nossa Senhora o que está partido em você ou na sua família — uma relação, uma saúde, uma esperança — e confie que Ela sabe juntar.",
    },
    {
      tema: "A pesca depois da noite vazia",
      referencia: "João 21,1-14",
      biblia: { livro: "joao", capitulo: 21 },
      meditacao:
        "Os pescadores tinham passado horas sem pegar nada. Depois de recolherem a imagem, as redes se encheram. Também os apóstolos pescaram a noite toda em vão, até Jesus mandar lançar a rede de novo. Hoje, se você está numa fase de noite vazia, não desista: lance a rede mais uma vez, confiando.",
    },
    {
      tema: "Mãe dos pobres e dos pequenos",
      referencia: "Lucas 1,46-55",
      biblia: { livro: "lucas", capitulo: 1 },
      meditacao:
        "No seu canto de louvor, Maria diz que Deus derruba os poderosos e eleva os humildes, enche de bens os famintos. Aparecida é a mãe de um povo simples. Hoje, reze por quem passa necessidade, e pergunte-se que gesto concreto você pode fazer por alguém que está perto e precisa.",
    },
    {
      tema: "Acolher quem chega",
      referencia: "Mateus 25,31-40",
      biblia: { livro: "mateus", capitulo: 25 },
      meditacao:
        "O santuário de Aparecida recebe gente de todo lugar, sem perguntar de onde vem. A casa de Maria é casa de todos. Jesus diz que tudo o que fazemos ao menor dos irmãos é a Ele que fazemos. Hoje, acolha com paciência alguém que chega à sua vida — um vizinho, um parente difícil, alguém novo na comunidade.",
    },
    {
      tema: "A família",
      referencia: "Lucas 2,41-52",
      biblia: { livro: "lucas", capitulo: 2 },
      meditacao:
        "Jesus cresceu numa família, com Maria e José, em Nazaré. Nem tudo era fácil: houve susto, procura, palavras que não entenderam na hora. Toda família tem os seus nós. Hoje, reze por cada pessoa da sua casa pelo nome, e peça a Nossa Senhora paciência e perdão onde eles faltam.",
    },
    {
      tema: "O trabalho",
      referencia: "Mateus 13,53-58",
      biblia: { livro: "mateus", capitulo: 13 },
      meditacao:
        "Jesus foi conhecido como o filho do carpinteiro. O trabalho honesto santifica. A imagem de Aparecida foi encontrada por pescadores em plena pescaria. Hoje, ofereça a Deus o seu trabalho — o de fora e o de casa — e reze por quem está desempregado ou trabalha em condições difíceis.",
    },
    {
      tema: "Caminhar juntos",
      referencia: "Lucas 24,13-35",
      biblia: { livro: "lucas", capitulo: 24 },
      meditacao:
        "Milhões de romeiros caminham até Aparecida. Na estrada de Emaús, Jesus caminhou ao lado de dois discípulos tristes e se deu a conhecer ao partir o pão. A fé não se vive sozinho. Hoje, agradeça pelas pessoas que caminham com você na fé, e pense em quem você pode convidar para a missa de domingo.",
    },
    {
      tema: "Fazei tudo o que Ele vos disser",
      referencia: "João 2,1-12",
      biblia: { livro: "joao", capitulo: 2 },
      meditacao:
        "Em Caná, Maria percebe que falta vinho e diz aos servos: fazei tudo o que Ele vos disser. É o mesmo conselho que Ela dá a cada um de nós. Nossa Senhora nunca fica com a atenção para si: sempre aponta para Jesus. Hoje, termine a novena perguntando a Jesus o que Ele quer de você, e disponha-se a fazer.",
    },
  ],
};

const ESPIRITO_SANTO: Novena = {
  slug: "divino-espirito-santo",
  nome: "Novena ao Divino Espírito Santo",
  aQuem: "o Espírito Santo",
  descricao: "Os apóstolos rezaram nove dias com Maria esperando o Espírito Santo. É a primeira novena da Igreja.",
  quando: "A qualquer tempo. É costume nos nove dias antes de Pentecostes.",
  oracaoInicial: {
    titulo: "Vinde, Espírito Santo",
    texto:
      "Vinde, Espírito Santo, enchei os corações dos vossos fiéis e acendei neles o fogo do vosso amor. Enviai o vosso Espírito e tudo será criado, e renovareis a face da terra.\n\nOremos: Ó Deus, que instruístes os corações dos vossos fiéis com a luz do Espírito Santo, concedei-nos que, no mesmo Espírito, saibamos o que é reto e gozemos sempre da sua consolação. Por Cristo, Senhor nosso. Amém.",
  },
  oracaoFinal: {
    titulo: "Oração ao Espírito Santo",
    texto:
      "Espírito Santo, hóspede da nossa alma, derramai sobre nós os vossos dons. Iluminai o que está escuro, fortalecei o que está fraco, aquecei o que está frio. Fazei de nós testemunhas do amor de Deus em nossa casa e em nossa comunidade. Amém.",
  },
  dias: [
    {
      tema: "O Espírito repousa sobre nós",
      referencia: "Isaías 11,1-3",
      biblia: { livro: "isaias", capitulo: 11 },
      meditacao:
        "O profeta Isaías anunciou que sobre o Messias repousaria o Espírito do Senhor, com os seus dons. No batismo e na crisma, esse mesmo Espírito foi dado a nós. Ele não é uma ideia: é Deus vivo, morando em quem crê. Hoje, agradeça pelo seu batismo e peça para perceber o Espírito agindo na sua vida.",
    },
    {
      tema: "O dom da Sabedoria",
      referencia: "1 Coríntios 2,6-12",
      biblia: { livro: "1-corintios", capitulo: 2 },
      meditacao:
        "A sabedoria de Deus não é saber muitas coisas: é saborear as coisas de Deus, ver a vida do jeito que Ele vê. Há pessoas simples muito sábias. Hoje, peça ao Espírito Santo o dom da Sabedoria, para dar o valor certo a cada coisa — e não trocar o que dura para sempre pelo que passa.",
    },
    {
      tema: "O dom do Entendimento",
      referencia: "Lucas 24,44-49",
      biblia: { livro: "lucas", capitulo: 24 },
      meditacao:
        "Depois de ressuscitado, Jesus abriu a mente dos discípulos para entenderem as Escrituras. O dom do Entendimento faz a Palavra de Deus deixar de ser letra e virar vida. Hoje, abra a Bíblia na passagem do dia e leia devagar, pedindo ao Espírito Santo que mostre o que ela diz para você.",
    },
    {
      tema: "O dom do Conselho",
      referencia: "João 16,12-15",
      biblia: { livro: "joao", capitulo: 16 },
      meditacao:
        "Jesus prometeu que o Espírito nos guiaria para a verdade inteira. O dom do Conselho ajuda a escolher bem, principalmente quando não há resposta fácil. Hoje, pense numa decisão que você precisa tomar e apresente-a ao Espírito Santo. Antes de decidir, reze; e, se precisar, procure um sacerdote para conversar.",
    },
    {
      tema: "O dom da Fortaleza",
      referencia: "Atos 1,6-11",
      biblia: { livro: "atos", capitulo: 1 },
      meditacao:
        "Recebereis uma força, a do Espírito Santo, disse Jesus. Os apóstolos, que tinham fugido com medo, depois de Pentecostes enfrentaram tudo para anunciar o Evangelho. A Fortaleza é a coragem de não desistir do bem. Hoje, peça essa força para a situação que parece pesada demais para você.",
    },
    {
      tema: "O dom da Ciência",
      referencia: "Romanos 1,18-23",
      biblia: { livro: "romanos", capitulo: 1 },
      meditacao:
        "A criação fala de Deus: o céu, a água, o corpo humano, a semente que brota. O dom da Ciência nos ajuda a ver o mundo como obra de Deus, sem fazer das coisas um deus. Hoje, olhe com calma para algo da natureza e agradeça ao Criador — e cuide dela como quem cuida do que é emprestado.",
    },
    {
      tema: "O dom da Piedade",
      referencia: "Romanos 8,14-17",
      biblia: { livro: "romanos", capitulo: 8 },
      meditacao:
        "É o Espírito que nos faz chamar Deus de Pai, com confiança de filho. O dom da Piedade transforma a oração em conversa de família e nos faz tratar os outros como irmãos. Hoje, reze o Pai-Nosso bem devagar, pensando em cada palavra, e trate alguém com a ternura de quem é da mesma casa.",
    },
    {
      tema: "O dom do Temor de Deus",
      referencia: "Lucas 1,46-50",
      biblia: { livro: "lucas", capitulo: 1 },
      meditacao:
        "Temor de Deus não é medo de castigo: é o respeito amoroso de quem não quer ofender a quem ama. Maria canta que a misericórdia de Deus se estende aos que O temem. Hoje, peça esse dom para levar Deus a sério, e para se afastar do que você sabe que O entristece.",
    },
    {
      tema: "Pentecostes",
      referencia: "Atos 2,1-13",
      biblia: { livro: "atos", capitulo: 2 },
      meditacao:
        "Reunidos em oração com Maria, os discípulos receberam o Espírito como línguas de fogo e saíram anunciando Jesus. Os frutos do Espírito são amor, alegria, paz, paciência, bondade. Hoje, termine a novena pedindo um novo Pentecostes na sua vida e na nossa paróquia, e escolha um fruto do Espírito para viver nesta semana.",
    },
  ],
};

const SAO_JOSE: Novena = {
  slug: "sao-jose",
  nome: "Novena a São José",
  aQuem: "São José",
  descricao: "O esposo de Maria e pai adotivo de Jesus, padroeiro das famílias, dos trabalhadores e da Igreja.",
  quando: "A qualquer tempo. É costume de 10 a 18 de março, antes do dia 19.",
  oracaoInicial: {
    titulo: "Oração inicial",
    texto:
      "São José, pai adotivo de Jesus e esposo da Virgem Maria: nestes nove dias queremos aprender convosco a ouvir Deus no silêncio e a servir com as mãos. Intercedei por nós junto a Jesus. Amém.",
  },
  oracaoFinal: {
    titulo: "Oração a São José",
    texto:
      "Glorioso São José, homem justo e guarda da Sagrada Família: protegei a nossa casa, o nosso trabalho e a nossa Igreja. Ensinai-nos a confiar em Deus mesmo sem entender todos os seus planos, e acompanhai-nos na hora da nossa morte. Amém.",
  },
  dias: [
    {
      tema: "O homem justo",
      referencia: "Mateus 1,18-25",
      biblia: { livro: "mateus", capitulo: 1 },
      meditacao:
        "O Evangelho diz de José uma coisa só: era justo. Diante de uma situação que não entendia, não quis expor Maria. Justo é quem busca fazer o que é certo diante de Deus, sem humilhar ninguém. Hoje, peça a São José a graça de agir com retidão e delicadeza numa situação difícil.",
    },
    {
      tema: "Obedecer sem entender tudo",
      referencia: "Mateus 1,20-24",
      biblia: { livro: "mateus", capitulo: 1 },
      meditacao:
        "Em sonho, o anjo disse a José: não temas receber Maria. Ao acordar, ele fez o que o anjo mandou. José não pediu explicações nem garantias. Hoje, pense em algo que Deus parece pedir e que você ainda não entendeu, e peça a São José a coragem de confiar e dar o passo.",
    },
    {
      tema: "Guarda do Redentor",
      referencia: "Lucas 2,1-7",
      biblia: { livro: "lucas", capitulo: 2 },
      meditacao:
        "Em Belém não havia lugar para eles, e José arrumou como pôde um canto para o Menino nascer. Cuidar é o jeito de José amar. Hoje, reze pelas pessoas que dependem do seu cuidado — filhos, pais idosos, doentes — e por quem cuida dos outros sem que ninguém perceba.",
    },
    {
      tema: "Protetor dos que fogem",
      referencia: "Mateus 2,13-15",
      biblia: { livro: "mateus", capitulo: 2 },
      meditacao:
        "Para salvar o Menino, José levantou-se de noite e partiu com a família para o Egito, terra estrangeira. A Sagrada Família também foi migrante. Hoje, reze pelas famílias que precisaram deixar sua casa e sua terra, e pelos que chegam à nossa cidade sem conhecer ninguém.",
    },
    {
      tema: "O silêncio",
      referencia: "Isaías 30,15-18",
      biblia: { livro: "isaias", capitulo: 30 },
      meditacao:
        "O Evangelho não guarda nenhuma palavra de José. Ele fala pelo que faz. No silêncio e na confiança está a vossa força, diz o profeta. Hoje, desligue o barulho por alguns minutos — televisão, celular — e fique em silêncio diante de Deus, como José na oficina de Nazaré.",
    },
    {
      tema: "O trabalho",
      referencia: "Mateus 13,53-58",
      biblia: { livro: "mateus", capitulo: 13 },
      meditacao:
        "José era carpinteiro, e ensinou o ofício a Jesus. Deus quis crescer numa família que vivia do trabalho das mãos. Hoje, ofereça a São José o seu trabalho, peça por um emprego digno para quem não tem e agradeça por tudo o que suas mãos já construíram.",
    },
    {
      tema: "O pai",
      referencia: "Lucas 2,41-52",
      biblia: { livro: "lucas", capitulo: 2 },
      meditacao:
        "Teu pai e eu te procurávamos aflitos, disse Maria a Jesus no Templo. José foi pai de verdade: procurou, se preocupou, educou. Hoje, reze pelos pais — os presentes, os ausentes, os que já partiram — e por quem faz o papel de pai para alguém que precisa.",
    },
    {
      tema: "Guardião da Igreja",
      referencia: "Mateus 16,13-19",
      biblia: { livro: "mateus", capitulo: 16 },
      meditacao:
        "Quem guardou Jesus e Maria guarda também a Igreja, que é o corpo de Cristo. Por isso São José é padroeiro da Igreja universal. Hoje, reze pelo Papa, pelo nosso bispo, pelo nosso pároco e por toda a nossa comunidade, e pense no que você pode fazer para servir na paróquia.",
    },
    {
      tema: "Padroeiro da boa morte",
      referencia: "João 11,17-27",
      biblia: { livro: "joao", capitulo: 11 },
      meditacao:
        "A tradição conta que José morreu assistido por Jesus e Maria — a morte que todo cristão deseja. Eu sou a ressurreição e a vida, disse Jesus a Marta. Hoje, termine a novena rezando pelos doentes e pelos que estão perto da morte, e confie a São José a sua própria hora, com esperança.",
    },
  ],
};

export const NOVENAS: Novena[] = [FATIMA, APARECIDA, ESPIRITO_SANTO, SAO_JOSE];

export function novenaPorSlug(slug: string): Novena | undefined {
  return NOVENAS.find((n) => n.slug === slug);
}
