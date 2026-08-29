import "server-only";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Limite de tentativas por chave.
 *
 * Existe por uma razão específica deste projeto: a senha usa Argon2id com
 * `memoryCost 19456`, caro DE PROPÓSITO. Sem limite, cada tentativa consome
 * memória e CPU do servidor — o próprio mecanismo de segurança vira o vetor
 * de esgotamento. Por isso a checagem acontece ANTES do hash, e não depois.
 *
 * O contador vive no Postgres, e não em memória. Em serverless a memória não
 * sobrevive entre invocações nem é compartilhada entre instâncias: um
 * contador local daria a sensação de proteção sem a proteção.
 */

export type Resultado = { permitido: true } | { permitido: false; segundosParaTentar: number };

type Linha = { contagem: number; janela_expira: Date };

/**
 * Conta uma tentativa e diz se ela pode seguir.
 *
 * A instrução é ÚNICA e atômica. Ler-decidir-escrever em três passos deixaria
 * uma janela entre a leitura e a escrita — e é exatamente por essa janela que
 * várias tentativas simultâneas passariam, que é o caso que importa conter.
 */
export async function consumirTentativa(
  chave: string,
  limite: number,
  janelaMs: number,
): Promise<Resultado> {
  const agora = new Date();
  const expira = new Date(agora.getTime() + janelaMs);

  let linhas: Linha[];
  try {
    linhas = await prisma.$queryRaw<Linha[]>`
    INSERT INTO rate_limits (chave, contagem, janela_expira)
    VALUES (${chave}, 1, ${expira})
    ON CONFLICT (chave) DO UPDATE SET
      contagem = CASE
        WHEN rate_limits.janela_expira < ${agora} THEN 1
        ELSE rate_limits.contagem + 1
      END,
      janela_expira = CASE
        WHEN rate_limits.janela_expira < ${agora} THEN ${expira}
        ELSE rate_limits.janela_expira
      END
      RETURNING contagem, janela_expira
    `;
  } catch (erro) {
    /*
     * O limitador FALHA ABERTO, e isso é decisão consciente.
     *
     * Se a tabela ainda não existe — código no ar antes da migration — ou o
     * banco engasga, a alternativa seria derrubar o login inteiro. Um
     * limitador quebrado não pode custar mais que o ataque que ele previne:
     * ninguém entrar é pior que a proteção ficar ausente por alguns minutos.
     *
     * O erro vai para o log em voz alta, porque proteção ausente em silêncio
     * é o pior dos dois mundos.
     */
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2021") {
      console.error("rate_limits não existe neste banco — rode a migration. Limite DESLIGADO.");
    } else {
      console.error("Falha ao consultar o limite de tentativas. Limite DESLIGADO nesta chamada:", erro);
    }
    return { permitido: true };
  }

  const linha = linhas[0];
  if (!linha) return { permitido: true };

  if (linha.contagem <= limite) return { permitido: true };

  const segundos = Math.max(1, Math.ceil((linha.janela_expira.getTime() - agora.getTime()) / 1000));
  return { permitido: false, segundosParaTentar: segundos };
}

/**
 * Apaga a contagem de uma chave. Chamado no LOGIN BEM-SUCEDIDO.
 *
 * Sem isto, quem erra a senha três vezes e acerta na quarta continua com o
 * contador cheio, e é barrado numa próxima sessão legítima horas depois. O
 * limite existe para conter tentativa às cegas, não para punir quem lembrou.
 */
export async function limparTentativas(chave: string): Promise<void> {
  // Mesmo racional do `consumirTentativa`: limpar contador não pode impedir
  // alguém de entrar com a senha certa.
  try {
    await prisma.rateLimit.deleteMany({ where: { chave } });
  } catch (erro) {
    console.error("Falha ao zerar o contador de tentativas:", erro);
  }
}

/**
 * O endereço de quem está chamando, atrás do proxy da Vercel.
 *
 * `x-forwarded-for` é uma lista quando há vários saltos; o primeiro item é o
 * cliente. Devolve null quando não há cabeçalho — e quem chama trata isso
 * como "não dá para limitar por endereço", em vez de agrupar todo mundo numa
 * chave só, que barraria usuários legítimos em bloco.
 */
export async function enderecoDeQuemChama(): Promise<string | null> {
  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]?.trim() || null;
  return cabecalhos.get("x-real-ip");
}

/** Apaga janelas vencidas. Chamado pelo robô diário. */
export async function limparJanelasVencidas(agora: Date): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { janelaExpira: { lt: agora } },
  });
  return count;
}

/**
 * Quanto tempo esperar, dito de um jeito que não obriga a ler segundos.
 */
export function textoDeEspera(segundos: number): string {
  if (segundos <= 60) return "um minuto";
  const minutos = Math.ceil(segundos / 60);
  return `${minutos} minutos`;
}
