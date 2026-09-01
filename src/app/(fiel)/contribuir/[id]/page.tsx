import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSessionForPage } from "@/server/auth/guards";
import { obterPix } from "@/server/modules/contribuicao/service";
import { nomeDaFinalidade } from "@/server/modules/contribuicao/schema";
import { AppError } from "@/server/shared/errors";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { Leitura } from "@/components/layout/DuasColunas";
import { emReais } from "../page";

export const metadata: Metadata = { title: "Seu código PIX" };

/**
 * O código pronto, para copiar e colar no banco.
 *
 * Sem QR nesta versão, e a razão é o aparelho: quem gera está no celular e
 * vai colar no aplicativo do próprio banco — ninguém escaneia a própria
 * tela. O QR ganha sentido quando a paróquia imprimir um código para a mesa
 * da festa, e aí ele vem com o caso que o justifica.
 *
 * Não aparece nesta tela: identificador, txid, "conciliação". São conceitos
 * de quem administra. Para quem contribui, a única pergunta é se já pode
 * fechar o aplicativo — e a resposta está escrita.
 */
export default async function PixDeContribuicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSessionForPage();
  if (!session.membership) return null;

  let pix;
  try {
    pix = await obterPix(session.membership.parishId, id, session.userId);
  } catch (erro) {
    if (erro instanceof AppError) notFound();
    throw erro;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Seu código PIX" description="Copie e cole no aplicativo do seu banco." />

      <Leitura className="flex flex-col gap-4">
        <Card>
          <Eyebrow tone="accent" className="mb-1">
            {nomeDaFinalidade(pix.finalidade)}
          </Eyebrow>
          <p className="font-serif text-[26px] font-semibold leading-tight text-foreground">
            {pix.centavos ? emReais(pix.centavos) : "Valor a sua escolha"}
          </p>
          {!pix.centavos && (
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              O aplicativo do seu banco vai perguntar quanto você quer contribuir.
            </p>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-muted">
              PIX Copia e Cola
            </p>
            <p className="mt-2 max-h-28 overflow-y-auto break-all rounded-lg border border-border bg-sunken p-3 font-mono text-[11.5px] leading-relaxed text-muted">
              {pix.brcode}
            </p>
            <BotaoCopiar
              valor={pix.brcode}
              rotulo="Copiar código PIX"
              rotuloCopiado="Código copiado!"
              className="mt-3"
            />
          </div>
        </Card>

        <Card className="bg-sunken">
          <p className="text-[13.5px] leading-relaxed text-foreground">
            Depois de pagar, <strong>você não precisa enviar comprovante</strong>. A contribuição
            aparece em Minha participação quando a paróquia a registrar.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            O dinheiro vai direto para a conta da paróquia — o aplicativo não recebe nem guarda
            valor nenhum.
          </p>
        </Card>

        <LinkButton href="/contribuir" variant="ghost" size="sm">
          Voltar para Minha participação
        </LinkButton>
      </Leitura>
    </div>
  );
}
