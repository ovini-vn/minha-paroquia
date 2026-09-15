import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brasiliaParts } from "@/lib/brasilia";
import { ehConjunto, misteriosDoDia } from "@/lib/oracoes/misterios";
import { roteiroDoTerco } from "@/lib/oracoes/roteiros";
import { TERCO_COM_A_VOZ_EM_TESTE } from "@/lib/funcionalidades";
import { TercoPorVoz } from "@/components/oracao/TercoPorVoz";

export const metadata: Metadata = { title: "Terço com a voz" };

/**
 * O terço rezado pela voz — protótipo (ver `TERCO_COM_A_VOZ_EM_TESTE`).
 *
 * Os mesmos passos do Terço de sempre, com os mistérios do dia ou os
 * escolhidos na tela anterior; muda só a forma de passar de uma oração
 * para a outra.
 */
export default async function TercoComAVozPage({
  searchParams,
}: {
  searchParams: Promise<{ misterios?: string }>;
}) {
  if (!TERCO_COM_A_VOZ_EM_TESTE) notFound();
  const { misterios } = await searchParams;
  const escolhido = ehConjunto(misterios) ? misterios : misteriosDoDia(brasiliaParts(new Date()).weekday);
  const voltar = { href: escolhido === misterios ? `/rezar/terco?misterios=${escolhido}` : "/rezar/terco", rotulo: "Terço" };

  return <TercoPorVoz key={escolhido} roteiro={roteiroDoTerco(escolhido)} voltar={voltar} />;
}
