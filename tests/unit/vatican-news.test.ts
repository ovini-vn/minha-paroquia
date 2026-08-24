import { afterEach, describe, expect, it, vi } from "vitest";
import { getPalavraDoDia } from "@/server/modules/liturgia/vatican-news-service";

/**
 * Esta é a única parte do app que depende de um servidor de terceiros no
 * caminho de renderizar uma página. O que importa aqui não é o caso feliz —
 * é o app NÃO cair quando o Vaticano estiver fora do ar, mudar o formato do
 * feed, ou devolver algo inesperado.
 */

const FEED_OK = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Palavra do dia</title>
  <item>
    <title>Evangelho e palavra do dia 24 agosto 2026</title>
    <guid>https://www.vaticannews.va/pt/palavra-do-dia/2026/08/24.html</guid>
    <enclosure url="https://media.vaticannews.va/media2/audio/s1/2026/08/24/139237737.mp3" type="audio/mp3" length="5204352"/>
    <itunes:duration>00:05:25</itunes:duration>
    <pubDate>Mon, 24 Aug 2026 00:00:00 +0200</pubDate>
    <description><![CDATA[<p>Texto integral das leituras que NÃO deve ser guardado.</p>]]></description>
  </item>
  <item>
    <title>Evangelho e palavra do dia 23 agosto 2026</title>
    <guid>https://www.vaticannews.va/pt/palavra-do-dia/2026/08/23.html</guid>
    <enclosure url="https://media.vaticannews.va/media2/audio/s1/2026/08/23/139237732.mp3" type="audio/mp3" length="5243136"/>
  </item>
</channel></rss>`;

function responderCom(body: string, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, text: async () => body })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("palavra do dia do Vatican News", () => {
  it("lê o item mais recente do feed", async () => {
    responderCom(FEED_OK);
    const p = await getPalavraDoDia();

    expect(p?.titulo).toBe("Evangelho e palavra do dia 24 agosto 2026");
    expect(p?.link).toBe("https://www.vaticannews.va/pt/palavra-do-dia/2026/08/24.html");
    expect(p?.audioUrl).toContain("media.vaticannews.va");
    expect(p?.duracao).toBe("00:05:25");
    expect(p?.publicadoEm?.toISOString()).toBe("2026-08-23T22:00:00.000Z");
  });

  it("NÃO guarda o texto das leituras", async () => {
    // O feed traz o texto integral e ele é do Dicastério para a Comunicação.
    // Se algum dia alguém acrescentar esse campo aqui, este teste falha.
    responderCom(FEED_OK);
    const p = await getPalavraDoDia();

    expect(JSON.stringify(p)).not.toContain("Texto integral");
    expect(Object.keys(p ?? {}).sort()).toEqual([
      "audioUrl",
      "duracao",
      "link",
      "publicadoEm",
      "titulo",
    ]);
  });

  it("devolve null quando o Vaticano responde erro", async () => {
    responderCom("", false);
    expect(await getPalavraDoDia()).toBeNull();
  });

  it("devolve null quando a rede cai, em vez de estourar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    // Se isto lançasse, a aba Oração inteira cairia junto.
    await expect(getPalavraDoDia()).resolves.toBeNull();
  });

  it("devolve null se o feed mudar de formato", async () => {
    responderCom("<rss><channel><title>sem itens</title></channel></rss>");
    expect(await getPalavraDoDia()).toBeNull();
  });

  it("recusa áudio hospedado fora do Vaticano", async () => {
    // O feed é conteúdo externo. Sem esta checagem, uma mudança lá — ou um
    // comprometimento — colocaria uma URL arbitrária dentro de uma tag
    // <audio> servida aos fiéis.
    responderCom(
      FEED_OK.replace(
        "https://media.vaticannews.va/media2/audio/s1/2026/08/24/139237737.mp3",
        "https://exemplo-malicioso.test/audio.mp3",
      ),
    );
    expect(await getPalavraDoDia()).toBeNull();
  });

  it("recusa link que não seja do site do Vaticano", async () => {
    responderCom(
      FEED_OK.replace(
        "https://www.vaticannews.va/pt/palavra-do-dia/2026/08/24.html",
        "https://exemplo-malicioso.test/pagina.html",
      ),
    );
    expect(await getPalavraDoDia()).toBeNull();
  });
});
