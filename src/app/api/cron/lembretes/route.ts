import { NextResponse, type NextRequest } from "next/server";
import { sendCommitmentReminders } from "@/server/modules/reminders/service";
import { generateAllUpcomingOccurrences } from "@/server/modules/celebrations/service";
import { enviarResumoSemanal, ehDiaDoResumo } from "@/server/modules/digest/service";
import { limparEnviosAntigos } from "@/server/modules/notifications/service";
import { limparJanelasVencidas } from "@/server/auth/rate-limit";

/**
 * Job diário — disparado pelo cron da Vercel (ver vercel.json).
 *
 * Faz duas coisas, no mesmo job de propósito: o plano Hobby da Vercel
 * permite pouquíssimos crons, e as duas tarefas são diárias e baratas.
 *
 *   1. repõe o horizonte das missas que se repetem;
 *   2. avisa quem tem compromisso hoje ou amanhã;
 *   3. aos sábados, manda o resumo da semana para TODA a comunidade.
 *
 * O resumo entra aqui, e não num cron próprio, porque o plano Hobby da
 * Vercel permite pouquíssimos agendamentos — e "é sábado?" é uma linha.
 *
 * Nessa ordem, e a ordem importa: uma missa recém-gerada pode já ter
 * escala para amanhã, e o aviso precisa enxergá-la.
 *
 * REPETIÇÃO: a Vercel repete o job quando ele falha, e uma falha no meio
 * deixa parte do trabalho feito. Cada envio é carimbado num registro antes
 * de sair, na mesma transação — então repetir o job continua de onde parou
 * em vez de avisar tudo de novo.
 *
 * PROTEÇÃO: a Vercel envia `Authorization: Bearer $CRON_SECRET` quando a
 * variável existe. Sem o segredo configurado a rota recusa TUDO, em vez de
 * ficar aberta — uma rota que dispara notificação para a base inteira não
 * pode ficar exposta na internet por esquecimento de configuração.
 */
export const dynamic = "force-dynamic";
// Percorrer paróquia por paróquia leva mais que o padrão de 10s.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET não configurado — lembretes recusados.");
    return NextResponse.json({ error: "não configurado" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const agora = new Date();

  // Falhar a geração não pode impedir os lembretes: são independentes, e
  // silenciar o aviso de quem já se comprometeu é o pior dos dois males.
  let ocorrencias: { paroquias: number; criadas: number } | { erro: string };
  try {
    ocorrencias = await generateAllUpcomingOccurrences(agora);
  } catch (error) {
    console.error("Falha ao gerar ocorrências:", error);
    ocorrencias = { erro: error instanceof Error ? error.message : "desconhecido" };
  }

  const lembretes = await sendCommitmentReminders(agora);

  // Resumo semanal: só no dia certo, e isolado do resto pelo mesmo motivo
  // que a geração — uma falha aqui não pode calar os lembretes de quem já
  // se comprometeu.
  let resumo: unknown = "não é o dia";
  if (ehDiaDoResumo(agora)) {
    try {
      resumo = await enviarResumoSemanal(agora);
    } catch (error) {
      console.error("Falha no resumo semanal:", error);
      resumo = { erro: error instanceof Error ? error.message : "desconhecido" };
    }
  }

  // Poda do registro de envios. Por último e engolindo o erro: é faxina,
  // não pode derrubar um job que já entregou o que importava.
  try {
    await limparEnviosAntigos(agora);
    // Janela vencida não é mais consultada por ninguém: a linha só ocupa
    // espaço. Sem poda, a tabela cresce com uma linha por e-mail e por
    // endereço que já tentou entrar.
    await limparJanelasVencidas(agora);
  } catch (error) {
    console.error("Falha na limpeza diária:", error);
  }

  console.log("Job diário:", JSON.stringify({ ocorrencias, lembretes, resumo }));

  return NextResponse.json({ ok: true, ocorrencias, resumo, ...lembretes });
}
