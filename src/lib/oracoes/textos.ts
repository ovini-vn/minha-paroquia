/**
 * As orações, palavra por palavra.
 *
 * São as orações tradicionais da Igreja no Brasil, na forma em que o povo
 * reza — de uso livre, rezadas há gerações. O Pai-Nosso segue o texto em
 * uso no Brasil ("não nos deixeis cair em tentação").
 *
 * Um lugar só para cada texto: o terço, o rosário e as novenas usam o MESMO
 * Pai-Nosso. Se um dia for preciso corrigir uma vírgula, corrige-se aqui.
 */

export type Oracao = {
  titulo: string;
  texto: string;
};

export const SINAL_DA_CRUZ: Oracao = {
  titulo: "Sinal da cruz",
  texto:
    "Pelo sinal da Santa Cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos.\n\nEm nome do Pai, e do Filho, e do Espírito Santo. Amém.",
};

export const OFERECIMENTO_DO_TERCO: Oracao = {
  titulo: "Oferecimento",
  texto:
    "Divino Jesus, nós Vos oferecemos este terço que vamos rezar, contemplando os mistérios da nossa Redenção. Concedei-nos, pela intercessão da Virgem Maria, Mãe de Deus e nossa Mãe, as virtudes que nos são necessárias para bem rezá-lo e a graça de ganharmos as indulgências desta santa devoção.",
};

export const CREIO: Oracao = {
  titulo: "Creio",
  texto:
    "Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus; está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos.\n\nCreio no Espírito Santo, na santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.",
};

export const PAI_NOSSO: Oracao = {
  titulo: "Pai-Nosso",
  texto:
    "Pai nosso que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino; seja feita a vossa vontade, assim na terra como no céu.\n\nO pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.",
};

export const AVE_MARIA: Oracao = {
  titulo: "Ave-Maria",
  texto:
    "Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus.\n\nSanta Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora da nossa morte. Amém.",
};

export const GLORIA: Oracao = {
  titulo: "Glória",
  texto: "Glória ao Pai e ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.",
};

/** A oração que Nossa Senhora ensinou em Fátima, em 1917 — a da padroeira. */
export const O_MEU_JESUS: Oracao = {
  titulo: "Ó meu Jesus",
  texto:
    "Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno; levai as almas todas para o céu e socorrei principalmente as que mais precisarem.",
};

export const AGRADECIMENTO: Oracao = {
  titulo: "Agradecimento",
  texto:
    "Infinitas graças Vos damos, Soberana Rainha, pelos benefícios que todos os dias recebemos de Vossas mãos liberais. Dignai-Vos, agora e para sempre, tomar-nos debaixo do Vosso poderoso amparo e, para mais Vos obrigar, Vos saudamos com uma Salve-Rainha.",
};

export const SALVE_RAINHA: Oracao = {
  titulo: "Salve-Rainha",
  texto:
    "Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva; a vós suspiramos, gemendo e chorando neste vale de lágrimas.\n\nEia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e, depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria.\n\nRogai por nós, santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.",
};

export const SINAL_DA_CRUZ_FINAL: Oracao = {
  titulo: "Sinal da cruz",
  texto: "Em nome do Pai, e do Filho, e do Espírito Santo. Amém.",
};

// ---- Terço da Misericórdia (Santa Faustina) ----------------------------------

export const ETERNO_PAI: Oracao = {
  titulo: "Eterno Pai",
  texto:
    "Eterno Pai, eu Vos ofereço o Corpo e o Sangue, a Alma e a Divindade de Vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e dos do mundo inteiro.",
};

export const PELA_SUA_DOLOROSA_PAIXAO: Oracao = {
  titulo: "Pela sua dolorosa Paixão",
  texto: "Pela Sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.",
};

export const DEUS_SANTO: Oracao = {
  titulo: "Deus Santo",
  texto: "Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro.",
};

export const JESUS_EU_CONFIO: Oracao = {
  titulo: "Jesus, eu confio em Vós",
  texto: "Jesus, eu confio em Vós.",
};
