import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";

export type Encontro = {
  id: string;
  startsAt: Date;
  label: string;
  location: string | null;
  /** Só eventos têm; celebração vem nula. */
  description: string | null;
  imageUrl: string | null;
};

/**
 * O que vai acontecer na paróquia — missas, celebrações e eventos.
 *
 * Componente único usado pela aba Agenda e pela Comunidade. Antes cada tela
 * montava a própria lista, e elas divergiram: só a da Comunidade exibia o
 * cartaz e a descrição do evento, então uma foto enviada pela secretaria
 * não aparecia justamente na tela chamada "Agenda".
 */
export function ProximosEncontros({ encontros }: { encontros: Encontro[] }) {
  if (encontros.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhum encontro agendado"
        description="Missas, celebrações e eventos da paróquia aparecem aqui."
      />
    );
  }

  return (
    <Card className="px-3.5 py-1.5">
      {encontros.map((item) => (
        <div key={item.id} className="border-b border-border py-3.5 last:border-b-0">
          <div className="flex items-center gap-3.5">
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
              <CalendarDays className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-medium text-foreground">{item.label}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {formatDateTime(item.startsAt)}
                {item.location ? ` · ${item.location}` : ""}
              </p>
            </div>
          </div>

          {/* Texto antes da imagem: quem usa leitor de tela, ou está sem rede
              para carregar figura, continua sabendo o que é e quando é. */}
          {item.description && (
            <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
              {item.description}
            </p>
          )}

          {/* <img> e não next/image: a imagem pode vir do nosso Blob ou de um
              link digitado pela secretaria, de qualquer host. Otimizar
              exigiria liberar remotePatterns para a internet inteira.
              alt vazio porque o título ao lado já diz o que é. */}
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              className="mt-2.5 w-full rounded-lg border border-border object-cover"
            />
          )}
        </div>
      ))}
    </Card>
  );
}
