import { afterEach, describe, expect, it, vi } from "vitest";
import { isUploadConfigured, uploadImagem } from "@/server/modules/uploads/service";

// O envio real é mockado: o que interessa aqui é o app NÃO cair quando o
// serviço de arquivos recusa.
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async () => {
    throw new Error("Vercel Blob: Access denied, please provide a valid token for this resource.");
  }),
}));

/**
 * O que importa aqui é RECUSAR direito. O caminho feliz depende do Vercel
 * Blob e é verificado no navegador; estas são as portas que impedem alguém
 * de usar o upload da paróquia como hospedagem de arquivo qualquer.
 */
function arquivo(tipo: string, bytes: number, nome = "cartaz"): File {
  return new File([new Uint8Array(bytes)], nome, { type: tipo });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("upload de imagem", () => {
  it("fica indisponível sem credencial nenhuma, em vez de estourar", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    expect(isUploadConfigured()).toBe(false);
  });

  it("store conectado basta — o OIDC é resolvido pela biblioteca", () => {
    // Não exigimos VERCEL_OIDC_TOKEN no ambiente: a biblioteca obtém o
    // token OIDC do runtime da Vercel por conta própria. Exigir a variável
    // escondia o recurso de quem tinha o store configurado e funcionando.
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "store_abc123");
    expect(isUploadConfigured()).toBe(true);
  });

  it("recusa upload quando não está configurado", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    await expect(uploadImagem("p1", arquivo("image/png", 10), "eventos")).rejects.toThrow(
      /não está disponível/i,
    );
  });

  it("recusa arquivo acima de 5 MB", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    vi.stubEnv("BLOB_STORE_ID", "");
    await expect(
      uploadImagem("p1", arquivo("image/jpeg", 5 * 1024 * 1024 + 1), "eventos"),
    ).rejects.toThrow(/5 MB/);
  });

  it("recusa SVG, que pode conter script", async () => {
    // Servido do nosso domínio, um SVG com script rodaria como se fosse
    // nosso — com a sessão do fiel junto.
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    vi.stubEnv("BLOB_STORE_ID", "");
    await expect(uploadImagem("p1", arquivo("image/svg+xml", 100), "eventos")).rejects.toThrow(
      /Formato não aceito/i,
    );
  });

  it("recusa PDF e outros que não são imagem", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    vi.stubEnv("BLOB_STORE_ID", "");
    await expect(uploadImagem("p1", arquivo("application/pdf", 100), "eventos")).rejects.toThrow(
      /Formato não aceito/i,
    );
  });

  it("recusa arquivo vazio", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    vi.stubEnv("BLOB_STORE_ID", "");
    await expect(uploadImagem("p1", arquivo("image/png", 0), "eventos")).rejects.toThrow(/vazio/i);
  });

  it("credencial recusada vira mensagem, não tela branca", async () => {
    // Regressão: o erro da biblioteca subia até o topo e derrubava a
    // página com "Application error". A pessoa perdia o formulário
    // preenchido e não ficava sabendo o motivo.
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-invalido");
    vi.stubEnv("BLOB_STORE_ID", "");

    await expect(uploadImagem("p1", arquivo("image/png", 100), "eventos")).rejects.toThrow(
      /recusou a credencial/i,
    );
  });
});
