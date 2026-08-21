import sharp from "sharp";
import { readFile } from "node:fs/promises";

// Lê o emblema oficial e reaproveita as MESMAS curvas. Gerar os ícones a
// partir do arquivo de origem evita uma segunda cópia do logo, que com o
// tempo divergiria da primeira.
const fonte = await readFile("public/emblema-minha-paroquia.svg", "utf8");
const interno = fonte.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// viewBox do emblema: 296 76 432 602.
const EMB_X = 296, EMB_Y = 76, EMB_W = 432, EMB_H = 602;
const MARFIM = "#f8f6f1";

function montar(S, { maskable }) {
  // Ícone comum: emblema ocupa 81% da altura, igual ao icon.svg do app.
  // Maskable: o sistema recorta em círculo/squircle, então o conteúdo tem
  // que caber no círculo de segurança (80% do lado). Uso a DIAGONAL do
  // emblema para caber de verdade — medir só pela altura deixaria as
  // pontas para fora no recorte circular.
  const diagonal = Math.hypot(EMB_W, EMB_H);
  const escala = maskable ? (0.8 * S) / diagonal : (0.8125 * S) / EMB_H;
  const x = (S - EMB_W * escala) / 2;
  const y = (S - EMB_H * escala) / 2;
  // Sem canto arredondado no maskable: quem arredonda é o sistema, e um
  // canto nosso por baixo do recorte dele viraria borda dupla.
  const raio = maskable ? 0 : Math.round(S * 0.219);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" fill="none">
  <rect width="${S}" height="${S}" rx="${raio}" fill="${MARFIM}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${escala.toFixed(6)}) translate(${-EMB_X} ${-EMB_Y})">${interno}</g>
</svg>`;
}

const saidas = [
  ["public/icons/icon-192.png", 192, { maskable: false }],
  ["public/icons/icon-512.png", 512, { maskable: false }],
  ["public/icons/icon-maskable-512.png", 512, { maskable: true }],
];

for (const [caminho, tamanho, opcoes] of saidas) {
  await sharp(Buffer.from(montar(tamanho, opcoes))).png().toFile(caminho);
  console.log("gerado:", caminho);
}
