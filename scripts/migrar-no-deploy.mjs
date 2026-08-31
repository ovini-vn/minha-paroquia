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

/*
 * Papéis e permissões, logo depois do schema.
 *
 * A migration cria a TABELA; ela não cria a LINHA que diz que "plano.manage"
 * existe e que o pároco a tem. Isso vive em `src/server/auth/rbac.ts` e só
 * chega ao banco por `ensureRolesAndPermissionsSeeded`.
 *
 * Era manual, e o manual foi esquecido na primeira oportunidade: a tela do
 * plano pastoral subiu íntegra em produção e ficou inalcançável para todo
 * mundo, porque a permissão dela não existia no banco. Não quebrou nada —
 * e é justamente por não quebrar que ninguém perceberia.
 *
 * Idempotente: são upserts sobre papel, permissão e o par dos dois. Roda a
 * cada deploy sem efeito, até o dia em que há uma permissão nova.
 *
 * Falhar aqui também derruba o build, pela mesma razão da migration: um
 * deploy com a permissão faltando entrega uma tela que ninguém alcança.
 */
try {
  const tsx = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  execFileSync(process.execPath, [tsx, "prisma/seed-production.ts"], { stdio: "inherit" });
  console.log("[rbac] Concluído.");
} catch {
  console.error("[rbac] FALHOU ao sincronizar papéis e permissões. O build para aqui:");
  console.error("[rbac] uma permissão que existe no código e não no banco esconde a tela dela.");
  process.exit(1);
}
