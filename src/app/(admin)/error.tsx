"use client";

import { useEffect } from "react";
import { TelaDeErro } from "@/components/domain/TelaDeErro";

/**
 * Erro dentro do painel de gestão.
 *
 * O texto muda em relação ao do fiel num ponto que importa a quem
 * administra: dizer explicitamente que nada foi gravado pela metade. Quem
 * acabou de publicar um aviso e viu a tela quebrar precisa saber se deve
 * publicar de novo.
 */
export default function ErroDoPainel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro numa tela do painel:", error);
  }, [error]);

  return (
    <TelaDeErro
      titulo="Esta tela do painel não carregou"
      descricao="Nada foi gravado pela metade: cada operação é concluída por inteiro ou desfeita. Se você acabou de salvar algo, confira antes de repetir."
      digest={error.digest}
      aoTentarDeNovo={reset}
      voltarPara="/painel"
      rotuloDoVoltar="Voltar ao painel"
    />
  );
}
