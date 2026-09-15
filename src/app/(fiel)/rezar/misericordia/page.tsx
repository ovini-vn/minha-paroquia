import type { Metadata } from "next";
import { roteiroDaMisericordia } from "@/lib/oracoes/roteiros";
import { SessaoDeOracao } from "@/components/oracao/SessaoDeOracao";

export const metadata: Metadata = { title: "Terço da Misericórdia" };

export default function MisericordiaPage() {
  return <SessaoDeOracao roteiro={roteiroDaMisericordia()} voltar={{ href: "/rezar", rotulo: "Rezar" }} />;
}
