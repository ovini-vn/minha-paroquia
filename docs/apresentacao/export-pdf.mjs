/**
 * Gera o PDF de uma apresentação. Sem argumento, a completa.
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
/*
 * Qual deck gerar. Sem argumento, a completa — que é o index.html e o
 * caminho de sempre.
 *
 *   node docs/apresentacao/export-pdf.mjs            -> apresentacao.pdf
 *   node docs/apresentacao/export-pdf.mjs resumida   -> resumida.pdf
 */
const DECK = process.argv[2] ?? "index";
const SAIDA = path.join(AQUI, DECK === "index" ? "apresentacao.pdf" : `${DECK}.pdf`);

// Mesma proporção do palco do reveal (1600x900), em polegadas a 96dpi.
const LARGURA_POL = 1600 / 96;
const ALTURA_POL = 900 / 96;

/*
 * O `.css` precisa estar aqui, e a falta dele quebrou o PDF inteiro.
 *
 * Quando o estilo das apresentações saiu do HTML para `estilo.css`, este
 * mapa não sabia o que era `.css` e o servia como application/octet-stream.
 * O Chromium RECUSA aplicar folha de estilo com tipo errado — e o PDF saiu
 * só com o tema cru do reveal: prints de celular fora da moldura, títulos
 * em caixa alta, texto escuro sobre fundo roxo. No navegador o HTML estava
 * perfeito, porque lá qualquer servidor comum manda o tipo certo.
 */
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

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

await pagina.goto(`http://127.0.0.1:${porta}/${DECK}.html?print-pdf`, { waitUntil: "networkidle", timeout: 60_000 });

// O reveal só termina de paginar depois de montar; esperar o marcador dele.
await pagina.waitForSelector(".reveal.ready", { timeout: 30_000 });
await pagina.waitForFunction(() => document.querySelectorAll(".pdf-page").length > 0, { timeout: 30_000 });
await pagina.waitForTimeout(1500);

/*
 * CONFERE que o estilo da apresentação aplicou, antes de gravar.
 *
 * O defeito do `.css` passou em silêncio porque este script só vigiava
 * erro de script e requisição que falha — e um estilo recusado por tipo
 * errado volta 200 e não é nenhum dos dois. O script disse "PDF gerado"
 * sobre um PDF quebrado, e o PDF quebrado foi entregue.
 *
 * A prova é o título: o `estilo.css` põe Georgia nos h1/h2; o tema cru do
 * reveal põe sans-serif em caixa alta. Se a fonte não é serifada, o estilo
 * não chegou, e é melhor não gerar nada do que gerar isso.
 */
const estilo = await pagina.evaluate(() => {
  const h = document.querySelector(".reveal h1, .reveal h2");
  const cs = h ? getComputedStyle(h) : null;
  return { fonte: cs?.fontFamily ?? "", caixa: cs?.textTransform ?? "" };
});
if (!/georgia/i.test(estilo.fonte) || estilo.caixa === "uppercase") {
  console.error("O estilo da apresentação NÃO foi aplicado — o PDF sairia quebrado.");
  console.error(`  fonte do título: ${estilo.fonte || "(nenhuma)"} | caixa: ${estilo.caixa || "-"}`);
  console.error("  Confira se estilo.css está sendo servido com content-type text/css.");
  await navegador.close();
  servidor.close();
  process.exit(1);
}

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

console.log(`PDF gerado: ${path.relative(process.cwd(), SAIDA)} (${paginas} páginas, 16:9)`);
if (erros.length) {
  console.log("\nAvisos durante a geração:");
  for (const e of [...new Set(erros)]) console.log("  - " + e);
}
