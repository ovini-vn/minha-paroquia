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
 * justamente quem o app deveria alcançar. A trava mudou de lugar: entra na
 * hora, e o que espera confirmação da secretaria é o acesso às PESSOAS —
 * ver o mural de oração, encontrar alguém pelo nome.
 */
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
        Escolha e você já entra. A secretaria confirma depois — enquanto isso você acompanha as
        missas, os avisos e a agenda normalmente.
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
