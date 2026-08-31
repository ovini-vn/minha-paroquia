import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Duas colunas no computador, uma no celular.
 *
 * O app nasceu para o telefone, e a coluna única é a forma certa lá. No
 * computador, a mesma coluna vira uma fita estreita no meio de uma tela
 * vazia — e obriga a rolar muito para ver o que caberia junto.
 *
 * A regra de composição: a coluna principal leva o que a pessoa VEIO
 * fazer; a lateral leva o que ela quer saber de relance. Não é "metade do
 * conteúdo de cada lado" — é hierarquia, e por isso a lateral é mais
 * estreita.
 *
 * `items-start` é o que impede a coluna curta de esticar até a altura da
 * longa, deixando um vazio no fim. E a lateral gruda ao rolar, porque o que
 * está nela é justamente consulta.
 *
 * No celular nada disso existe: as duas colunas voltam a ser uma pilha, na
 * ordem em que estão escritas — principal primeiro.
 */
export function DuasColunas({
  principal,
  lateral,
  className,
}: {
  principal: ReactNode;
  lateral: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-start lg:gap-8 xl:gap-10",
        className,
      )}
    >
      <div className="flex flex-col">{principal}</div>
      <div className="flex flex-col lg:sticky lg:top-24">{lateral}</div>
    </div>
  );
}

/**
 * Um trecho de leitura corrida, com largura de leitura.
 *
 * Numa tela larga, texto que ocupa a largura toda fica ilegível: o olho
 * perde a linha na volta. Setenta caracteres é a faixa em que a tipografia
 * conversa há séculos, e vale para a Bíblia, a história da paróquia e a
 * política de privacidade tanto quanto para um livro.
 */
export function Leitura({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full lg:max-w-[70ch]", className)}>{children}</div>;
}
