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
 * Como autenticar no store de cartazes.
 *
 * O projeto tem DOIS Blob stores conectados: o antigo (privado, nomes
 * BLOB_*) e o nosso (público, em São Paulo, sob o prefixo CARTAZES_ que a
 * Vercel exige ao conectar um segundo). Cartaz precisa abrir no navegador
 * de qualquer fiel, sem login e sem expirar — por isso público.
 *
 * Conectar um store cria STORE_ID mas NÃO cria token de escrita. A saída é
 * o OIDC: a biblioteca obtém o token do runtime da Vercel sozinha, e só
 * precisa saber QUAL store usar. Sem passar o storeId, ela leria
 * BLOB_STORE_ID e acabaria no store privado — que recusa access "public".
 *
 * A ordem tenta token explícito primeiro porque, existindo, é mais direto e
 * funciona também fora da Vercel.
 */
function credenciaisDoBlob(): { token?: string; storeId?: string } | null {
  if (process.env.CARTAZES_READ_WRITE_TOKEN) {
    return { token: process.env.CARTAZES_READ_WRITE_TOKEN };
  }
  if (process.env.CARTAZES_STORE_ID) {
    return { storeId: process.env.CARTAZES_STORE_ID };
  }
  // Instalação com um store só, usando os nomes padrão.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { token: process.env.BLOB_READ_WRITE_TOKEN };
  }
  return null;
}

export function isUploadConfigured(): boolean {
  return credenciaisDoBlob() !== null;
}

/** Diz o que falta, para a tela orientar. Só nomes, nunca valores. */
export function diagnosticoDoUpload(): string {
  if (process.env.CARTAZES_READ_WRITE_TOKEN) return "pronto (token)";
  if (process.env.CARTAZES_STORE_ID) return "pronto (OIDC)";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "pronto (store padrão)";
  return "nenhum store de imagens conectado ao projeto";
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
    throw new ValidationError("O envio de imagens ainda não está disponível.");
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
      // token OU storeId, nunca os nomes padrão: sozinha, a biblioteca
      // acharia o store ANTIGO — privado, e que recusa access "public".
      ...credenciaisDoBlob(),
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
        "O serviço de arquivos recusou a credencial. Verifique a conexão do store de imagens no painel.",
      );
    }
    throw new ValidationError(
      "Não foi possível enviar a imagem agora. Tente de novo, ou use o link da imagem.",
    );
  }
}
