import Link from "next/link";
import { Landmark, Crown, Flag } from "lucide-react";
import { requirePlatformAdminForPage } from "@/server/auth/guards";
import {
  listProvinces,
  listDiocesesInProvince,
  listDiocesesWithoutProvince,
  listProvinceMembers,
  listNationalMembers,
} from "@/server/modules/provinces/service";
import {
  setDioceseProvinceAction,
  setArchdioceseAction,
  removeProvinceMemberAction,
  revokeNationalScopeAction,
} from "@/server/actions/province-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { PROVINCE_ROLE_LABELS, NATIONAL_ROLE_LABELS } from "@/lib/province-labels";
import {
  CreateProvinceForm,
  AssignProvinceMemberForm,
  GrantNationalScopeForm,
} from "./StructureForms";

/** Administração da plataforma: províncias, sedes metropolitanas e acesso nacional. */
export default async function PlataformaEstruturaPage() {
  await requirePlatformAdminForPage();

  const provinces = await listProvinces();
  const [semProvincia, nacionais, detalhes] = await Promise.all([
    listDiocesesWithoutProvince(),
    listNationalMembers(),
    Promise.all(
      provinces.map(async (province) => ({
        province,
        dioceses: await listDiocesesInProvince(province.id),
        members: await listProvinceMembers(province.id),
      })),
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estrutura eclesiástica"
        description="Províncias, sedes metropolitanas e quem tem acesso nacional."
      />

      <Card>
        <p className="mb-1 font-serif text-lg font-semibold text-foreground">Nova província</p>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Uma província reúne uma arquidiocese (sede metropolitana) e as dioceses sufragâneas. Não
          é o mesmo recorte dos Regionais da CNBB.
        </p>
        <CreateProvinceForm />
      </Card>

      <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
            <Flag className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <p className="font-serif text-lg font-semibold text-foreground">Acesso nacional</p>
            <p className="text-[12.5px] text-muted">Vê todas as dioceses do país.</p>
          </div>
        </div>

        {nacionais.length > 0 && (
          <div className="mb-3 flex flex-col gap-1.5 border-t border-border pt-3">
            {nacionais.map((member) => (
              <form
                key={member.id}
                action={revokeNationalScopeAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="userId" value={member.user.id} />
                <Avatar name={member.user.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-foreground">{member.user.fullName}</p>
                  <p className="text-[11.5px] text-muted">{member.user.email}</p>
                </div>
                <Badge tone="gold">{NATIONAL_ROLE_LABELS[member.role]}</Badge>
                <Button type="submit" variant="ghost" size="sm">
                  Revogar
                </Button>
              </form>
            ))}
          </div>
        )}
        <div className="border-t border-border pt-3">
          <GrantNationalScopeForm />
        </div>
      </Card>

      {semProvincia.length > 0 && (
        <Card>
          <Eyebrow tone="accent" className="mb-2">
            Dioceses sem província
          </Eyebrow>
          <p className="mb-3 text-[13px] leading-relaxed text-muted">
            Continuam funcionando normalmente — só não aparecem em nenhuma visão provincial.
          </p>
          <div className="flex flex-col gap-2">
            {semProvincia.map((diocese) => (
              <form
                key={diocese.id}
                action={setDioceseProvinceAction}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="dioceseId" value={diocese.id} />
                <span className="min-w-0 flex-1 text-[14px] text-foreground">{diocese.name}</span>
                <select name="provinceId" className={`${INPUT_CLASSES} w-auto`} defaultValue="">
                  <option value="">Escolha a província…</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="ghost" size="sm">
                  Vincular
                </Button>
              </form>
            ))}
          </div>
        </Card>
      )}

      {provinces.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma província cadastrada"
          description="Crie a primeira acima. Dioceses sem província seguem funcionando normalmente."
        />
      ) : (
        detalhes.map(({ province, dioceses, members }) => (
          <Card key={province.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-serif text-lg font-semibold text-foreground">{province.name}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {dioceses.length} {dioceses.length === 1 ? "diocese" : "dioceses"}
                </p>
              </div>
              <Link
                href={`/provincia/${province.id}`}
                className="shrink-0 rounded-full border border-border-strong px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Ver painel
              </Link>
            </div>

            <div className="border-t border-border pt-3">
              <Eyebrow className="mb-2">Dioceses</Eyebrow>
              {dioceses.length === 0 ? (
                <p className="text-[13px] text-muted">Nenhuma diocese vinculada ainda.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {dioceses.map((diocese) => (
                    <div key={diocese.id} className="flex flex-wrap items-center gap-2">
                      {diocese.isArchdiocese ? (
                        <Crown
                          className="h-4 w-4 shrink-0 text-gold"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      ) : (
                        <Landmark
                          className="h-4 w-4 shrink-0 text-muted"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1 text-[13.5px] text-foreground">
                        {diocese.name}
                      </span>
                      {diocese.isArchdiocese ? (
                        <Badge tone="gold">Sede</Badge>
                      ) : (
                        <form action={setArchdioceseAction}>
                          <input type="hidden" name="dioceseId" value={diocese.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Marcar como sede
                          </Button>
                        </form>
                      )}
                      <form action={setDioceseProvinceAction}>
                        <input type="hidden" name="dioceseId" value={diocese.id} />
                        <input type="hidden" name="provinceId" value="" />
                        <Button type="submit" variant="ghost" size="sm">
                          Desvincular
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <Eyebrow className="mb-2">Quem acompanha</Eyebrow>
              {members.length > 0 && (
                <div className="mb-3 flex flex-col gap-1.5">
                  {members.map((member) => (
                    <form
                      key={member.id}
                      action={removeProvinceMemberAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="provinceId" value={province.id} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Avatar name={member.user.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] text-foreground">{member.user.fullName}</p>
                        <p className="text-[11.5px] text-muted">{member.user.email}</p>
                      </div>
                      <Badge>{PROVINCE_ROLE_LABELS[member.role]}</Badge>
                      <Button type="submit" variant="ghost" size="sm">
                        Remover
                      </Button>
                    </form>
                  ))}
                </div>
              )}
              <AssignProvinceMemberForm provinceId={province.id} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
