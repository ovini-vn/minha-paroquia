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
/**
 * Confere que o servidor está de pé ANTES de qualquer outra coisa.
 *
 * Sem isto, o script criava uma sessão no banco e só então falhava 26 vezes
 * com ERR_CONNECTION_REFUSED — ruidoso, e sem dizer a causa real, que é
 * simplesmente o servidor não estar rodando.
 */
async function conferirServidor() {
  try {
    // `redirect: "manual"` é essencial: a raiz responde 307 para /login, e o
    // fetch do Node segue o redirecionamento por padrão — passando a esperar
    // o /login COMPILAR. Na primeira execução isso estoura qualquer limite
    // razoável e o guarda rejeitava um servidor que estava de pé.
    // Qualquer resposta, inclusive 307, já prova que há alguém escutando.
    await fetch(BASE, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
  } catch {
    console.error(`Nada respondendo em ${BASE}.`);
    console.error("");
    console.error("Suba o servidor numa OUTRA janela primeiro:");
    console.error("    npm run dev");
    console.error("");
    console.error("Depois rode este comando de novo.");
    process.exit(1);
  }
}

function obterToken() {
  const daLinhaDeComando = process.argv[2];
  if (daLinhaDeComando) return daLinhaDeComando;

  // Caminho RELATIVO: o absoluto passa por "App Paroquial", e o espaço no
  // meio faz o shell do Windows cortar o argumento em dois.
  const script = path.relative(process.cwd(), path.join(AQUI, "criar-sessao.ts")).split(path.sep).join("/");
  /*
   * Chama o NODE direto no CLI do tsx, em vez de `npx tsx`.
   *
   * As duas alternativas óbvias falham no Windows: com `shell: true` o Node
   * avisa (DEP0190) que os argumentos são concatenados em vez de escapados;
   * sem ele, `npx.cmd` estoura com EINVAL, porque o Node passou a recusar
   * spawn de arquivo .cmd fora de shell — endurecimento de segurança.
   *
   * Chamar `process.execPath` com o cli.mjs não passa por shell nem por
   * arquivo de lote, e funciona igual nos três sistemas.
   */
  const tsx = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  return execFileSync(process.execPath, [tsx, script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

await conferirServidor();
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
  // "Ofertar" era "Doação" até 02/09/2026 — o arquivo acompanha o nome da
  // tela, senão daqui a um ano ninguém sabe o que o print mostra.
  //
  // Uma tela só desde 14/09/2026: "Minha oferta" (/contribuir) virou parte
  // de Ofertar. Por isso dois prints da MESMA tela — o topo, com os cartões
  // que explicam cada causa, e o formulário logo abaixo deles.
  { arquivo: "ofertar", url: "/doacao" },
  // Rola até o VALOR, e não até o título do cartão: com o título, o print
  // saía com o fim da grade de cartões e o formulário cortado no meio.
  { arquivo: "ofertar-formulario", url: "/doacao", rolarAte: "text=Valor (opcional)" },
  { arquivo: "plano", url: "/plano" },

  /*
   * Rezar, desde 15/09/2026. Três prints: o menu, o terço no meio de uma
   * dezena — que é o que explica a ideia, o pedaço do terço com a conta da
   * vez acesa — e a lista de novenas.
   *
   * O terço abre na apresentação ("Começar"). Para chegar à 4ª Ave-Maria da
   * 1ª dezena, o script toca Começar e usa a seta do teclado, que a sessão
   * aceita, até o contador dizer isso. Contar toques fixos quebraria na
   * primeira mudança do roteiro.
   */
  { arquivo: "rezar", url: "/rezar" },
  {
    arquivo: "rezar-terco",
    url: "/rezar/terco",
    acao: async (pagina) => {
      await pagina.getByRole("button", { name: /Começar/ }).last().click();
      for (let i = 0; i < 40; i++) {
        if (await pagina.getByText("4ª Ave-Maria de 10").count()) break;
        await pagina.keyboard.press("ArrowRight");
        await pagina.waitForTimeout(120);
      }
      await pagina.evaluate(() => window.scrollTo(0, 0));
    },
  },
  { arquivo: "rezar-novenas", url: "/rezar/novenas" },
  { arquivo: "comunidade-sacerdotes", url: "/comunidade/sacerdotes" },
  { arquivo: "paroco", url: "/paroco" },

  /*
   * As telas que provam que o app RECEBE, e não só publica.
   *
   * Um padre olhou a apresentação anterior e perguntou se a paróquia já não
   * tinha um site. A pergunta é justa: tudo o que estava nos prints era
   * coisa que a paróquia PUBLICA — avisos, horários, a mensagem do padre.
   * Site faz isso. O que site nenhum faz é saber quem é a pessoa, alcançá-la
   * durante a semana e receber alguma coisa de volta.
   *
   * Estas quatro são a prova disso, e por isso entraram.
   */
  { arquivo: "pedidos", url: "/oracao/pedidos" },
  { arquivo: "eu", url: "/eu" },
  { arquivo: "familia", url: "/eu/familia" },
  { arquivo: "catequese", url: "/catequese" },
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
  /*
   * O domínio SAI do BASE, e não fica fixo em "localhost".
   *
   * O script já aceitava BASE_URL — e precisa aceitar: o `fetch` do Node
   * resolve "localhost" para ::1 e o guarda de servidor falhava com o
   * servidor de pé, o que obriga a apontar para 127.0.0.1. Só que o cookie
   * continuava sendo gravado para "localhost", o navegador não o mandava
   * para 127.0.0.1, e as 33 telas caíam em /login — com uma sessão válida
   * no banco. Duas configurações da mesma coisa em lugares diferentes.
   */
  { name: "comunidade_session", value: token, domain: new URL(BASE).hostname, path: "/", httpOnly: true, sameSite: "Lax" },
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

    // Telas que só mostram o que importa depois de um toque (o terço).
    if (tela.acao) await tela.acao(pagina);

    // Enquadramento: alguns trechos que valem o print não estão no topo.
    if (tela.rolarAte) {
      /*
       * Procura DENTRO do conteúdo, não na página inteira.
       *
       * Desde que o painel ganhou barra lateral, "Membros e papéis" existe
       * duas vezes: na barra (escondida no celular) e na lista. O `.first()`
       * pegava a da barra, e o Playwright esperava quinze segundos por um
       * elemento que nunca ficaria visível.
       */
      const alvo = pagina.locator("main").locator(tela.rolarAte).first();
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
