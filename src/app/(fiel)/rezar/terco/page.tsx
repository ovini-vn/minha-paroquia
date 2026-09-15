import type { Metadata } from "next";
import Link from "next/link";
import { brasiliaParts } from "@/lib/brasilia";
import {
  NOMES_DOS_CONJUNTOS,
  ORDEM_DO_ROSARIO,
  ehConjunto,
  misteriosDoDia,
} from "@/lib/oracoes/misterios";
import { roteiroDoTerco } from "@/lib/oracoes/roteiros";
import { SessaoDeOracao } from "@/components/oracao/SessaoDeOracao";

export const metadata: Metadata = { title: "Terço" };

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/**
 * O terço, com os mistérios do dia — ou os que a pessoa escolher.
 *
 * O dia vem de Brasília, não do servidor: às nove da noite de segunda o
 * servidor já está na terça, e o app trocaria os mistérios Gozosos pelos
 * Dolorosos na hora em que mais gente reza o terço.
 */
export default async function TercoPage({
  searchParams,
}: {
  searchParams: Promise<{ misterios?: string }>;
}) {
  const { misterios } = await searchParams;
  const diaDaSemana = brasiliaParts(new Date()).weekday;
  const doDia = misteriosDoDia(diaDaSemana);
  const escolhido = ehConjunto(misterios) ? misterios : doDia;

  const escolha = (
    <div>
      <p className="text-[14px] leading-relaxed text-foreground">
        Hoje, {DIAS[diaDaSemana]}, a Igreja propõe os <strong>{NOMES_DOS_CONJUNTOS[doDia]}</strong>.
      </p>
      <p className="mt-1 text-[13px] text-muted">Se preferir outros, escolha:</p>
      <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-2.5">
        {ORDEM_DO_ROSARIO.map((c) => (
          <Link
            key={c}
            href={c === doDia ? "/rezar/terco" : `/rezar/terco?misterios=${c}`}
            aria-pressed={c === escolhido}
            className={
              c === escolhido
                ? "alvo-de-toque inline-flex items-center rounded-full border border-primary bg-primary-tint px-3 py-1.5 text-[13px] font-semibold text-primary"
                : "alvo-de-toque inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[13px] text-muted hover:border-primary hover:text-foreground"
            }
          >
            {NOMES_DOS_CONJUNTOS[c].replace("Mistérios ", "")}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <SessaoDeOracao
      // A chave é o roteiro: trocar os mistérios começa uma sessão nova.
      key={escolhido}
      roteiro={roteiroDoTerco(escolhido)}
      voltar={{ href: "/rezar", rotulo: "Rezar" }}
      antesDeComecar={escolha}
    />
  );
}
