/**
 * Monta o "Pix Copia e Cola" (BR Code) de uma cobrança estática.
 *
 * O BR Code é uma string no formato EMV®QRCPS: uma sequência de campos
 * `IDTAMANHOVALOR`, terminada por um CRC-16 do que veio antes. Não há
 * chamada de banco nenhuma aqui — o payload é montado a partir da chave que
 * a própria paróquia cadastrou, e é a mesma coisa que o aplicativo do banco
 * geraria.
 *
 * POR QUE ISTO EXISTE, se o schema dizia o contrário.
 *
 * `DonationSettings.pixPayload` guarda um BR Code colado do banco, e o
 * comentário dele diz que não montamos payload de propósito: "payload de
 * pagamento errado manda dinheiro para o lugar errado". Aquilo continua
 * verdade e continua valendo para a doação livre.
 *
 * A cobrança identificada não tem essa saída: o identificador precisa
 * entrar DENTRO do payload, e um código colado do banco é fixo — serve a
 * todas as cobranças e portanto não identifica nenhuma. Por isso aqui o
 * risco é enfrentado em vez de evitado, com três anteparos:
 *
 *  1. o CRC é ancorado no vetor do próprio padrão CCITT-FALSE, que
 *     distingue esta variante das parecidas;
 *  2. a chave e o valor entram como a paróquia os cadastrou, sem
 *     normalização "esperta" que possa trocar um caractere;
 *  3. a tela pede um Pix de teste de um centavo antes de liberar.
 *
 * O QUE ESTE CÓDIGO NÃO FAZ: cobrança dinâmica (`payloadFormatIndicator` com
 * URL de PSP). Aquilo exige um provedor de pagamento e devolve um `txid` que
 * o banco reconhece. Aqui a cobrança é ESTÁTICA com um identificador no
 * campo de referência — que os bancos transmitem, mas nem todo extrato
 * devolve. Ver `docs/PIX.md`.
 */

/** Um campo do BR Code: identificador de dois dígitos, tamanho, valor. */
function campo(id: string, valor: string): string {
  const tamanho = String(valor.length).padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/**
 * CRC-16/CCITT-FALSE, que é o exigido pelo padrão.
 *
 * Polinômio 0x1021, valor inicial 0xFFFF, sem reflexão de entrada nem de
 * saída, sem XOR final. Escrito por extenso em vez de reaproveitado de uma
 * biblioteca genérica de CRC porque as variantes se parecem no nome e
 * diferem no resultado — e o resultado errado é um código que o banco recusa
 * ou, pior, aceita torto.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Tira acento e o que o padrão não aceita em nome e cidade.
 *
 * Só nesses dois campos: são texto de exibição, e o padrão os limita a 25 e
 * 15 caracteres. A CHAVE nunca passa por aqui — nela um caractere trocado
 * mudaria o destino do dinheiro.
 */
function paraCampoDeTexto(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite)
    .toUpperCase();
}

export type DadosDoBrCode = {
  /** A chave PIX da paróquia, exatamente como cadastrada. */
  chave: string;
  /** Nome do recebedor, até 25 caracteres depois da limpeza. */
  nome: string;
  /** Cidade do recebedor, até 15 caracteres depois da limpeza. */
  cidade: string;
  /**
   * Valor em centavos, ou nulo para o pagador escolher.
   *
   * Centavos, e não reais com vírgula: dinheiro em ponto flutuante é como o
   * valor errado entra no código sem ninguém ver.
   */
  centavos: number | null;
  /**
   * O identificador da cobrança, que volta no extrato quando o banco o
   * transmite. Até 25 caracteres, sem acento e sem espaço.
   */
  identificador: string;
};

/** Limite do campo de referência no padrão. */
export const LIMITE_DO_IDENTIFICADOR = 25;

export function montarBrCode(dados: DadosDoBrCode): string {
  const chave = dados.chave.trim();
  if (!chave) throw new Error("Sem chave PIX não há como montar o código.");

  const identificador = dados.identificador.trim();
  if (!/^[A-Za-z0-9]{1,25}$/.test(identificador)) {
    throw new Error(
      `Identificador inválido: use até ${LIMITE_DO_IDENTIFICADOR} letras e números, sem espaço.`,
    );
  }

  if (dados.centavos !== null && (!Number.isInteger(dados.centavos) || dados.centavos <= 0)) {
    throw new Error("O valor precisa ser um número inteiro de centavos, maior que zero.");
  }

  const nome = paraCampoDeTexto(dados.nome, 25) || "PARoQUIA".toUpperCase();
  const cidade = paraCampoDeTexto(dados.cidade, 15) || "BRASIL";

  const merchant = campo("00", "br.gov.bcb.pix") + campo("01", chave);

  const partes = [
    campo("00", "01"),
    /*
     * "11" é o código ESTÁTICO — reutilizável. "12" é o dinâmico, e o
     * dinâmico exige uma URL de provedor no campo 25, que não temos.
     *
     * Uma versão anterior deste arquivo trazia "12" com um comentário
     * dizendo o contrário. Seria um código que se anuncia dinâmico
     * carregando conteúdo estático: aplicativo de banco procurando a URL que
     * não está lá.
     */
    campo("01", "11"),
    campo("26", merchant),
    campo("52", "0000"),
    campo("53", "986"),
    ...(dados.centavos !== null ? [campo("54", (dados.centavos / 100).toFixed(2))] : []),
    campo("58", "BR"),
    campo("59", nome),
    campo("60", cidade),
    campo("62", campo("05", identificador)),
  ];

  // O CRC entra sobre o payload INTEIRO já com "6304" no fim — é assim que o
  // padrão define, e calcular antes de acrescentar o cabeçalho dá um código
  // que todo banco recusa.
  const semCrc = `${partes.join("")}6304`;
  return `${semCrc}${crc16(semCrc)}`;
}
