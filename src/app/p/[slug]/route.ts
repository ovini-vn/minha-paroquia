import { NextResponse, type NextRequest } from "next/server";
import { withPlatformContext } from "@/server/db/tenant-context";
import { getSessionContext } from "@/server/auth/session";
import { COOKIE_DA_PAROQUIA_DE_ENTRADA } from "@/server/auth/paroquia-de-entrada";

/**
 * O link da paróquia: `/p/<paróquia>`.
 *
 * É o que vai no QR da porta da igreja, no folheto e no grupo da
 * comunidade. Quem entra por ele não precisa procurar a paróquia numa
 * lista: ela chega sugerida na hora de escolher, com a pessoa ainda
 * confirmando — entrar numa paróquia continua sendo um gesto dela.
 *
 * Público de propósito: o nome e a cidade da paróquia estão na placa da
 * igreja. O link não dá acesso a nada; só lembra de onde a pessoa veio.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paroquia = await withPlatformContext((tx) =>
    tx.parish.findUnique({ where: { slug }, select: { id: true } }),
  );
  if (!paroquia) return NextResponse.redirect(new URL("/", request.url));

  const session = await getSessionContext();
  const destino = !session ? "/cadastro" : session.membership ? "/escolher-paroquia?trocar=1" : "/escolher-paroquia";

  const resposta = NextResponse.redirect(new URL(destino, request.url));
  resposta.cookies.set(COOKIE_DA_PAROQUIA_DE_ENTRADA, paroquia.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // Uma semana: dá tempo de criar a conta hoje e escolher amanhã.
    maxAge: 7 * 24 * 60 * 60,
  });
  return resposta;
}
