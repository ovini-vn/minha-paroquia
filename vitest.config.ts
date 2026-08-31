import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    hookTimeout: 20000,
    testTimeout: 20000,
    /*
     * Oito arquivos por vez, e não todos os 63.
     *
     * Quase todo teste de integração fala com o MESMO banco Neon, e cada um
     * abre conexões no preparo. Sem limite, a suíte disputava o pool e o
     * `beforeAll` de algum arquivo estourava os 20s — falha que não dizia
     * nada sobre o código e sumia na segunda tentativa. Suíte que falha às
     * vezes é pior que suíte lenta: ensina a rodar de novo em vez de ler o
     * erro.
     *
     * E o limite sai de graça: medido, 4 e 8 threads dão o MESMO tempo
     * (4m02s). O gargalo não é processador, é a ida e volta até o banco
     * remoto — mais threads só empilhavam conexão sem acelerar nada.
     */
    poolOptions: {
      threads: { maxThreads: 8 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/shims/server-only.ts"),
    },
  },
});
