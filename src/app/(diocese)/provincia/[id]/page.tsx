import Link from "next/link";
import { notFound } from "next/navigation";
import { Landmark, Crown } from "lucide-react";
import { requireProvinceAccessForPage } from "@/server/auth/guards";
import {
  getProvince,
  listDiocesesInProvince,
  listProvinceMembers,
} from "@/server/modules/provinces/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { PROVINCE_ROLE_LABELS } from "@/lib/province-labels";

export default async function ProvinceOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProvinceAccessForPage(id);

  const [province, dioceses, members] = await Promise.all([
    getProvince(id),
    listDiocesesInProvince(id),
    listProvinceMembers(id),
  ]);
  if (!province) notFound();

  const totalParishes = dioceses.reduce((sum, d) => sum + d._count.parishes, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={province.name}
        description="Província eclesiástica — a arquidiocese e suas dioceses sufragâneas."
      />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Dioceses" value={dioceses.length} />
        <Stat label="Paróquias" value={totalParishes} />
      </div>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Dioceses
        </Eyebrow>
        {dioceses.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Nenhuma diocese vinculada"
            description="Vincule dioceses a esta província na administração da plataforma."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {dioceses.map((diocese) => (
              <Link
                key={diocese.id}
                href={`/diocese/${diocese.id}`}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 transition-colors last:border-b-0 hover:bg-primary-tint"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  {diocese.isArchdiocese ? (
                    <Crown className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Landmark className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium text-foreground">
                    {diocese.name}
                    {diocese.isArchdiocese && <Badge tone="gold">Sede metropolitana</Badge>}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {diocese._count.parishes}{" "}
                    {diocese._count.parishes === 1 ? "paróquia" : "paróquias"}
                    {diocese.state ? ` · ${diocese.state}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Quem acompanha a província
        </Eyebrow>
        {members.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="Ninguém vinculado ainda"
            description="Vincule o arcebispo metropolita na administração da plataforma."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <Avatar name={member.user.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {member.user.fullName}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{member.user.email}</p>
                </div>
                <Badge>{PROVINCE_ROLE_LABELS[member.role]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Cada diocese é governada pelo seu próprio bispo. Esta visão é de acompanhamento: mostra o
        conjunto, não dá acesso aos dados pessoais das paróquias.
      </p>
    </div>
  );
}
