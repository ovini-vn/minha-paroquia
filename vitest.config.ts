import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    /*
     * Quarenta segundos para o preparo, vinte para o teste.
     *
     * O `beforeAll` de um teste de integração cria paróquia, usuários e
     * vínculos — meia dúzia de idas e voltas até um banco remoto, e não
     * trabalho de processador. Vinte segundos bastavam com 63 arquivos; com
     * 72 e várias execuções concorrentes, começaram a estourar de novo.
     *
     * O teste em si continua com vinte: ali um estouro costuma ser defeito
     * de verdade, e afrouxar esconderia.
     */
    hookTimeout: 40000,
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
     *
     * Baixado de 8 para 4 em 02/09/2026, quando a suíte passou de 63 para 72
     * arquivos e os estouros voltaram. Como o tempo é o mesmo, a única coisa
     * que 8 traziam era disputa pelo pool.
     */
    poolOptions: {
      threads: { maxThreads: 4 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/shims/server-only.ts"),
    },
  },
});
