import { describe, expect, it } from "vitest";
import { comoTexto, lerPlanoDoHtml } from "@/lib/plano-do-html";

/**
 * O leitor do plano decide a ESTRUTURA do que a paróquia vai ler: o que é
 * seção, o que é tarja e onde um parágrafo começa. Errar aqui não quebra
 * nada — só entrega um documento embaralhado, que é o tipo de defeito que
 * passa por revisão.
 *
 * Os trechos abaixo são a marcação real do calendário de 2026 da Paróquia
 * Nossa Senhora de Fátima, encurtada.
 */

const PAGINA = `
<section class="view" id="view-plano" hidden>
  <div class="page">
    <h1>Plano pastoral</h1>
    <p class="lead">Por que a paróquia faz o que faz em 2026.</p>
    <div class="cols">
      <div class="block">
        <h2>Nosso objetivo paroquial</h2>
        <p>Caminhar juntos, numa Igreja em "Saída Missionária".</p>
      </div>
      <div class="block">
        <h2>Assembleia Paroquial 2026</h2>
        <p>Os grupos de trabalho definiram o rumo do ano.</p>
        <h3>Prioridades paroquiais</h3>
        <div class="prio">
          <div><b>1. Grupos Bíblicos de Reflexão e Missão</b>Por isso as missas de quinta aparecem o ano inteiro.</div>
        </div>
        <h3>Destaques</h3>
        <ol>
          <li>Criar o COMIPA <span>(reunião em 11/mar)</span>.</li>
          <li>Rearticular a Pastoral Vocacional.</li>
        </ol>
      </div>
      <div class="block">
        <h2>Os cinco eixos da Arquidiocese</h2>
        <details><summary>1 · Comunhão</summary><div class="body"><p>Ser uma Igreja que reconcilia.</p></div></details>
        <details><summary>2 · Participação</summary><div class="body"><p>Ser uma Igreja sinodal.</p></div></details>
      </div>
      <div class="block msg">
        <h2>Palavra dos padres</h2>
        <p>Muito obrigado pela sua presença.</p>
      </div>
    </div>
  </div>
</section>
<section class="view" id="view-glossario" hidden><h2>O que significa</h2></section>
`;

describe("lendo o plano pastoral de um HTML", () => {
  const plano = lerPlanoDoHtml(PAGINA);

  it("pega o título e a abertura", () => {
    expect(plano.titulo).toBe("Plano pastoral");
    expect(plano.introducao).toBe("Por que a paróquia faz o que faz em 2026.");
  });

  it("um h2 com texto próprio vira seção", () => {
    const objetivo = plano.secoes.find((s) => s.titulo === "Nosso objetivo paroquial");
    expect(objetivo?.rotulo).toBeNull();
    expect(objetivo?.corpo).toContain("Caminhar juntos");
  });

  it("h3 e summary viram seções, com o h2 acima como tarja", () => {
    const prioridades = plano.secoes.find((s) => s.titulo === "Prioridades paroquiais");
    expect(prioridades?.rotulo).toBe("Assembleia Paroquial 2026");

    const comunhao = plano.secoes.find((s) => s.titulo === "1 · Comunhão");
    expect(comunhao?.rotulo).toBe("Os cinco eixos da Arquidiocese");
    expect(comunhao?.corpo).toBe("Ser uma Igreja que reconcilia.");
  });

  it("não deixa a seção de um bloco vazar para o próximo", () => {
    // O corte é feito nos títulos: "1 · Comunhão" não pode arrastar o texto
    // de "2 · Participação" junto.
    const comunhao = plano.secoes.find((s) => s.titulo === "1 · Comunhão");
    expect(comunhao?.corpo).not.toContain("sinodal");
  });

  it("deixa a palavra dos padres de fora — ela já é um recado no mural", () => {
    expect(plano.secoes.some((s) => /palavra dos padres/i.test(s.titulo))).toBe(false);
  });

  it("para no glossário", () => {
    expect(plano.secoes.some((s) => s.titulo === "O que significa")).toBe(false);
  });
});

describe("virando texto", () => {
  it("negrito que ABRE um bloco é título embutido, e ganha parágrafo próprio", () => {
    // Sem isto lia-se "MissãoPor isso as missas", com as duas coladas.
    const texto = comoTexto('<div><b>1. Grupos Bíblicos de Reflexão e Missão</b>Por isso as missas.</div>');
    expect(texto).toBe("1. Grupos Bíblicos de Reflexão e Missão\n\nPor isso as missas.");
  });

  it("negrito no MEIO de uma frase continua sendo ênfase", () => {
    // Quebrar aqui partiria a frase em duas.
    expect(comoTexto("<p>A missa é <b>toda sexta</b> às 19h30.</p>")).toBe(
      "A missa é toda sexta às 19h30.",
    );
  });

  it("item de lista vira marcador", () => {
    expect(comoTexto("<ol><li>Criar o COMIPA.</li><li>Rearticular.</li></ol>")).toBe(
      "• Criar o COMIPA.\n\n• Rearticular.",
    );
  });

  it("devolve as entidades ao que elas representam", () => {
    expect(comoTexto("<p>Fé &amp; vida &#39;26</p>")).toBe("Fé & vida '26");
  });
});
