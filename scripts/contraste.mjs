/*
 * Mede o contraste da paleta em TODAS as combinações que existem no app:
 * 7 tempos litúrgicos x 2 esquemas de cor = 14 paletas.
 *
 * Existe porque o plano de elevação separou "contraste AA" como item que
 * exige medição e não leitura, e conferir 14 paletas a olho não é conferir.
 * O script lê `src/app/globals.css` — a mesma e única fonte que o navegador
 * lê —, então não há paleta escrita duas vezes para sair de sincronia.
 *
 * Limite adotado: WCAG 2.1 AA. 4,5:1 para texto corrido e 3:1 para texto
 * grande (>=24px, ou >=18,66px em negrito) e para elemento de interface.
 * O app tem público idoso, e a maior parte do texto fica em 13 a 14,5px —
 * ou seja, quase tudo cai no limite mais exigente.
 *
 * O que ele NÃO mede, e por isso não deve ser lido como aprovação geral:
 * cor com transparência por cima de outra (as classes `/10`, `/45` do
 * Tailwind), estado `hover` e `disabled`, e imagem enviada pela paróquia
 * atrás de texto. Esses continuam precisando de olho.
 *
 *   node scripts/contraste.mjs          lista só o que reprova
 *   node scripts/contraste.mjs --tudo   lista todos os pares
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(RAIZ, "src/app/globals.css"), "utf8");

const TEMPOS = [
  "tempo_comum",
  "advento",
  "natal",
  "quaresma",
  "triduo_pascal",
  "pascoa",
  "pentecostes",
];

/** Lê as declarações `--x: v;` de um bloco encontrado pelo seletor. */
function bloco(seletorRegex) {
  const m = css.match(seletorRegex);
  if (!m) return {};
  const dentro = m[m.length - 1];
  const tokens = {};
  for (const [, nome, valor] of dentro.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[nome] = valor.trim();
  }
  return tokens;
}

const baseClara = bloco(/:root\s*\{([^}]*)\}/);
const baseEscura = bloco(/:root\[data-color-scheme="dark"\]\s*\{([^}]*)\}/);

function tempoClaro(tempo) {
  return bloco(new RegExp(`(?<!\\]\\s)\\[data-season="${tempo}"\\]\\s*\\{([^}]*)\\}`));
}

function tempoEscuro(tempo) {
  // Os seletores escuros aparecem agrupados por vírgula (natal e páscoa
  // dividem a mesma paleta, por exemplo), então a busca é pelo bloco que
  // contém o tempo em qualquer posição da lista.
  const re = new RegExp(
    `((?::root\\[data-color-scheme="dark"\\]\\s*\\[data-season="[\\w_]+"\\],?\\s*)+)\\{([^}]*)\\}`,
    "g",
  );
  for (const m of css.matchAll(re)) {
    if (m[1].includes(`"${tempo}"`)) {
      const tokens = {};
      for (const [, nome, valor] of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        tokens[nome] = valor.trim();
      }
      return tokens;
    }
  }
  return {};
}

function paleta(tempo, escuro) {
  return escuro
    ? { ...baseClara, ...baseEscura, ...tempoEscuro(tempo) }
    : { ...baseClara, ...tempoClaro(tempo) };
}

/** "36 33 36" -> [36,33,36] */
function rgb(valor) {
  const n = valor.trim().split(/\s+/).map(Number);
  if (n.length !== 3 || n.some(Number.isNaN)) throw new Error(`valor não é RGB: ${valor}`);
  return n;
}

function hex(h) {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

/** Os dois extremos do gradiente da atmosfera. */
function extremosDoWash(p) {
  const achados = [...p["--wash"].matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => hex(m[0]));
  return { inicio: achados[0], fim: achados[achados.length - 1] };
}

function luminancia([r, g, b]) {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function razao(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const BRANCO = [255, 255, 255];

/**
 * Os pares que existem de fato na interface. Cada um traz o limite que se
 * aplica a ELE, e não um limite único: exigir 4,5 de um título de 29px
 * reprovaria o que a norma aprova, e aceitar 3 num texto de 13px aprovaria
 * o que ela reprova.
 */
function pares(p, escuro) {
  const t = (nome) => rgb(p[nome]);
  const wash = extremosDoWash(p);
  /*
   * O preenchimento do botão primário troca de token conforme o esquema.
   * No claro é `--color-primary`; no escuro é `--color-primary-light`, que
   * guarda a cor CHEIA — ver o comentário em `src/components/ui/Button.tsx`.
   * Medir sempre `--color-primary` reprovaria um botão que passa.
   */
  const preenchimento = escuro ? t("--color-primary-light") : t("--color-primary");
  return [
    ["texto sobre o fundo", t("--color-foreground"), t("--color-background"), 4.5],
    ["texto sobre o cartão", t("--color-foreground"), t("--color-surface"), 4.5],
    ["texto sobre o rebaixado", t("--color-foreground"), t("--color-sunken"), 4.5],
    ["texto secundário sobre o fundo", t("--color-muted"), t("--color-background"), 4.5],
    ["texto secundário sobre o cartão", t("--color-muted"), t("--color-surface"), 4.5],
    ["texto secundário sobre o rebaixado", t("--color-muted"), t("--color-sunken"), 4.5],
    ["link sobre o fundo", t("--color-primary"), t("--color-background"), 4.5],
    ["link sobre o cartão", t("--color-primary"), t("--color-surface"), 4.5],
    ["link sobre o rebaixado", t("--color-primary"), t("--color-sunken"), 4.5],
    ["texto do botão principal", BRANCO, preenchimento, 4.5],
    ["texto sobre a atmosfera (topo)", BRANCO, wash.inicio, 4.5],
    ["texto sobre a atmosfera (base)", BRANCO, wash.fim, 4.5],
    ["assinatura dourada na atmosfera", t("--color-gold-soft"), wash.inicio, 4.5],
    ["destaque sobre o tom da atmosfera", t("--color-primary"), t("--color-primary-tint"), 4.5],
    ["aviso de erro sobre o cartão", t("--color-error"), t("--color-surface"), 4.5],
    ["aviso de erro sobre o próprio tom", t("--color-error"), t("--color-error-tint"), 4.5],
    ["aviso de sucesso sobre o cartão", t("--color-success"), t("--color-surface"), 4.5],
    ["aviso de sucesso sobre o próprio tom", t("--color-success"), t("--color-success-tint"), 4.5],
    ["aviso de atenção sobre o cartão", t("--color-warning"), t("--color-surface"), 4.5],
    ["aviso de atenção sobre o próprio tom", t("--color-warning"), t("--color-warning-tint"), 4.5],
    // Borda é elemento de interface, não texto: o limite da norma é 3.
    ["borda forte sobre o cartão", t("--color-border-strong"), t("--color-surface"), 3],
  ];
}

const tudo = process.argv.includes("--tudo");
let reprovados = 0;
let medidos = 0;

for (const escuro of [false, true]) {
  for (const tempo of TEMPOS) {
    const p = paleta(tempo, escuro);
    const linhas = [];
    for (const [nome, frente, fundo, limite] of pares(p, escuro)) {
      const r = razao(frente, fundo);
      medidos += 1;
      const passa = r >= limite;
      if (!passa) reprovados += 1;
      if (!passa || tudo) {
        linhas.push(
          `    ${passa ? "ok  " : "NÃO "} ${r.toFixed(2).padStart(5)}:1 (mín ${limite})  ${nome}`,
        );
      }
    }
    if (linhas.length) {
      console.log(`\n  ${tempo} — ${escuro ? "escuro" : "claro"}`);
      console.log(linhas.join("\n"));
    }
  }
}

console.log(
  `\n${medidos} pares medidos em 14 paletas. ${reprovados === 0 ? "Nenhum reprova." : `${reprovados} abaixo do mínimo.`}`,
);
process.exit(reprovados === 0 ? 0 : 1);
