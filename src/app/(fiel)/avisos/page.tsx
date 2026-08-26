import { Megaphone } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listPublishedAvisos } from "@/server/modules/avisos/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { LidoAoAbrir } from "@/components/domain/LidoAoAbrir";
import { formatDateTime } from "@/lib/date";

/**
 * Os avisos da paróquia, por inteiro.
 *
 * Não existia. O aviso aparecia como UMA linha no Início e cinco na
 * Comunidade, sempre cortado no meio — e a linha do Início apontava para o
 * próprio Início, então tocar nela não fazia nada. Quem recebia "neste
 * domingo a missa das 19h será às 18h" lia o começo e não tinha para onde
 * ir ver o resto.
 *
 * Aqui o texto vem completo, e o histórico junto: um aviso de duas semanas
 * atrás ainda responde "o que mesmo eles falaram sobre a festa?".
 */
export default async function AvisosPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar os avisos dela."
      />
    );
  }

  const avisos = await listPublishedAvisos(session.membership.parishId, 30);

  return (
    <div className="flex flex-col">
      {/* Chegar aqui É ter lido: não faz sentido pedir um segundo toque em
          outra tela para dizer que se leu o que se acabou de ler. */}
      <LidoAoAbrir caminho="/avisos" />

      <PageHeader
        title="Avisos"
        description="O que a paróquia comunicou, do mais recente para o mais antigo."
      />

      {avisos.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum aviso por enquanto"
          description="Quando a secretaria ou o pároco publicarem algo, aparece aqui — e você recebe uma notificação."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {avisos.map((aviso) => (
            <Card key={aviso.id}>
              <div className="flex items-start gap-3.5">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Megaphone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15.5px] font-semibold leading-snug text-foreground">
                    {aviso.title}
                  </h2>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.04em] text-muted">
                    {formatDateTime(aviso.createdAt)}
                  </p>
                </div>
              </div>
              {/* `whitespace-pre-line` e não texto rico: o aviso é digitado
                  com pressa, num campo simples, e as quebras de linha que a
                  pessoa deu são a única formatação que ela pediu. */}
              <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-foreground">
                {aviso.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
