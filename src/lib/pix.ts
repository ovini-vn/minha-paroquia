/**
 * A chave PIX que a paróquia divulga.
 *
 * Não falamos com banco nenhum aqui. O que existe é conferência de formato —
 * uma chave digitada errada faz o fiel tentar doar e não conseguir, e ele
 * não volta uma segunda vez — e, desde o Pix identificado, a forma canônica
 * da chave para entrar no código de pagamento (ver `chaveParaPagamento`).
 */

export const TIPOS_DE_CHAVE_PIX = [
  { id: "cpf", rotulo: "CPF" },
  { id: "cnpj", rotulo: "CNPJ" },
  { id: "email", rotulo: "E-mail" },
  { id: "telefone", rotulo: "Telefone" },
  { id: "aleatoria", rotulo: "Chave aleatória" },
] as const;

export type TipoDeChavePix = (typeof TIPOS_DE_CHAVE_PIX)[number]["id"];

export function ehTipoDeChavePix(valor: string): valor is TipoDeChavePix {
  return TIPOS_DE_CHAVE_PIX.some((t) => t.id === valor);
}

const digitos = (v: string) => v.replace(/\D/g, "");

/** Dígitos verificadores do CPF — o que separa um número válido de um typo. */
function cpfValido(v: string): boolean {
  const n = digitos(v);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  for (const [tamanho, posicao] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(n[i]) * (posicao - i);
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(n[tamanho])) return false;
  }
  return true;
}

function cnpjValido(v: string): boolean {
  const n = digitos(v);
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
  const conta = (ate: number) => {
    let peso = ate - 7;
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(n[i]) * peso;
      peso -= 1;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return conta(12) === Number(n[12]) && conta(13) === Number(n[13]);
}

/**
 * O que está errado com a chave, ou null se estiver boa.
 *
 * Devolve a frase pronta em vez de um código: quem lê é a secretaria, e a
 * mensagem precisa dizer o que fazer.
 */
export function problemaNaChavePix(tipo: TipoDeChavePix, chave: string): string | null {
  const valor = chave.trim();
  if (!valor) return "Informe a chave PIX.";

  switch (tipo) {
    case "cpf":
      return cpfValido(valor) ? null : "CPF inválido. Confira os números.";
    case "cnpj":
      return cnpjValido(valor) ? null : "CNPJ inválido. Confira os números.";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)
        ? null
        : "E-mail inválido. Use o endereço completo.";
    case "telefone": {
      const n = digitos(valor);
      // Com ou sem o 55 do Brasil; 10 dígitos (fixo) ou 11 (celular).
      const semPais = n.startsWith("55") && n.length > 11 ? n.slice(2) : n;
      return semPais.length === 10 || semPais.length === 11
        ? null
        : "Telefone inválido. Informe com DDD.";
    }
    case "aleatoria":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
        ? null
        : "A chave aleatória tem 32 caracteres separados por hífens, como o banco mostra.";
  }
}

/** Como a chave aparece na tela do fiel — a mesma forma que ele vê no banco. */
export function formatarChavePix(tipo: TipoDeChavePix, chave: string): string {
  const valor = chave.trim();
  const n = digitos(valor);

  if (tipo === "cpf" && n.length === 11) {
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  }
  if (tipo === "cnpj" && n.length === 14) {
    return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
  }
  if (tipo === "telefone") {
    const semPais = n.startsWith("55") && n.length > 11 ? n.slice(2) : n;
    if (semPais.length === 11) {
      return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`;
    }
    if (semPais.length === 10) {
      return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`;
    }
  }
  return valor;
}

/** CNPJ da paróquia, para o fiel conferir a quem está doando. */
export function formatarCnpj(cnpj: string): string {
  const n = digitos(cnpj);
  if (n.length !== 14) return cnpj.trim();
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

export function problemaNoCnpj(cnpj: string): string | null {
  if (!cnpj.trim()) return null;
  return cnpjValido(cnpj) ? null : "CNPJ inválido. Confira os números.";
}

/**
 * A chave na forma que o BR Code exige.
 *
 * A paróquia digita "11.222.333/0001-81" porque é assim que se lê um CNPJ.
 * O código de pagamento não aceita isso: chave de CPF e de CNPJ vai só com
 * dígitos, e telefone vai com o "+55" na frente. Uma chave pontuada dentro
 * do payload é um código que o banco recusa.
 *
 * Isto NÃO é normalização esperta — é a forma canônica de cada TIPO, e o
 * tipo é o que a própria paróquia declarou ao cadastrar. E-mail e chave
 * aleatória passam intactos, porque neles não há forma a impor: qualquer
 * mudança seria adivinhação, e adivinhar na chave manda dinheiro para o
 * lugar errado.
 */
export function chaveParaPagamento(chave: string, tipo: string | null): string {
  const limpa = chave.trim();

  if (tipo === "cpf" || tipo === "cnpj") return digitos(limpa);

  if (tipo === "telefone") {
    const n = digitos(limpa);
    // Já com o código do país, ou sem ele: o Pix quer +55 e mais nada.
    return n.startsWith("55") && n.length > 11 ? `+${n}` : `+55${n}`;
  }

  return limpa;
}
