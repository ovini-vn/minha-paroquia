import { test, expect } from "@playwright/test";
import { criarMundo, entrarComo, desconectarBanco, type Mundo } from "./helpers/mundo";

/**
 * O que só o navegador prova.
 *
 * Os testes de integração exercitam os serviços direto e não veem erro de
 * fronteira servidor/cliente, guarda de rota nem estado de tela. Todos os
 * três já quebraram neste projeto e só apareceram abrindo o navegador —
 * inclusive uma página de 404 que respondia 500.
 */

let mundo: Mundo;

test.beforeAll(async () => {
  mundo = await criarMundo("jornada", [
    { chave: "paroco", nome: "Pe. Ponta a Ponta", papel: "PAROCO" },
    { chave: "fiel", nome: "Fiel de Teste", papel: "FIEL" },
  ]);
});

test.afterAll(async () => {
  await mundo.limpar();
  await desconectarBanco();
});

test("o fiel entra e navega pelas abas", async ({ page, context }) => {
  await entrarComo(context, mundo.usuarios.fiel!.token);
  await page.goto("/inicio");

  await expect(page.getByText("A VIDA DA PARÓQUIA")).toBeVisible();
  await expect(page).toHaveTitle(/Início/);

  // A barra de abas é a navegação principal no celular.
  await page.getByRole("link", { name: "Palavra", exact: true }).first().click();
  await expect(page).toHaveURL(/\/oracao/);
  await expect(page).toHaveTitle(/Palavra/);

  await page.getByRole("link", { name: "Servir", exact: true }).first().click();
  await expect(page).toHaveURL(/\/servir/);
});

test("o aviso publicado pelo painel chega ao fiel", async ({ browser }) => {
  const titulo = `Missa das 19h antecipada ${Date.now()}`;

  // O pároco publica pela tela real, preenchendo o formulário.
  const doParoco = await browser.newContext();
  await entrarComo(doParoco, mundo.usuarios.paroco!.token);
  const painel = await doParoco.newPage();
  await painel.goto("/painel/avisos");
  await painel.fill('input[name="title"]', titulo);
  await painel.fill('textarea[name="body"]', "Neste domingo a missa das 19h será às 18h.");
  await painel.getByRole("button", { name: /Publicar aviso/ }).click();
  await expect(painel.getByText(titulo)).toBeVisible();

  // E o fiel, em outra sessão, encontra o aviso.
  const doFiel = await browser.newContext();
  await entrarComo(doFiel, mundo.usuarios.fiel!.token);
  const app = await doFiel.newPage();
  await app.goto("/avisos");
  await expect(app.getByText(titulo)).toBeVisible();

  await doParoco.close();
  await doFiel.close();
});

test("o aviso de uma paróquia não aparece na outra", async ({ browser }) => {
  // O isolamento é a promessa central da plataforma. Os testes de
  // integração já o verificam no banco; aqui é pela interface, que é onde
  // um vazamento apareceria para gente de verdade.
  const outra = await criarMundo("vizinha", [
    { chave: "paroco", nome: "Pe. Vizinho", papel: "PAROCO" },
  ]);
  const titulo = `Quermesse da vizinha ${Date.now()}`;

  try {
    const daVizinha = await browser.newContext();
    await entrarComo(daVizinha, outra.usuarios.paroco!.token);
    const painel = await daVizinha.newPage();
    await painel.goto("/painel/avisos");
    await painel.fill('input[name="title"]', titulo);
    await painel.fill('textarea[name="body"]', "Sábado, no salão da outra paróquia.");
    await painel.getByRole("button", { name: /Publicar aviso/ }).click();
    await expect(painel.getByText(titulo)).toBeVisible();
    await daVizinha.close();

    const doFiel = await browser.newContext();
    await entrarComo(doFiel, mundo.usuarios.fiel!.token);
    const app = await doFiel.newPage();
    await app.goto("/avisos");
    await expect(app.getByText(titulo)).toHaveCount(0);
    await doFiel.close();
  } finally {
    await outra.limpar();
  }
});

test("endereço que não existe mostra a página de não encontrado", async ({ page, context }) => {
  // Trava o que foi corrigido em 27/08: antes qualquer falha virava
  // "Application error" em inglês, e a própria página de 404 chegou a
  // responder 500 por um componente atravessando a fronteira servidor/cliente.
  await entrarComo(context, mundo.usuarios.fiel!.token);
  const resposta = await page.goto("/nao-existe-em-lugar-nenhum");

  expect(resposta?.status()).toBe(404);
  await expect(page.getByText("Esta página não existe")).toBeVisible();
  await expect(page.getByText("Application error")).toHaveCount(0);
});

test("o fiel não alcança o painel de gestão", async ({ page, context }) => {
  await entrarComo(context, mundo.usuarios.fiel!.token);
  await page.goto("/painel");

  // A guarda redireciona em vez de mostrar erro — quem não tem permissão
  // volta para onde tem.
  await expect(page).toHaveURL(/\/inicio/);
});
