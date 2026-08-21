import { NextResponse, type NextRequest } from "next/server";
import { sendCommitmentReminders } from "@/server/modules/reminders/service";

/**
 * Job diário de lembretes — disparado pelo cron da Vercel (ver vercel.json).
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

  const resultado = await sendCommitmentReminders(new Date());
  console.log("Lembretes do dia:", JSON.stringify(resultado));

  return NextResponse.json({ ok: true, ...resultado });
}
