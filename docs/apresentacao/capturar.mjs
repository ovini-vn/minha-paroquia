/**
 * Captura as telas da apresentação, em formato de CELULAR.
 *
 * O app é feito para o telefone — é lá que o fiel usa. Print de desktop
 * mostra um layout que quase ninguém vê e faz a ferramenta parecer um
 * sistema administrativo. Na apresentação, cada print entra dentro de uma
 * moldura de celular desenhada em CSS.
 *
 * Usa a sessão criada por criar-sessao.ts em vez de preencher o formulário
 * de login: nenhuma senha passa por aqui.
 *
 * Uso:  npm run apresentacao:prints
 *       (ou: node docs/apresentacao/capturar.mjs <token-de-sessao>)
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(AQUI, "screenshots");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
/**
 * Sem token na linha de comando, o script pede um a criar-sessao.ts.
 *
 * Fazer isso aqui, e não no npm script, é o que mantém o comando igual no
 * Windows e no resto: `$(cat arquivo)` é sintaxe de shell POSIX e quebra no
 * prompt do Windows.
 */
function obterToken() {
  const daLinhaDeComando = process.argv[2];
  if (daLinhaDeComando) return daLinhaDeComando;

  // Caminho RELATIVO: o absoluto passa por "App Paroquial", e o espaço no
  // meio faz o shell do Windows cortar o argumento em dois.
  const script = path.relative(process.cwd(), path.join(AQUI, "criar-sessao.ts")).split(path.sep).join("/");
  return execFileSync("npx", ["tsx", script], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

const token = obterToken();

/** Cada tela vira um arquivo. `espera` é o que precisa existir antes do clique do obturador. */
const TELAS = [
  { arquivo: "inicio", url: "/inicio", espera: "text=A VIDA DA PARÓQUIA" },
  { arquivo: "agenda", url: "/agenda" },
  // A Comunidade abre em "Nossa História"; o que a apresentação usa é a
  // mensagem do padre, mais abaixo.
  { arquivo: "comunidade", url: "/comunidade", rolarAte: "text=Palavra do Padre" },
  { arquivo: "palavra", url: "/oracao" },
  { arquivo: "biblia-indice", url: "/biblia", espera: "text=Antigo Testamento" },
  { arquivo: "biblia-capitulo", url: "/biblia/joao/3" },
  { arquivo: "biblia-busca", url: "/biblia?busca=No%20princípio%20criou" },
  { arquivo: "avisos", url: "/avisos" },
  { arquivo: "notificacoes", url: "/eu/notificacoes" },
  { arquivo: "caminhada", url: "/caminhada" },
  { arquivo: "contato", url: "/contato" },
  { arquivo: "servir", url: "/servir" },
  { arquivo: "doacao", url: "/doacao" },
  { arquivo: "comunidade-sacerdotes", url: "/comunidade/sacerdotes" },
  // No celular o painel também é usado de pé, no fundo da igreja.
  { arquivo: "painel", url: "/painel", rolarAte: "text=Membros e papéis" },
  { arquivo: "painel-avisos", url: "/painel/avisos" },
  { arquivo: "painel-aniversarios", url: "/painel/aniversarios" },
  { arquivo: "painel-missas", url: "/painel/missas" },
  // O tamanho G existe para quem enxerga mal — e é a resposta à objeção
  // "o meu povo é idoso". Precisa aparecer na apresentação.
  { arquivo: "letra-grande", url: "/inicio", fontScale: "g", espera: "text=A VIDA DA PARÓQUIA" },

  // A mesma tela em cada tempo litúrgico. As cores vêm do CSS
  // ([data-season] em globals.css); aqui basta trocar o atributo.
  ...[
    ["advento", "Advento"],
    ["natal", "Natal"],
    ["tempo_comum", "Tempo Comum"],
    ["quaresma", "Quaresma"],
    ["triduo_pascal", "Tríduo Pascal"],
    ["pascoa", "Páscoa"],
    ["pentecostes", "Pentecostes"],
  ].map(([tempo, nomeDoTempo]) => ({
    arquivo: `cor-${tempo}`,
    url: "/inicio",
    tempo,
    nomeDoTempo,
    espera: "text=A VIDA DA PARÓQUIA",
  })),
];

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  // Proporção de celular comum (19.5:9). A barra de abas aparece, que é o
  // que faz o print parecer aplicativo e não site.
  viewport: { width: 390, height: 844 },
  // 3x: o PDF amplia bastante e a moldura de celular é pequena na página.
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});

await contexto.addCookies([
  { name: "comunidade_session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
]);

// O indicador do Next em desenvolvimento fica flutuando no canto e não faz
// parte do produto. Fora dele antes de qualquer clique do obturador.
await contexto.addInitScript(() => {
  const estilo = document.createElement("style");
  estilo.textContent =
    "nextjs-portal,[data-nextjs-toolbar],#__next-build-watcher,[data-next-badge-root]{display:none !important}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(estilo));
});

await mkdir(DESTINO, { recursive: true });
const pagina = await contexto.newPage();
const falhas = [];

for (const tela of TELAS) {
  const endereco = `${BASE}${tela.url}`;
  try {
    const resposta = await pagina.goto(endereco, { waitUntil: "networkidle", timeout: 60_000 });

    // Cair no login significa sessão inválida — melhor saber do que salvar
    // quinze prints da tela de entrar.
    if (pagina.url().includes("/login")) throw new Error("redirecionou para /login");
    if (resposta && resposta.status() >= 400) throw new Error(`HTTP ${resposta.status()}`);

    // Tempo litúrgico: o atributo mora num wrapper do layout do fiel, e é
    // dele que todas as cores da tela descem.
    // Tamanho de letra: a preferência real mora no banco; aqui basta o
    // atributo, que é o que o CSS lê.
    if (tela.fontScale) {
      await pagina.evaluate((v) => document.documentElement.setAttribute("data-font-scale", v), tela.fontScale);
      await pagina.waitForTimeout(400);
    }

    if (tela.espera) await pagina.waitForSelector(tela.espera, { timeout: 15_000 });

    // Enquadramento: alguns trechos que valem o print não estão no topo.
    if (tela.rolarAte) {
      const alvo = pagina.locator(tela.rolarAte).first();
      await alvo.scrollIntoViewIfNeeded({ timeout: 15_000 });
      await pagina.evaluate(() => window.scrollBy(0, -120));
    }
    // Deixa fontes e imagens assentarem antes do obturador.
    await pagina.waitForTimeout(1200);

    /**
     * O tempo litúrgico é aplicado JUNTO AO OBTURADOR, e não antes das
     * esperas: o Next re-renderiza depois da hidratação e devolve o
     * atributo ao valor real. Numa das capturas isso passou despercebido —
     * o arquivo da Páscoa saiu idêntico ao do Tempo Comum.
     */
    /*
     * Sem tempo litúrgico pedido, a tela sai no TEMA PADRÃO — o roxo da
     * marca. Basta remover o atributo: as cores do tempo vivem em
     * [data-season] no globals.css, e sem ele valem as de :root.
     *
     * É o que a apresentação usa em quase todos os slides; as sete cores
     * litúrgicas ficam só no slide que fala delas.
     */
    if (!tela.tempo) {
      await pagina.evaluate(() => {
        document.querySelectorAll("[data-season]").forEach((el) => el.removeAttribute("data-season"));
      });
      await pagina.waitForTimeout(300);
    }

    if (tela.tempo) {
      await pagina.evaluate(
        ({ codigo, nome }) => {
          document.querySelectorAll("[data-season]").forEach((el) => el.setAttribute("data-season", codigo));
          const anda = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const alvos = [];
          while (anda.nextNode()) {
            if (anda.currentNode.nodeValue?.trim().toLowerCase() === "tempo comum") alvos.push(anda.currentNode);
          }
          for (const no of alvos) no.nodeValue = no.nodeValue.replace(/tempo comum/i, nome);
        },
        { codigo: tela.tempo, nome: tela.nomeDoTempo },
      );
      await pagina.waitForTimeout(500);
    }

    await pagina.screenshot({ path: path.join(DESTINO, `${tela.arquivo}.png`) });
    console.log(`ok    ${tela.arquivo.padEnd(22)} ${tela.url}`);
  } catch (erro) {
    falhas.push({ ...tela, motivo: erro.message });
    console.log(`FALHA ${tela.arquivo.padEnd(22)} ${tela.url} — ${erro.message}`);
  }
}

await navegador.close();

console.log(`\n${TELAS.length - falhas.length}/${TELAS.length} capturadas em docs/apresentacao/screenshots.`);
if (falhas.length) process.exitCode = 1;
