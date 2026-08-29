import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { listDioceses } from "@/server/modules/dioceses/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { DIOCESE_ROLE_LABELS } from "@/lib/diocese-labels";

/**
 * Lista as dioceses que a pessoa supervisiona. Admin da plataforma vê todas;
 * bispo vê só as suas — filtramos pela sessão, nunca por parâmetro de URL.
 */
export const metadata: Metadata = { title: "Diocese" };

export default async function DioceseIndexPage() {
  const session = await requireSessionForPage();

  const all = session.isPlatformAdmin ? await listDioceses() : [];
  const minhas = session.dioceses;

  if (!session.isPlatformAdmin && minhas.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="Você não supervisiona nenhuma diocese"
        description="Esta área é para bispos e administradores diocesanos. Fale com o administrador da plataforma."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.isPlatformAdmin ? "Dioceses" : "Minha diocese"}
        description="Escolha uma diocese para ver o conjunto das paróquias."
      />

      {session.isPlatformAdmin ? (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Todas as dioceses
          </Eyebrow>
          {all.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="Nenhuma diocese cadastrada"
              description="Cadastre a primeira diocese na administração da plataforma."
            />
          ) : (
            <Card className="px-3.5 py-1.5">
              {all.map((diocese) => (
                <RowLink
                  key={diocese.id}
                  href={`/diocese/${diocese.id}`}
                  icon={Landmark}
                  title={diocese.name}
                  subtitle={`${diocese._count.parishes} ${
                    diocese._count.parishes === 1 ? "paróquia" : "paróquias"
                  }${diocese.state ? ` · ${diocese.state}` : ""}`}
                />
              ))}
            </Card>
          )}
        </section>
      ) : (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Sob sua responsabilidade
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {minhas.map((diocese) => (
              <div
                key={diocese.id}
                className="flex items-center gap-3 border-b border-border py-1 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <RowLink
                    href={`/diocese/${diocese.id}`}
                    icon={Landmark}
                    title={diocese.name}
                    subtitle={DIOCESE_ROLE_LABELS[diocese.role]}
                  />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {session.isPlatformAdmin && (
        <p className="text-xs leading-relaxed text-muted">
          Como administrador da plataforma, você vê todas as dioceses. Bispos veem apenas a sua.
        </p>
      )}
    </div>
  );
}
