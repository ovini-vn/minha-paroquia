import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { withPlatformContext } from "@/server/db/tenant-context";
import { EntrarNoGrupo } from "./EntrarNoGrupo";

export const metadata: Metadata = { title: "Convite para o grupo" };

/**
 * O convite de um grupo, pelo link que a coordenação mandou.
 *
 * Abrir o link não põe ninguém no grupo: a pessoa vê de qual grupo se trata
 * e confirma. Um GET que inscrevesse sozinho seria disparado por qualquer
 * pré-visualização de link no WhatsApp.
 */
export default async function ConviteDoGrupoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const grupo = await withPlatformContext((tx) =>
    tx.pastoralGroup.findUnique({
      where: { conviteToken: token },
      select: { name: true, description: true, meetsWhen: true, status: true, parish: { select: { name: true } } },
    }),
  );
  if (!grupo || grupo.status !== "ativa") notFound();

  return (
    <div className="flex flex-col items-start">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-tint text-primary">
        <Users className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-5 text-[11.5px] font-semibold uppercase tracking-eyebrow text-primary">{grupo.parish.name}</p>
      <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight text-foreground">
        Você foi convidado para {grupo.name}
      </h1>
      {grupo.description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{grupo.description}</p>}
      {grupo.meetsWhen && <p className="mt-2 text-[14px] text-muted">{grupo.meetsWhen}</p>}
      <EntrarNoGrupo token={token} />
    </div>
  );
}
