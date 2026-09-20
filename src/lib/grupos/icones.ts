import { Cake, Church, Flame, HeartHandshake, HeartPlus, Sparkles, Users } from "lucide-react";
import { MaosEmOracao } from "@/components/oracao/MaosEmOracao";
import { Ostensorio } from "@/components/grupos/Ostensorio";
import type { ChaveDeIcone } from "./cronograma";

/**
 * Os ícones dos encontros em destaque, por chave.
 *
 * Catálogo fechado, como o de Ofertar (ver src/lib/doacao.ts): a tela
 * nunca renderiza o que veio do banco, e uma chave desconhecida vira a
 * estrela em vez de quebrar a página.
 *
 * As chaves são as mesmas que `palpiteDeIcone` devolve ao ler um
 * cronograma colado (ver ./cronograma.ts). As mãos em oração são as do
 * botão Rezar: quem reconhece o desenho num lugar reconhece no outro.
 */
export const ICONES_DE_ENCONTRO = {
  estrela: { rotulo: "Estrela", componente: Sparkles },
  fogo: { rotulo: "Chama (seminário)", componente: Flame },
  coracao: { rotulo: "Coração com cruz", componente: HeartPlus },
  igreja: { rotulo: "Igreja", componente: Church },
  eucaristia: { rotulo: "Ostensório (Eucaristia)", componente: Ostensorio },
  oracao: { rotulo: "Mãos em oração", componente: MaosEmOracao },
  juventude: { rotulo: "Pessoas (encontro com outros grupos)", componente: Users },
  confraternizacao: { rotulo: "Confraternização", componente: HeartHandshake },
  bolo: { rotulo: "Bolo (comemoração)", componente: Cake },
} satisfies Record<ChaveDeIcone, { rotulo: string; componente: unknown }>;

export function iconeDeEncontro(chave: string | null) {
  return (ICONES_DE_ENCONTRO[chave as ChaveDeIcone] ?? ICONES_DE_ENCONTRO.estrela).componente;
}
