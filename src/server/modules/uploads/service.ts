import "server-only";
import { put } from "@vercel/blob";
import { ValidationError } from "@/server/shared/errors";

/**
 * Upload de imagem — o cartaz do evento, e o que mais vier depois.
 *
 * Guarda no Vercel Blob. Sem BLOB_READ_WRITE_TOKEN configurado o recurso
 * fica indisponível e a tela cai para "cole o link da imagem", que é como
 * funcionava antes — o app não quebra por falta de configuração.
 */

/** 5 MB. Foto de celular cabe; vídeo e PDF grande, não. */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/**
 * Só formatos que TODO navegador desenha. Nada de SVG: ele é um documento
 * XML que pode conter script, e serví-lo do nosso domínio o faria rodar
 * como se fosse nosso.
 */
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export function isUploadConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function extensaoDe(tipo: string): string {
  const mapa: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return mapa[tipo] ?? "bin";
}

/**
 * Envia a imagem e devolve a URL pública.
 *
 * O nome do arquivo é DESCARTADO: o que o navegador manda vem do dispositivo
 * de quem envia e não é confiável (caminho, extensão mentindo sobre o
 * conteúdo, caractere estranho). Geramos um nome novo a partir do tipo que
 * validamos, dentro de uma pasta por paróquia.
 */
export async function uploadImagem(
  parishId: string,
  arquivo: File,
  pasta: string,
): Promise<string> {
  if (!isUploadConfigured()) {
    throw new ValidationError("O envio de imagens ainda não está configurado nesta instalação.");
  }
  if (arquivo.size === 0) {
    throw new ValidationError("O arquivo chegou vazio. Tente escolher a imagem de novo.");
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new ValidationError("A imagem passa de 5 MB. Tire uma foto menor ou reduza antes de enviar.");
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ValidationError("Formato não aceito. Envie uma imagem JPG, PNG, WEBP, GIF ou AVIF.");
  }

  const nome = `${pasta}/${parishId}/${crypto.randomUUID()}.${extensaoDe(arquivo.type)}`;

  const { url } = await put(nome, arquivo, {
    access: "public",
    // O conteúdo é público de qualquer forma (vai numa <img> para os
    // fiéis); o nome aleatório é que evita adivinhar o de outra paróquia.
    addRandomSuffix: false,
    contentType: arquivo.type,
  });

  return url;
}
