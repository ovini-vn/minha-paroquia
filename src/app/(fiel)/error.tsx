"use client";

import { useEffect } from "react";
import { TelaDeErro } from "@/components/domain/TelaDeErro";

/**
 * Erro dentro do aplicativo do fiel.
 *
 * Existe separado do erro raiz para a pessoa NÃO ser jogada para fora da
 * casca: o cabeçalho e a barra de abas continuam ali, e ela troca de tela
 * sem precisar de botão nenhum. Uma falha na Agenda não deve parecer que o
 * aplicativo inteiro caiu.
 */
export default function ErroDoFiel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro numa tela do fiel:", error);
  }, [error]);

  return (
    <TelaDeErro
      titulo="Esta tela não carregou"
      descricao="A falha é nossa, não sua. As outras telas continuam funcionando — use a barra de baixo para seguir."
      digest={error.digest}
      aoTentarDeNovo={reset}
    />
  );
}
