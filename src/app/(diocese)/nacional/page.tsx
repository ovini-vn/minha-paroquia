import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Church, Flag } from "lucide-react";
import { requireNationalScopeForPage } from "@/server/auth/guards";
import { listProvinces } from "@/server/modules/provinces/service";
import { listDioceses } from "@/server/modules/dioceses/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { NATIONAL_ROLE_LABELS } from "@/lib/province-labels";

/** Visão nacional (CNBB): províncias e dioceses do país. */
export const metadata: Metadata = { title: "Visão nacional" };

export default async function NacionalPage() {
  const session = await requireNationalScopeForPage();

  const [provinces, dioceses] = await Promise.all([listProvinces(), listDioceses()]);
  const semProvincia = dioceses.filter((d) => d.provinceId === null);
  const totalParoquias = dioceses.reduce((sum, d) => sum + d._count.parishes, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visão nacional"
        description="Províncias eclesiásticas e dioceses cadastradas no país."
      />

      {session.national && (
        <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
              <Flag className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            </span>
            <div>
              <Eyebrow className="text-[#8a6b24] dark:text-gold">Seu acesso</Eyebrow>
              <p className="mt-0.5 text-[14.5px] font-medium text-foreground">
                {NATIONAL_ROLE_LABELS[session.national.role]}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Províncias" value={provinces.length} />
        <Stat label="Dioceses" value={dioceses.length} />
        <Stat label="Paróquias" value={totalParoquias} />
      </div>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Províncias eclesiásticas
        </Eyebrow>
        {provinces.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Nenhuma província cadastrada"
            description="Províncias são cadastradas na administração da plataforma."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {provinces.map((province) => (
              <Link
                key={province.id}
                href={`/provincia/${province.id}`}
                className="flex items-center gap-3.5 border-b border-border py-3.5 transition-colors last:border-b-0 hover:bg-primary-tint"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Landmark className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{province.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {province._count.dioceses}{" "}
                    {province._count.dioceses === 1 ? "diocese" : "dioceses"}
                  </p>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {semProvincia.length > 0 && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Dioceses sem província
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {semProvincia.map((diocese) => (
              <Link
                key={diocese.id}
                href={`/diocese/${diocese.id}`}
                className="flex items-center gap-3.5 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-primary-tint"
              >
                <Church className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
                <p className="min-w-0 flex-1 text-[14px] text-foreground">{diocese.name}</p>
                <Badge tone="muted">{diocese._count.parishes}</Badge>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Esta visão mostra a estrutura e os números do conjunto. Os dados pessoais de cada paróquia
        continuam isolados na paróquia de origem, em qualquer nível da hierarquia.
      </p>
    </div>
  );
}
