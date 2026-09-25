import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requirePlatformAdminForPage } from "@/server/auth/guards";
import { withPlatformContext } from "@/server/db/tenant-context";
import { abrirPainelDaParoquiaAction } from "@/server/actions/diocese-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { PrimeiroAcessoForm } from "./PrimeiroAcessoForm";

export const metadata: Metadata = { title: "Implantar paróquia" };

/**
 * Implantar uma paróquia: dar a ela quem a administre.
 *
 * O resto da configuração — horários, contato, história — é feito no painel
 * dela, pelo botão "Abrir painel", que não mexe no vínculo de ninguém.
 */
export default async function ImplantarParoquiaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdminForPage();
  const { id } = await params;

  const paroquia = await withPlatformContext((tx) =>
    tx.parish.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        memberships: {
          where: { status: "active", role: { code: { in: ["PAROCO", "ADMINISTRADOR_PAROQUIAL", "SECRETARIA"] } } },
          select: { user: { select: { fullName: true, email: true } }, role: { select: { name: true } } },
        },
      },
    }),
  );
  if (!paroquia) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/plataforma/dioceses"
        className="alvo-de-toque inline-flex items-center gap-1 self-start text-[13px] text-muted hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Dioceses e paróquias
      </Link>
      <PageHeader
        title={paroquia.name}
        description={[paroquia.city, paroquia.state].filter(Boolean).join(" · ") || undefined}
      />

      <Card>
        <Eyebrow tone="accent" className="mb-2">
          Quem administra
        </Eyebrow>
        {paroquia.memberships.length === 0 ? (
          <p className="text-[14px] text-muted">
            Ninguém ainda. Sem isso, a paróquia só pode ser cuidada pela plataforma.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {paroquia.memberships.map((m) => (
              <li key={m.user.email} className="text-[14px] text-foreground">
                <span className="font-medium">{m.user.fullName}</span>
                <span className="text-muted"> · {m.role.name} · {m.user.email}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="mb-1 font-serif text-lg font-semibold text-foreground">Primeiro acesso</p>
        <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
          Crie a conta do pároco ou de quem vai cuidar do app nesta paróquia. Você recebe um link para mandar a
          ela; com ele, a pessoa define a senha e entra já com o papel escolhido.
        </p>
        <PrimeiroAcessoForm parishId={paroquia.id} />
      </Card>

      <Card>
        <p className="mb-1 font-serif text-lg font-semibold text-foreground">Configurar</p>
        <p className="mb-3 text-[13.5px] leading-relaxed text-muted">
          Horários, contato, história e pároco se preenchem no painel da paróquia. Você entra nele sem sair da sua.
        </p>
        <form action={abrirPainelDaParoquiaAction}>
          <input type="hidden" name="parishId" value={paroquia.id} />
          <Button type="submit" variant="secondary">
            Abrir painel da {paroquia.name}
          </Button>
        </form>
      </Card>
    </div>
  );
}
