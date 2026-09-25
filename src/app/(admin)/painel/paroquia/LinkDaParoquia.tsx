import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Typography";
import { BotaoCopiar } from "./BotaoCopiar";

/**
 * O link e o QR da paróquia, para a porta da igreja, o folheto e o grupo da
 * comunidade. Quem entra por ele já encontra a paróquia marcada na hora de
 * escolher (ver `app/p/[slug]/route.ts`).
 *
 * O QR é desenhado aqui, no servidor, a partir do próprio endereço: nenhum
 * serviço de fora vê quem a paróquia está convidando.
 */
export async function LinkDaParoquia({ endereco }: { endereco: string }) {
  const svg = await QRCode.toString(endereco, { type: "svg", margin: 1, color: { dark: "#1c1917", light: "#ffffff" } });

  return (
    <Card id="link-da-paroquia" className="scroll-mt-24">
      <Eyebrow tone="accent" className="mb-2">
        Link da paróquia
      </Eyebrow>
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
        Divulgue na missa, no folheto e no grupo da comunidade. Quem entra por ele cria a conta e já encontra esta
        paróquia marcada — sem procurar numa lista.
      </p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Fundo branco sempre: leitor de QR precisa de contraste e margem clara. */}
        <div
          className="w-44 shrink-0 rounded-lg bg-white p-2.5 shadow-sm"
          role="img"
          aria-label={`QR Code para ${endereco}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex min-w-0 flex-col gap-2.5">
          <p className="break-all font-mono text-[14px] text-foreground">{endereco}</p>
          <BotaoCopiar texto={endereco} />
          <p className="text-[12.5px] text-muted">
            Para imprimir o QR, use a impressão do navegador nesta página.
          </p>
        </div>
      </div>
    </Card>
  );
}
