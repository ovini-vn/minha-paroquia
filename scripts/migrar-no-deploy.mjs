/**
 * Aplica as migrations pendentes durante o build da Vercel.
 *
 * Antes disto o passo era manual, e passo manual acaba esquecido: já subiu
 * código lendo uma tabela que não existia em produção, e a tela quebrou para
 * todo mundo até alguém rodar `migrate deploy` à mão. Nas semanas seguintes
 * o mesmo passo custou várias idas e vindas — banco errado, string colada
 * pela metade, um "C" sobrando no começo.
 *
 * DUAS GUARDAS, e o script não faz nada sem as duas:
 *
 *   1. `VERCEL_ENV` precisa ser "production". Preview e desenvolvimento
 *      nunca migram — um deploy de teste não pode mexer no banco real.
 *   2. `DIRECT_URL` precisa existir. É a conexão com a role dona do schema,
 *      e ela só está configurada no ambiente de produção.
 *
 * Falhar aqui DERRUBA o build, de propósito. Um deploy que não migrou é
 * pior que um deploy que não aconteceu: o primeiro quebra para o usuário, o
 * segundo só não entra no ar.
 *
 * Localmente não faz nada: `VERCEL_ENV` não existe, então `npm run build`
 * continua sendo só o build.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const ambiente = process.env.VERCEL_ENV;
const direta = process.env.DIRECT_URL;

if (ambiente !== "production") {
  console.log(`[migration] Ambiente "${ambiente ?? "local"}" — nada a fazer.`);
  process.exit(0);
}

if (!direta) {
  console.error("[migration] VERCEL_ENV=production mas DIRECT_URL não está definida.");
  console.error("[migration] Configure-a nas variáveis de ambiente de Production da Vercel.");
  process.exit(1);
}

// O host, sem a senha. Nossa falha mais repetida foi rodar contra o banco
// errado sem perceber; o log do build passa a dizer onde foi.
const host = direta.replace(/.*@/, "").split("/")[0];
console.log(`[migration] Aplicando em ${host}`);

try {
  // Chama o node direto no CLI do Prisma: `npx` passa por shell ou por
  // arquivo .cmd, e nenhum dos dois é confiável em todo ambiente.
  const prisma = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prisma, "migrate", "deploy"], { stdio: "inherit" });
  console.log("[migration] Concluído.");
} catch {
  console.error("[migration] FALHOU. O build para aqui de propósito:");
  console.error("[migration] subir código sem o schema dele quebra a aplicação para todos.");
  process.exit(1);
}
