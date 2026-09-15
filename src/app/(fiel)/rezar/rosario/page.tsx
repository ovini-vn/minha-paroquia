import type { Metadata } from "next";
import { roteiroDoRosario } from "@/lib/oracoes/roteiros";
import { SessaoDeOracao } from "@/components/oracao/SessaoDeOracao";

export const metadata: Metadata = { title: "Rosário" };

export default function RosarioPage() {
  return <SessaoDeOracao roteiro={roteiroDoRosario()} voltar={{ href: "/rezar", rotulo: "Rezar" }} />;
}
