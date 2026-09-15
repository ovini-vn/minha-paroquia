import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { extrairParagrafo } from "@/lib/catecismo/extrair";
import { ehParagrafoValido, enderecoDaPagina, paginaDoParagrafo } from "@/lib/catecismo/busca";
import { ULTIMO_PARAGRAFO } from "@/lib/catecismo/endereco";
import { trechoCurto } from "@/lib/catecismo/trecho";

/**
 * O Catecismo nos encontros da catequese.
 *
 * A coordenação escolhe, para cada tema do itinerário, até três parágrafos.
 * O trecho é lido UMA VEZ no site do Vaticano, na hora em que é escolhido, e
 * fica guardado: a família que abre a ficha do filho não depende do site
 * estar no ar, e o site não recebe uma visita por família.
 */

/** Mais que isso deixa de ser "o essencial do encontro". */
export const PARAGRAFOS_POR_TEMA = 3;

export type LeitorDoCatecismo = (numero: number) => Promise<string | null>;

/**
 * O texto de um parágrafo, lido na página do capítulo em vatican.va.
 *
 * `null` quando a página não tem o parágrafo. Erro de rede vira
 * ValidationError com uma frase para a coordenação — é ela quem está diante
 * do formulário.
 */
export const lerParagrafoNoVaticano: LeitorDoCatecismo = async (numero) => {
  const pagina = paginaDoParagrafo(numero);
  if (!pagina) return null;

  let html: string;
  try {
    const resposta = await fetch(enderecoDaPagina(pagina.arquivo), {
      headers: { "user-agent": "MinhaParoquia/1.0 (+https://minha-paroquia.vercel.app)" },
      // O Catecismo não muda. Uma leitura por mês, por capítulo, é mais do
      // que suficiente — e poupa um serviço alheio.
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    // As páginas são de 2000 e poucos: windows-1252, não UTF-8.
    html = new TextDecoder("windows-1252").decode(await resposta.arrayBuffer());
  } catch {
    throw new ValidationError(
      "Não foi possível abrir o Catecismo no site do Vaticano agora. Tente de novo em alguns minutos.",
    );
  }
  return extrairParagrafo(html, numero);
};

export async function ligarParagrafoAoTema(
  parishId: string,
  temaId: string,
  numero: number,
  ler: LeitorDoCatecismo = lerParagrafoNoVaticano,
) {
  if (!ehParagrafoValido(numero)) {
    throw new ValidationError(`O Catecismo vai do parágrafo 1 ao ${ULTIMO_PARAGRAFO}.`);
  }

  // Confere antes de ir à rede: não vale buscar um texto que não vai entrar.
  const antes = await withTenantContext(parishId, async (tx) => {
    const tema = await tx.itinerarioTema.findFirst({ where: { id: temaId, parishId }, select: { id: true } });
    if (!tema) return null;
    const ligados = await tx.itinerarioTemaCatecismo.findMany({
      where: { parishId, temaId },
      select: { paragrafo: true },
    });
    return ligados;
  });
  if (!antes) return null;
  if (antes.some((l) => l.paragrafo === numero)) return { jaEstava: true as const };
  if (antes.length >= PARAGRAFOS_POR_TEMA) {
    throw new ValidationError(
      `Cada encontro leva até ${PARAGRAFOS_POR_TEMA} parágrafos do Catecismo. Tire um antes de acrescentar outro.`,
    );
  }

  const texto = await ler(numero);
  if (!texto) {
    throw new ValidationError(`O parágrafo ${numero} não foi encontrado no site do Vaticano.`);
  }
  const { trecho, completo } = trechoCurto(texto);

  return withTenantContext(parishId, (tx) =>
    tx.itinerarioTemaCatecismo.upsert({
      where: { temaId_paragrafo: { temaId, paragrafo: numero } },
      create: { parishId, temaId, paragrafo: numero, trecho, completo },
      update: {},
    }),
  );
}

export function desligarParagrafoDoTema(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.itinerarioTemaCatecismo.deleteMany({ where: { id, parishId } }),
  );
}
