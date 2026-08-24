import { ExternalLink, Headphones, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LeiturasDoDia } from "./LeiturasDoDia";
import { Eyebrow } from "@/components/ui/Typography";
import type { PalavraDoDia } from "@/server/modules/liturgia/vatican-news-service";
import { SANTO_DO_DIA_URL } from "@/server/modules/liturgia/vatican-news-service";

/** "00:05:25" -> "5 min". */
function duracaoCurta(duracao: string | null): string | null {
  if (!duracao) return null;
  const partes = duracao.split(":").map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
  const minutos = partes[0]! * 60 + partes[1]! + (partes[2]! >= 30 ? 1 : 0);
  return minutos > 0 ? `${minutos} min` : null;
}

/**
 * Evangelho do dia em áudio e o santo do dia, do Vatican News.
 *
 * Só título, áudio e link — o texto das leituras NÃO é copiado para cá:
 * é conteúdo do Dicastério para a Comunicação e não temos os direitos.
 * O crédito é explícito, e os links levam à fonte.
 *
 * O áudio pesa mais que o texto para quem tem dificuldade de leitura, que
 * é boa parte de quem frequenta a paróquia.
 */
export function PalavraDoDiaCard({
  palavra,
  variante = "completo",
}: {
  palavra: PalavraDoDia | null;
  /**
   * "compacto" é a versão do Início: só o áudio, sem o santo do dia e sem
   * o cartão em volta. É o gancho diário; a versão completa mora na aba
   * Oração, que é o destino.
   */
  variante?: "completo" | "compacto";
}) {
  if (variante === "compacto") {
    if (!palavra) return null; // No Início, um erro de rede não vira ruído.

    return (
      <div className="rounded-lg border border-border bg-surface p-3.5">
        <p className="flex items-center gap-2 text-[14.5px] font-medium leading-snug text-foreground">
          <Headphones className="h-[17px] w-[17px] shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
          Evangelho de hoje
          {duracaoCurta(palavra.duracao) && (
            <span className="font-normal text-muted">· {duracaoCurta(palavra.duracao)}</span>
          )}
        </p>
        <audio
          controls
          preload="none"
          src={palavra.audioUrl}
          className="mt-2.5 w-full"
          aria-label="Evangelho de hoje, em áudio"
        >
          Seu navegador não reproduz áudio.
        </audio>
        <LeiturasDoDia leituras={palavra.leituras} />

        {/* O crédito acompanha o conteúdo em qualquer lugar onde ele apareça. */}
        <p className="mt-2 text-[11px] text-muted">Vatican News · Dicastério para a Comunicação</p>
      </div>
    );
  }

  return (
    <Card>
      <Eyebrow tone="accent" className="mb-3">
        Da Igreja, hoje
      </Eyebrow>

      {palavra ? (
        <div className="mb-4">
          <p className="flex items-start gap-2 text-[14.5px] font-medium leading-snug text-foreground">
            <Headphones className="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
            <span>
              Evangelho e palavra do dia
              {duracaoCurta(palavra.duracao) && (
                <span className="font-normal text-muted"> · {duracaoCurta(palavra.duracao)}</span>
              )}
            </span>
          </p>

          {/* Player nativo: o arquivo é servido pelo próprio Vaticano, não
              reempacotado aqui. */}
          <audio
            controls
            preload="none"
            src={palavra.audioUrl}
            className="mt-2.5 w-full"
            aria-label="Evangelho e palavra do dia, em áudio"
          >
            Seu navegador não reproduz áudio.
          </audio>

          <LeiturasDoDia leituras={palavra.leituras} />

          <a
            href={palavra.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-primary"
          >
            Abrir no site do Vatican News
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          </a>
        </div>
      ) : (
        <p className="mb-4 text-[13px] leading-relaxed text-muted">
          A palavra do dia não pôde ser carregada agora. Tente mais tarde.
        </p>
      )}

      <a
        href={SANTO_DO_DIA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 border-t border-border pt-3 transition-colors hover:text-primary"
      >
        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-medium text-foreground">Santo do dia</span>
          <span className="mt-0.5 block text-[12.5px] text-muted">A vida de quem a Igreja celebra hoje</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
      </a>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Conteúdo do Vatican News — Dicastério para a Comunicação. Os links abrem o site oficial.
      </p>
    </Card>
  );
}
