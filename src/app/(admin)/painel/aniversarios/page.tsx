import { Cake, Droplets, Sparkles, Heart, Church, CalendarHeart } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listarAniversarios } from "@/server/modules/aniversarios/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import {
  NOME_DO_ANIVERSARIO,
  rotuloDeProximidade,
  type TipoDeAniversario,
} from "@/lib/aniversarios";
import { formatDateOnly } from "@/lib/date";

const ICONE: Record<TipoDeAniversario, typeof Cake> = {
  nascimento: Cake,
  batismo: Droplets,
  primeira_eucaristia: Church,
  crisma: Sparkles,
  matrimonio: Heart,
  outro: CalendarHeart,
};

/**
 * Quem faz aniversário nos próximos trinta dias.
 *
 * Aniversário de vida vem destacado porque é o que a paróquia lembra em voz
 * alta: na missa, no grupo, num telefonema. Os sacramentos aparecem junto —
 * dez anos de casamento e vinte e cinco de batismo também são data de
 * comunidade, e ninguém tinha onde vê-las.
 *
 * A lista sai do que os próprios fiéis registraram na Caminhada e no
 * perfil. Quem não preencheu não aparece: nada aqui é inventado a partir de
 * outro dado.
 */
export default async function AniversariosPage() {
  const session = await requirePermissionForPage(PERMISSIONS.MEMBERS_VIEW);
  if (!session.membership) return null;

  const aniversarios = await listarAniversarios(session.membership.parishId, new Date(), 30);
  const deVida = aniversarios.filter((a) => a.tipo === "nascimento");
  const sacramentais = aniversarios.filter((a) => a.tipo !== "nascimento");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aniversários"
        description="O que a comunidade celebra nos próximos 30 dias, a partir do que cada um registrou."
      />

      {aniversarios.length === 0 ? (
        <EmptyState
          icon={Cake}
          title="Nenhuma data nos próximos 30 dias"
          description="As datas vêm do perfil de cada fiel e dos sacramentos registrados na Caminhada. Conforme as pessoas preenchem, elas aparecem aqui."
        />
      ) : (
        <>
          <section>
            <Eyebrow tone="accent" className="mb-3">
              Aniversário de vida
            </Eyebrow>
            {deVida.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-muted">
                Ninguém faz aniversário nos próximos 30 dias — ou as datas de nascimento ainda não
                foram preenchidas no perfil.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {deVida.map((a) => (
                  <Card
                    key={`${a.pessoaId}-nascimento`}
                    className="flex items-center gap-3.5 border-gold/40 bg-gold/[0.07]"
                  >
                    <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-gold/20 text-[#7c5f16] dark:text-gold">
                      <Cake className="h-[22px] w-[22px]" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15.5px] font-semibold text-foreground">{a.nome}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {formatDateOnly(a.quando)}
                        {a.anos ? ` · ${a.anos} anos` : ""}
                      </p>
                    </div>
                    <Badge tone={a.faltam === 0 ? "success" : "gold"}>
                      {rotuloDeProximidade(a.faltam)}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {sacramentais.length > 0 && (
            <section>
              <Eyebrow tone="accent" className="mb-3">
                Sacramentos
              </Eyebrow>
              <Card className="px-3.5 py-1.5">
                {sacramentais.map((a) => {
                  const Icone = ICONE[a.tipo];
                  return (
                    <div
                      key={`${a.pessoaId}-${a.tipo}-${a.data.toISOString()}`}
                      className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
                    >
                      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                        <Icone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-medium text-foreground">{a.nome}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {NOME_DO_ANIVERSARIO[a.tipo]} · {formatDateOnly(a.quando)}
                          {a.anos ? ` · ${a.anos} anos` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] text-muted">
                        {rotuloDeProximidade(a.faltam)}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
