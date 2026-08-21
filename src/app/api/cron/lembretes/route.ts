import { NextResponse, type NextRequest } from "next/server";
import { sendCommitmentReminders } from "@/server/modules/reminders/service";
import { generateAllUpcomingOccurrences } from "@/server/modules/celebrations/service";

/**
 * Job diário — disparado pelo cron da Vercel (ver vercel.json).
 *
 * Faz duas coisas, no mesmo job de propósito: o plano Hobby da Vercel
 * permite pouquíssimos crons, e as duas tarefas são diárias e baratas.
 *
 *   1. repõe o horizonte das missas que se repetem;
 *   2. avisa quem tem compromisso hoje ou amanhã.
 *
 * Nessa ordem, e a ordem importa: uma missa recém-gerada pode já ter
 * escala para amanhã, e o aviso precisa enxergá-la.
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
  console.log("Job diário:", JSON.stringify({ ocorrencias, lembretes }));

  return NextResponse.json({ ok: true, ocorrencias, ...lembretes });
}
