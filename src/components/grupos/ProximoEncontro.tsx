import { Clock, Mic } from "lucide-react";
import { Eyebrow } from "@/components/ui/Typography";
import { quandoPerto } from "@/lib/grupos/cronograma";
import { iconeDeEncontro } from "@/lib/grupos/icones";
import type { EncontroVisto } from "@/server/modules/grupos/service";

/**
 * O próximo encontro de um grupo, em destaque.
 *
 * O mesmo cartão na página do grupo e no Início de quem faz parte dele:
 * quem reconhece o desenho num lugar reconhece no outro.
 *
 * O horário e o local do grupo ("Domingos, às 17h · Centro Pastoral") só
 * aparecem na formação de sempre. No encontro em destaque — o seminário de
 * sábado, o retiro na casa de encontro — eles seriam uma informação errada
 * dita com segurança, e o complemento é quem diz onde e como.
 */
export function ProximoEncontro({
  encontro,
  hoje,
  meetsWhen,
  meetsWhere,
}: {
  encontro: EncontroVisto;
  hoje: string;
  meetsWhen: string | null;
  meetsWhere: string | null;
}) {
  const Icone = encontro.destaque ? iconeDeEncontro(encontro.icone) : null;
  const quandoEOnde = encontro.destaque ? null : [meetsWhen, meetsWhere].filter(Boolean).join(" · ");
  const dia = quandoPerto(encontro, hoje);

  return (
    <div className="rounded-lg border border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent p-[18px]">
      <Eyebrow className="text-[#8a6b24] dark:text-gold">Próximo encontro</Eyebrow>
      <p className="mt-2 font-serif text-[23px] font-semibold leading-tight text-foreground first-letter:uppercase">
        {dia}
      </p>
      {quandoEOnde && (
        <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
          <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden />
          {quandoEOnde}
        </p>
      )}

      <div className="mt-3.5 flex items-start gap-3">
        {Icone && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-white dark:bg-primary-light">
            <Icone className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[16.5px] font-semibold leading-snug text-foreground">{encontro.tema}</p>
          {encontro.complemento && <p className="mt-0.5 text-[13.5px] text-muted">{encontro.complemento}</p>}
        </div>
      </div>

      {encontro.pregador && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-gold/30 pt-3 text-[14px] text-foreground">
          <Mic className="h-4 w-4 shrink-0 text-[#8a6b24] dark:text-gold" strokeWidth={1.6} aria-hidden />
          <span>
            <span className="text-muted">Prega:</span> {encontro.pregador}
          </span>
        </p>
      )}
    </div>
  );
}
