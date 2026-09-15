import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, Search } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import {
  arvoreDoCatecismo,
  buscarNoCatecismo,
  caminhoDoParagrafo,
  enderecoDoParagrafo,
  enderecoDoTitulo,
  faixaDeParagrafos,
  numeroDaConsulta,
  type RamoDoIndice,
} from "@/lib/catecismo/busca";
import { ULTIMO_PARAGRAFO } from "@/lib/catecismo/endereco";
import { CATECISMO_ATIVO } from "@/lib/funcionalidades";
import { Card } from "@/components/ui/Card";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { INPUT_CLASSES } from "@/components/ui/FormField";

// Desligado, sem título próprio: a página de "não existe" herdava o
// "Catecismo" na aba do navegador. Assim a aba mostra o mesmo "Minha
// Paróquia" de qualquer endereço que não existe.
export const metadata: Metadata = CATECISMO_ATIVO ? { title: "Catecismo" } : {};

/**
 * O Catecismo da Igreja Católica: achar o parágrafo, e abrir no Vaticano.
 *
 * O texto não mora no app. Ele é da Libreria Editrice Vaticana e está, na
 * tradução oficial em português, em vatican.va — um capítulo por página.
 * O que o app acrescenta é o CAMINHO até ele, que é justamente o que o site
 * não dá no celular: quem ouve "Catecismo, parágrafo 1324" na homilia ou lê
 * no material da catequese escreve o número e cai no parágrafo; quem quer
 * saber o que a Igreja ensina sobre o batismo procura a palavra e acha o
 * artigo.
 *
 * A busca vai pelo endereço (formulário GET), como na Bíblia: dá para voltar
 * pelo histórico e mandar o link para alguém.
 */
export default async function CatecismoPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  // Oculto por `CATECISMO_ATIVO` (ver src/lib/funcionalidades.ts).
  if (!CATECISMO_ATIVO) notFound();
  await requireSessionForPage();
  const { busca } = await searchParams;
  const termo = (busca ?? "").trim().slice(0, 80);
  const numero = termo ? numeroDaConsulta(termo) : null;
  const resultado = termo && numero === null ? buscarNoCatecismo(termo) : null;
  const partes = arvoreDoCatecismo();

  return (
    <div className="flex flex-col lg:max-w-[44rem]">
      <PageHeader
        title="Catecismo"
        description="O que a Igreja crê, celebra, vive e reza, em 2.865 parágrafos numerados."
      />

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="busca"
          defaultValue={termo}
          placeholder="Número do parágrafo ou assunto…"
          aria-label="Procurar no Catecismo"
          enterKeyHint="search"
          className={`${INPUT_CLASSES} flex-1`}
        />
        <button
          type="submit"
          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-lg bg-primary text-white transition-opacity dark:bg-primary-light hover:opacity-90"
          aria-label="Procurar"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
      </form>
      {!termo && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Por exemplo: <span className="font-medium text-foreground">1324</span>, como aparece nas citações, ou{" "}
          <span className="font-medium text-foreground">batismo</span>.
        </p>
      )}

      {numero !== null && <ParagrafoAchado numero={numero} />}

      {resultado && (
        <section className="pt-5">
          <Eyebrow tone="accent" className="mb-3">
            {resultado.achados.length === 0
              ? "Nada encontrado"
              : resultado.truncado
                ? `Primeiros ${resultado.achados.length} resultados`
                : `${resultado.achados.length} ${resultado.achados.length === 1 ? "resultado" : "resultados"}`}
          </Eyebrow>

          {resultado.achados.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-muted">
              {/^\d+$/.test(termo)
                ? `O Catecismo vai do parágrafo 1 ao ${ULTIMO_PARAGRAFO}.`
                : `Nenhum título do Catecismo tem “${termo}”. A busca procura nos títulos das partes, capítulos e artigos — tente uma palavra só.`}
            </p>
          ) : (
            <Card className="px-3.5 py-1.5">
              {resultado.achados.map((achado) => (
                <a
                  key={`${achado.nivel}-${achado.inicio}-${achado.titulo}`}
                  href={enderecoDoTitulo(achado)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 border-b border-border px-1 py-3.5 transition-colors last:border-b-0 hover:bg-primary-tint"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-primary">
                      {faixaDeParagrafos(achado)}
                    </span>
                    <span className="mt-0.5 block font-serif text-[16px] leading-snug text-foreground">
                      {achado.titulo}
                    </span>
                    {achado.dentroDe && (
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                        em {achado.dentroDe.titulo}
                      </span>
                    )}
                  </span>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
                </a>
              ))}
            </Card>
          )}
          {resultado.truncado && (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Há mais títulos com essa palavra. Acrescente outra para chegar ao que procura.
            </p>
          )}
        </section>
      )}

      {/*
        O índice, para quem quer passear. Quatro partes fechadas: abertas,
        seriam duzentas linhas antes do fim da tela. Dentro, até o artigo —
        os subtítulos aparecem na busca.
      */}
      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          O índice
        </Eyebrow>
        <div className="flex flex-col gap-2.5">
          {partes.map((parte) =>
            parte.filhos.length === 0 ? (
              <a
                key={parte.inicio}
                href={enderecoDoTitulo(parte)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[64px] items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[18px] font-semibold leading-tight text-foreground">
                    {parte.titulo}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">{faixaDeParagrafos(parte)}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
              </a>
            ) : (
              <details key={parte.inicio} className="group rounded-lg border border-border bg-surface">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-eyebrow text-primary">
                      {parte.rotulo}
                    </span>
                    <span className="block font-serif text-[18px] font-semibold leading-tight text-foreground">
                      {parte.titulo}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">{faixaDeParagrafos(parte)}</span>
                  </span>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-border-strong transition-transform group-open:rotate-90"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </summary>
                <div className="border-t border-border px-4 pb-3 pt-1">
                  {parte.filhos.map((ramo) => (
                    <Ramo key={`${ramo.nivel}-${ramo.inicio}`} ramo={ramo} />
                  ))}
                </div>
              </details>
            ),
          )}
        </div>
      </section>

      <p className="pt-7 text-[13px] leading-relaxed text-muted">
        Texto oficial em português, no site do Vaticano (vatican.va), na tradução de Portugal — por isso
        “Baptismo” e “acto”. A busca entende as duas grafias. © Libreria Editrice Vaticana.
      </p>

      <div className="rule-gold my-7" />
    </div>
  );
}

/** O caminho de um número: da parte ao subtítulo, e o link para ler. */
function ParagrafoAchado({ numero }: { numero: number }) {
  const caminho = caminhoDoParagrafo(numero);
  const endereco = enderecoDoParagrafo(numero);

  return (
    <section className="pt-5">
      <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
        <Eyebrow className="mb-1">Onde fica</Eyebrow>
        <p className="font-serif text-[24px] font-semibold leading-tight text-foreground">Parágrafo {numero}</p>

        {/* Do maior para o menor, cada nível um pouco mais para dentro: é a
            pergunta "em que parte do livro estou?" respondida de uma vez. */}
        <ol className="mt-3 flex flex-col gap-2">
          {caminho
            .filter((t) => t.titulo !== "Resumindo")
            .map((t, i) => (
              <li key={`${t.nivel}-${t.inicio}`} style={{ paddingLeft: `${Math.min(i, 4) * 12}px` }}>
                {t.rotulo && !/^[IVX]+$/.test(t.rotulo) && (
                  <span className="block text-[11px] font-semibold uppercase tracking-eyebrow text-muted">
                    {t.rotulo}
                  </span>
                )}
                <span className="block text-[14.5px] leading-snug text-foreground">{t.titulo}</span>
              </li>
            ))}
        </ol>

        {endereco && (
          <a
            href={endereco}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-[14.5px] font-semibold text-white transition-opacity dark:bg-primary-light hover:opacity-90"
          >
            Ler no site do Vaticano
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          </a>
        )}
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
          Abre o capítulo inteiro, já no parágrafo {numero}.
        </p>
      </Card>
    </section>
  );
}

/** Seção, capítulo, artigo — cada nível com o seu peso de letra. */
function Ramo({ ramo }: { ramo: RamoDoIndice }) {
  if (ramo.nivel === "secao") {
    return (
      <div className="pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-primary">{ramo.rotulo}</p>
        <p className="text-[14.5px] font-medium leading-snug text-foreground">{ramo.titulo}</p>
        <div className="mt-1 border-l border-border pl-3">
          {ramo.filhos.map((filho) => (
            <Ramo key={`${filho.nivel}-${filho.inicio}`} ramo={filho} />
          ))}
        </div>
      </div>
    );
  }

  const ehCapitulo = ramo.nivel === "capitulo";
  return (
    <div className={ehCapitulo ? "pt-2" : ""}>
      {/* A faixa de parágrafos vai embaixo, e não numa coluna à direita:
          a coluna tirava um terço da largura e os títulos dos artigos
          quebravam em duas linhas no celular. */}
      <a
        href={enderecoDoTitulo(ramo)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 flex-col justify-center rounded-md py-1.5 transition-colors hover:text-primary"
      >
        <span
          className={
            ehCapitulo
              ? "text-[14px] font-medium leading-snug text-foreground"
              : "text-[14px] leading-snug text-foreground"
          }
        >
          {ramo.titulo}
        </span>
        <span className="text-[13px] tabular-nums text-muted">
          {ramo.rotulo ? `${ramo.rotulo} · ` : ""}
          {faixaDeParagrafos(ramo)}
        </span>
      </a>
      {ramo.filhos.length > 0 && (
        <div className="border-l border-border pl-3">
          {ramo.filhos.map((filho) => (
            <Ramo key={`${filho.nivel}-${filho.inicio}`} ramo={filho} />
          ))}
        </div>
      )}
    </div>
  );
}
