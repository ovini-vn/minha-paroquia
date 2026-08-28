"use client";

import { useEffect } from "react";

/**
 * A última rede: erro no PRÓPRIO layout raiz.
 *
 * Quando o layout raiz falha, nada dele existe — nem `<html>`, nem `<body>`,
 * nem as fontes, nem o tema. Por isso esta tela declara a própria marcação e
 * usa estilo embutido: depender do globals.css aqui seria contar com o que
 * acabou de quebrar.
 *
 * É deliberadamente feia e curta. Ninguém deveria chegar aqui; se chegar, o
 * que importa é dizer o que houve e oferecer uma saída.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no layout raiz:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f6f1",
          color: "#242124",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto",
              borderRadius: "50%",
              border: "1px solid rgba(201,164,76,0.5)",
              background: "rgba(201,164,76,0.12)",
            }}
            aria-hidden
          />
          <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "20px 0 0" }}>
            O aplicativo não conseguiu abrir
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.55, color: "#6f6a67", margin: "10px 0 0" }}>
            A falha é nossa, não sua. Tente de novo em instantes — nada do que você registrou se
            perdeu.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "11px 22px",
              fontSize: "15px",
              color: "#fffdf8",
              background: "#5b2890",
              border: 0,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>

          {error.digest && (
            <p style={{ fontSize: "12px", color: "#6f6a67", marginTop: 26, lineHeight: 1.5 }}>
              Se acontecer de novo, avise a secretaria e informe este código:
              <br />
              <code style={{ fontFamily: "ui-monospace, monospace" }}>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
