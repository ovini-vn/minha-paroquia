import { defineConfig } from "@playwright/test";

/**
 * Testes de ponta a ponta: o aplicativo de verdade, num navegador de verdade.
 *
 * Complementam os testes de integração, que exercitam os serviços direto. A
 * diferença importa: erro de fronteira servidor/cliente, guarda de rota e
 * anel de foco não aparecem em teste de serviço — todos já quebraram aqui e
 * só foram vistos abrindo o navegador.
 *
 * Rodam contra o banco de DESENVOLVIMENTO, como os de integração. Cada teste
 * cria a própria paróquia e apaga no fim.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Um worker: os testes compartilham o mesmo banco, e paralelizar criaria
  // interferência difícil de diagnosticar.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // Só guarda rastro do que falhou: rastro de teste verde é lixo que
    // ninguém abre.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    // A primeira compilação do Next é lenta; menos que isto dá falso negativo.
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
