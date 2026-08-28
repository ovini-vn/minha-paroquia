"use client";

import { useEffect } from "react";
import { TelaDeErro } from "@/components/domain/TelaDeErro";

/**
 * Fronteira de erro da aplicação inteira.
 *
 * Pega o que escapar das fronteiras dos grupos de rota. Vale para telas
 * públicas — login, cadastro, política de privacidade —, onde não há
 * "início" para onde voltar.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vai para o log do servidor na Vercel, junto do digest, que é o que
    // liga o relato de quem viu à linha do log.
    console.error("Erro não tratado:", error);
  }, [error]);

  return (
    <TelaDeErro
      digest={error.digest}
      aoTentarDeNovo={reset}
      voltarPara="/"
      rotuloDoVoltar="Ir para a página inicial"
    />
  );
}
