/**
 * Monta o roteiro final, com os prints embutidos.
 *
 * As imagens entram como `data:` URI porque o documento tem de ser UM
 * arquivo: ele é publicado como página, aberto no celular e impresso. Print
 * que depende de arquivo ao lado chega quebrado na mão de quem imprime.
 *
 * A marcação de "toque aqui" não é desenhada na imagem: é uma caixa
 * posicionada por cima, em PORCENTAGEM, a partir do que `capturar.mjs`
 * mediu na tela real. Assim ela continua certa quando o layout mudar — a
 * medida é refeita a cada captura, e não copiada à mão.
 *
 * Uso: npm run passo:montar
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PRINTS = path.join(AQUI, "prints");
const MODELO = path.join(AQUI, "modelo.html");
const SAIDA = path.join(AQUI, "passo-a-passo.html");

const marcacoes = JSON.parse(await readFile(path.join(PRINTS, "marcacoes.json"), "utf8"));

/** `<!--TELA:chave|legenda-->` vira a figura com o print e o destaque. */
async function figura(chave, legenda) {
  const png = await readFile(path.join(PRINTS, `${chave}.png`));
  const base64 = png.toString("base64");
  const m = marcacoes[chave];

  const destaque = m
    ? `<span class="destaque" style="left:${m.x}%;top:${m.y}%;width:${m.largura}%;height:${m.altura}%" aria-hidden="true"></span>`
    : "";

  return `<figure class="tela">
      <div class="moldura">
        <img src="data:image/png;base64,${base64}" alt="${legenda.replace(/"/g, "&quot;")}" />
        ${destaque}
      </div>
      <figcaption>${legenda}</figcaption>
    </figure>`;
}

let html = await readFile(MODELO, "utf8");

const pendentes = [...html.matchAll(/<!--TELA:([\w-]+)\|([^>]*?)-->/g)];
for (const [marca, chave, legenda] of pendentes) {
  html = html.replace(marca, await figura(chave, legenda.trim()));
}

const semImagem = [...html.matchAll(/<!--TELA:/g)];
if (semImagem.length) throw new Error(`${semImagem.length} marcas de tela ficaram sem imagem.`);

await writeFile(SAIDA, html, "utf8");

const kb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
console.log(`${pendentes.length} telas embutidas. ${SAIDA} (${kb} KB)`);
