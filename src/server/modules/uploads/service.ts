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

/**
 * Duas formas de autenticar, porque a Vercel mudou o padrão.
 *
 * O jeito clássico é BLOB_READ_WRITE_TOKEN. O jeito novo é OIDC: a Vercel
 * injeta VERCEL_OIDC_TOKEN em tempo de execução e o store aparece como
 * BLOB_STORE_ID. Criar um Blob store hoje configura o SEGUNDO — e o
 * primeiro nem sempre existe.
 *
 * A biblioteca lê BLOB_READ_WRITE_TOKEN e BLOB_STORE_ID do ambiente
 * sozinha, mas NÃO lê o token OIDC: ele precisa ser passado na chamada.
 */
function credenciais(): { token?: string; oidcToken?: string } | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { token: process.env.BLOB_READ_WRITE_TOKEN };
  }
  if (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN) {
    return { oidcToken: process.env.VERCEL_OIDC_TOKEN };
  }
  return null;
}

export function isUploadConfigured(): boolean {
  return credenciais() !== null;
}

/**
 * Diz QUAL credencial falta, para a tela poder orientar em vez de só
 * informar que não dá.
 *
 * Só o nome das variáveis presentes ou ausentes — nunca o valor delas.
 */
export function diagnosticoDoUpload(): string {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "pronto (token)";
  if (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN) return "pronto (OIDC)";
  if (process.env.BLOB_STORE_ID) {
    return "store conectado, mas sem token: gere um BLOB_READ_WRITE_TOKEN no painel do Blob";
  }
  return "nenhum Blob store conectado ao projeto";
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
  const auth = credenciais();
  if (!auth) {
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

  try {
    const { url } = await put(nome, arquivo, {
      ...auth,
      access: "public",
      // O conteúdo é público de qualquer forma (vai numa <img> para os
      // fiéis); o nome aleatório é que evita adivinhar o de outra paróquia.
      addRandomSuffix: false,
      contentType: arquivo.type,
    });

    return url;
  } catch (error) {
    // Falha do serviço de arquivos NÃO pode derrubar a página. Antes, o
    // erro da biblioteca subia até o topo e virava tela branca com
    // "Application error" — a pessoa perdia o formulário preenchido e não
    // ficava sabendo o que houve.
    console.error("Falha ao enviar imagem para o Blob:", error);

    const mensagem = error instanceof Error ? error.message : "";
    if (/access denied|valid token|unauthorized/i.test(mensagem)) {
      throw new ValidationError(
        "O serviço de arquivos recusou a credencial. Verifique se o BLOB_READ_WRITE_TOKEN foi copiado inteiro, sem aspas, e se não foi revogado.",
      );
    }
    throw new ValidationError(
      "Não foi possível enviar a imagem agora. Tente de novo, ou use o link da imagem.",
    );
  }
}
