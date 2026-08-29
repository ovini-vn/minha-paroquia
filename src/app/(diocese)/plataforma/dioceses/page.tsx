import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Church } from "lucide-react";
import { requirePlatformAdminForPage } from "@/server/auth/guards";
import {
  listDioceses,
  listParishesInDiocese,
  listParishesWithoutDiocese,
  listDioceseMembers,
} from "@/server/modules/dioceses/service";
import {
  setParishDioceseAction,
  removeDioceseMemberAction,
} from "@/server/actions/diocese-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { DIOCESE_ROLE_LABELS } from "@/lib/diocese-labels";
import { CreateDioceseForm, AssignDioceseMemberForm } from "./DioceseForms";

/** Administração da plataforma: o mapa eclesiástico do sistema. */
export const metadata: Metadata = { title: "Dioceses" };

export default async function PlataformaDiocesesPage() {
  await requirePlatformAdminForPage();

  const dioceses = await listDioceses();
  const [semDiocese, detalhes] = await Promise.all([
    listParishesWithoutDiocese(),
    Promise.all(
      dioceses.map(async (diocese) => ({
        diocese,
        parishes: await listParishesInDiocese(diocese.id),
        members: await listDioceseMembers(diocese.id),
      })),
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dioceses"
        description="Cadastre dioceses, vincule paróquias a elas e nomeie quem as acompanha."
      />

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Nova diocese</p>
        <CreateDioceseForm />
      </Card>

      {semDiocese.length > 0 && (
        <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
          <Eyebrow className="text-[#8a6b24] dark:text-gold">Sem diocese</Eyebrow>
          <p className="mb-3 mt-2 text-[13.5px] leading-relaxed text-muted">
            {semDiocese.length === 1
              ? "Uma paróquia ainda não pertence a nenhuma diocese."
              : `${semDiocese.length} paróquias ainda não pertencem a nenhuma diocese.`}{" "}
            Elas continuam funcionando normalmente — só não aparecem em nenhuma visão diocesana.
          </p>
          <div className="flex flex-col gap-2">
            {semDiocese.map((parish) => (
              <form
                key={parish.id}
                action={setParishDioceseAction}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="parishId" value={parish.id} />
                <span className="min-w-0 flex-1 text-[14px] text-foreground">{parish.name}</span>
                <select name="dioceseId" className={`${INPUT_CLASSES} w-auto`} defaultValue="">
                  <option value="">Escolha a diocese…</option>
                  {dioceses.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
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

      {dioceses.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma diocese cadastrada"
          description="Crie a primeira acima. Paróquias sem diocese seguem funcionando normalmente."
        />
      ) : (
        detalhes.map(({ diocese, parishes, members }) => (
          <Card key={diocese.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-serif text-lg font-semibold text-foreground">{diocese.name}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {parishes.length} {parishes.length === 1 ? "paróquia" : "paróquias"}
                  {diocese.state ? ` · ${diocese.state}` : ""}
                </p>
              </div>
              <Link
                href={`/diocese/${diocese.id}`}
                className="shrink-0 rounded-full border border-border-strong px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Ver painel
              </Link>
            </div>

            <div className="border-t border-border pt-3">
              <Eyebrow className="mb-2">Paróquias</Eyebrow>
              {parishes.length === 0 ? (
                <p className="text-[13px] text-muted">Nenhuma paróquia vinculada ainda.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {parishes.map((parish) => (
                    <form
                      key={parish.id}
                      action={setParishDioceseAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="parishId" value={parish.id} />
                      <input type="hidden" name="dioceseId" value="" />
                      <Church
                        className="h-4 w-4 shrink-0 text-muted"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 text-[13.5px] text-foreground">
                        {parish.name}
                      </span>
                      <Button type="submit" variant="ghost" size="sm">
                        Desvincular
                      </Button>
                    </form>
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
                      action={removeDioceseMemberAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="dioceseId" value={diocese.id} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Avatar name={member.user.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] text-foreground">{member.user.fullName}</p>
                        <p className="text-[11.5px] text-muted">{member.user.email}</p>
                      </div>
                      <Badge>{DIOCESE_ROLE_LABELS[member.role]}</Badge>
                      <Button type="submit" variant="ghost" size="sm">
                        Remover
                      </Button>
                    </form>
                  ))}
                </div>
              )}
              <AssignDioceseMemberForm dioceseId={diocese.id} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
