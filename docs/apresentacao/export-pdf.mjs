/**
 * Gera docs/apresentacao/apresentacao.pdf a partir do index.html.
 *
 * Usa o modo `print-pdf` do reveal.js, que reorganiza os slides em páginas
 * antes da impressão. Sem ele, sai uma página só com tudo empilhado.
 *
 * Sobe um servidor estático em vez de abrir com file://: o reveal busca o
 * CSS e o JS por CDN, e algumas dessas requisições são recusadas quando a
 * página vem do sistema de arquivos.
 *
 * Uso:  npm run apresentacao:pdf
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "apresentacao.pdf");

// Mesma proporção do palco do reveal (1600x900), em polegadas a 96dpi.
const LARGURA_POL = 1600 / 96;
const ALTURA_POL = 900 / 96;

const TIPOS = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

const servidor = createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const arquivo = path.join(AQUI, caminho === "/" ? "index.html" : caminho);
    // Não servir nada fora da pasta da apresentação.
    if (!arquivo.startsWith(AQUI)) { res.writeHead(403).end(); return; }
    const conteudo = await readFile(arquivo);
    res.writeHead(200, { "content-type": TIPOS[path.extname(arquivo)] ?? "application/octet-stream" });
    res.end(conteudo);
  } catch {
    res.writeHead(404).end("não encontrado");
  }
});

await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
const porta = servidor.address().port;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 } });

const erros = [];
pagina.on("pageerror", (e) => erros.push(e.message));
pagina.on("requestfailed", (r) => erros.push(`recurso não carregou: ${r.url()}`));

await pagina.goto(`http://127.0.0.1:${porta}/index.html?print-pdf`, { waitUntil: "networkidle", timeout: 60_000 });

// O reveal só termina de paginar depois de montar; esperar o marcador dele.
await pagina.waitForSelector(".reveal.ready", { timeout: 30_000 });
await pagina.waitForFunction(() => document.querySelectorAll(".pdf-page").length > 0, { timeout: 30_000 });
await pagina.waitForTimeout(1500);

const paginas = await pagina.evaluate(() => document.querySelectorAll(".pdf-page").length);

await pagina.pdf({
  path: SAIDA,
  width: `${LARGURA_POL}in`,
  height: `${ALTURA_POL}in`,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  pageRanges: `1-${paginas}`,
});

await navegador.close();
servidor.close();

console.log(`PDF gerado: docs/apresentacao/apresentacao.pdf (${paginas} páginas, 16:9)`);
if (erros.length) {
  console.log("\nAvisos durante a geração:");
  for (const e of [...new Set(erros)]) console.log("  - " + e);
}
