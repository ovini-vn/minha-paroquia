/**
 * Captura as telas do passo a passo da catequese, em formato de CELULAR.
 *
 * Além do print, mede ONDE está o elemento que o roteiro manda tocar, em
 * porcentagem da imagem. É o que permite a marcação cair no lugar certo sem
 * ninguém posicionar caixa à mão — e continuar certa quando a tela mudar,
 * porque a medida é refeita a cada captura.
 *
 * Duas sessões, porque são dois públicos com permissões diferentes: a
 * coordenação (pároco) e a catequista da turma. Nenhuma senha passa por
 * aqui: o token é criado direto no banco, como faz o próprio app.
 *
 * Uso:  npm run passo:prints    (com o servidor de pé em outra janela)
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(AQUI, "prints");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function conferirServidor() {
  try {
    await fetch(BASE, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
  } catch {
    console.error(`Nada respondendo em ${BASE}.`);
    console.error("");
    console.error("Suba o servidor numa OUTRA janela primeiro:  npm run dev");
    process.exit(1);
  }
}

/** Token de sessão para um e-mail, criado pelo mesmo caminho do app. */
function sessaoPara(email) {
  const script = path
    .relative(process.cwd(), path.join(AQUI, "..", "apresentacao", "criar-sessao.ts"))
    .split(path.sep)
    .join("/");
  const tsx = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  return execFileSync(process.execPath, [tsx, script, email], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

/**
 * As telas do roteiro.
 *
 * `alvo` é o seletor do que a marcação aponta — o botão, o campo, a linha.
 * Quando não há alvo, a tela inteira é a informação.
 */
const TELAS = [
  // ---- Coordenação ----
  {
    arquivo: "coord-hub",
    quem: "coordenacao",
    url: "/catequese",
    espera: "text=Itinerários",
    alvo: 'a[href="/catequese/itinerarios"]',
  },
  {
    arquivo: "coord-quadro",
    quem: "coordenacao",
    url: "/catequese",
    espera: "text=TURMAS",
    alvo: 'a[href^="/catequese/turma/"]',
  },
  {
    arquivo: "coord-itinerarios",
    quem: "coordenacao",
    url: "/catequese/itinerarios",
    espera: "text=Novo itinerário",
    alvo: "form:has(#nome)",
  },
  {
    arquivo: "coord-temas",
    quem: "coordenacao",
    url: "/catequese/itinerarios",
    clicar: 'a[href^="/catequese/itinerarios/"]',
    espera: "text=ACRESCENTAR ENCONTRO",
    // O formulário de acrescentar, e não o primeiro <form> da página — que
    // é o botãozinho de remover tema, lá em cima.
    alvo: "form:has(#titulo)",
    rolarAte: "text=Acrescentar encontro",
  },
  {
    arquivo: "coord-turma-itinerario",
    quem: "coordenacao",
    url: "/catequese",
    clicar: 'a[href^="/catequese/turma/"]',
    espera: "text=ITINERÁRIO DA TURMA",
    alvo: "#itinerarioId",
    rolarAte: "text=Itinerário da turma",
  },

  // ---- Catequista ----
  {
    arquivo: "cat-turma",
    quem: "catequista",
    url: "/catequese",
    clicar: 'a[href^="/catequese/turma/"]',
    espera: "text=ENCONTROS",
    rolarAte: "text=Encontros",
    alvo: "#itinerarioTemaId",
  },
  {
    arquivo: "cat-aviso",
    quem: "catequista",
    url: "/catequese",
    clicar: 'a[href^="/catequese/turma/"]',
    espera: "text=Falta lançar",
    rolarAte: "text=Falta lançar",
    alvo: "text=Falta lançar",
  },
  {
    arquivo: "cat-chamada",
    quem: "catequista",
    url: "/catequese",
    clicar: 'a[href^="/catequese/turma/"]',
    clicarDepois: 'a[href*="/encontro/"]',
    espera: "text=PRESENÇA NA MISSA",
    rolarAte: "text=Presença na missa",
    alvo: 'input[name="attendedOn"]',
  },

  // ---- Família ----
  {
    arquivo: "familia-ficha",
    quem: "catequista",
    url: "/catequese",
    clicar: 'a[href^="/catequese/aluno/"]',
    espera: "text=Encontros",
  },
];

await conferirServidor();
await mkdir(DESTINO, { recursive: true });

const tokens = {
  coordenacao: sessaoPara("paroco.demo@comunidade.app"),
  catequista: sessaoPara(process.env.EMAIL_CATEQUISTA ?? "catequista.demo@comunidade.app"),
};

const navegador = await chromium.launch();
const marcacoes = {};

for (const tela of TELAS) {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });

  await contexto.addCookies([
    {
      name: "comunidade_session",
      value: tokens[tela.quem],
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // O indicador do Next em desenvolvimento flutua no canto e não é produto.
  await contexto.addInitScript(() => {
    const esconder = () => {
      document.querySelectorAll("nextjs-portal").forEach((n) => n.remove());
    };
    document.addEventListener("DOMContentLoaded", esconder);
    setInterval(esconder, 300);
  });

  const pagina = await contexto.newPage();
  try {
    await pagina.goto(`${BASE}${tela.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });

    if (tela.clicar) {
      await pagina.locator(tela.clicar).first().click();
      await pagina.waitForLoadState("domcontentloaded");
    }
    if (tela.clicarDepois) {
      await pagina.locator(tela.clicarDepois).first().click();
      await pagina.waitForLoadState("domcontentloaded");
    }
    if (tela.espera) {
      await pagina.locator(tela.espera).first().waitFor({ state: "visible", timeout: 30000 });
    }
    if (tela.rolarAte) {
      await pagina.locator(tela.rolarAte).first().scrollIntoViewIfNeeded();
    }
    await pagina.waitForTimeout(900);

    // A medida do alvo é tirada DEPOIS da rolagem, com a página parada: é a
    // posição que a imagem vai de fato mostrar.
    if (tela.alvo) {
      const caixa = await pagina.locator(tela.alvo).first().boundingBox();
      const janela = pagina.viewportSize();
      if (caixa && janela) {
        marcacoes[tela.arquivo] = {
          x: +((caixa.x / janela.width) * 100).toFixed(2),
          y: +((caixa.y / janela.height) * 100).toFixed(2),
          largura: +((caixa.width / janela.width) * 100).toFixed(2),
          altura: +((caixa.height / janela.height) * 100).toFixed(2),
        };
      }
    }

    await pagina.screenshot({ path: path.join(DESTINO, `${tela.arquivo}.png`) });
    console.log(`ok  ${tela.arquivo}${marcacoes[tela.arquivo] ? " (com marcação)" : ""}`);
  } catch (erro) {
    console.error(`FALHOU  ${tela.arquivo}: ${erro.message.split("\n")[0]}`);
  } finally {
    await contexto.close();
  }
}

await writeFile(path.join(DESTINO, "marcacoes.json"), JSON.stringify(marcacoes, null, 2), "utf8");
await navegador.close();
console.log(`\n${Object.keys(marcacoes).length} marcações medidas.`);
