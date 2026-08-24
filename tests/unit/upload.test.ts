import { afterEach, describe, expect, it, vi } from "vitest";
import { isUploadConfigured, uploadImagem } from "@/server/modules/uploads/service";

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
  it("fica indisponível sem o token, em vez de estourar", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(isUploadConfigured()).toBe(false);
  });

  it("recusa upload quando não está configurado", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    await expect(uploadImagem("p1", arquivo("image/png", 10), "eventos")).rejects.toThrow(
      /não está configurado/i,
    );
  });

  it("recusa arquivo acima de 5 MB", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    await expect(
      uploadImagem("p1", arquivo("image/jpeg", 5 * 1024 * 1024 + 1), "eventos"),
    ).rejects.toThrow(/5 MB/);
  });

  it("recusa SVG, que pode conter script", async () => {
    // Servido do nosso domínio, um SVG com script rodaria como se fosse
    // nosso — com a sessão do fiel junto.
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    await expect(uploadImagem("p1", arquivo("image/svg+xml", 100), "eventos")).rejects.toThrow(
      /Formato não aceito/i,
    );
  });

  it("recusa PDF e outros que não são imagem", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    await expect(uploadImagem("p1", arquivo("application/pdf", 100), "eventos")).rejects.toThrow(
      /Formato não aceito/i,
    );
  });

  it("recusa arquivo vazio", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-de-teste");
    await expect(uploadImagem("p1", arquivo("image/png", 0), "eventos")).rejects.toThrow(/vazio/i);
  });
});
