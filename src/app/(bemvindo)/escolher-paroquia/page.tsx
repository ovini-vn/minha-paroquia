import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Church } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { listParishesForJoin } from "@/server/modules/parishes/service";
import { Symbol } from "@/components/brand/Symbol";
import { EscolherForm } from "./EscolherForm";

/**
 * A porta de entrada de quem não tem convite.
 *
 * Exigir convite para simplesmente ver o horário da missa afastava
 * justamente quem o app deveria alcançar. Escolher a paróquia aqui já faz
 * da pessoa um membro: não há aprovação depois. Quem for FIEL não tem
 * permissão nenhuma além de acompanhar a própria paróquia, e é o papel que
 * guarda o resto — não uma fila de espera.
 */
export const metadata: Metadata = { title: "Escolher paróquia" };

export default async function EscolherParoquiaPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const session = await requireSessionForPage();
  // Já pertence a alguma: nada a escolher.
  if (session.membership) redirect("/inicio");

  const { busca } = await searchParams;
  const paroquias = await listParishesForJoin(busca);

  return (
    <div className="flex min-h-dvh flex-col px-[18px] pb-10 pt-8">
      <Symbol className="h-12 w-auto text-primary" />
      <h1 className="mt-5 font-serif text-[28px] font-semibold leading-tight text-foreground">
        Qual é a sua paróquia?
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
        Escolha e pronto, você já faz parte. Nada a aprovar, ninguém a esperar.
      </p>

      <div className="mt-6">
        <EscolherForm
          paroquias={paroquias.map((p) => ({
            id: p.id,
            name: p.name,
            local: [p.city, p.state].filter(Boolean).join(" · "),
          }))}
          buscaAtual={busca ?? ""}
        />
      </div>

      {paroquias.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <Church className="h-8 w-8 text-border-strong" strokeWidth={1.5} aria-hidden />
          <p className="text-[14px] text-muted">
            Nenhuma paróquia encontrada com esse nome ou cidade.
          </p>
          <p className="text-[13px] text-muted">
            Se a sua ainda não está no app, peça ao pároco para cadastrar.
          </p>
        </div>
      )}
    </div>
  );
}
