import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Church, ChevronLeft } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { listParishesForJoin } from "@/server/modules/parishes/service";
import { lerParoquiaDeEntrada } from "@/server/auth/paroquia-de-entrada";
import { withPlatformContext } from "@/server/db/tenant-context";
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
  searchParams: Promise<{ busca?: string; trocar?: string }>;
}) {
  const session = await requireSessionForPage();
  const { busca, trocar } = await searchParams;

  /*
   * Duas portas para a mesma tela.
   *
   * Sem paróquia, é o primeiro passo do app. Com paróquia, só se chega por
   * "Mudar de paróquia", em Eu (`?trocar=1`) — sem o parâmetro, quem já tem
   * paróquia volta ao Início, como sempre foi.
   *
   * Mudar ficou ao alcance do fiel quando os convites foram desligados
   * (15/09/2026): entrar numa paróquia já encerrava a anterior, só não
   * havia botão. A regra de não deixar a paróquia antiga sem administrador
   * mora em `joinParish`, e o erro dela aparece nesta tela.
   */
  const atual = session.membership;
  if (atual && trocar !== "1") redirect("/inicio");
  const trocando = Boolean(atual);

  const lista = (await listParishesForJoin(busca)).filter((p) => p.id !== atual?.parishId);

  /*
   * Quem chegou pelo link de uma paróquia (/p/<paróquia>) a encontra no
   * topo, já marcada. A pessoa ainda confirma: o link lembra de onde ela
   * veio, não decide por ela.
   */
  const idDeEntrada = await lerParoquiaDeEntrada();
  const deEntrada =
    idDeEntrada && idDeEntrada !== atual?.parishId
      ? await withPlatformContext((tx) =>
          tx.parish.findUnique({ where: { id: idDeEntrada }, select: { id: true, name: true, city: true, state: true } }),
        )
      : null;
  const paroquias = deEntrada ? [deEntrada, ...lista.filter((p) => p.id !== deEntrada.id)] : lista;

  return (
    <div className="flex min-h-dvh flex-col px-[18px] pb-10 pt-8">
      {trocando && (
        <Link
          href="/eu"
          className="alvo-de-toque mb-4 inline-flex items-center gap-1 self-start text-[13px] text-muted transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Voltar
        </Link>
      )}
      <Symbol className="h-12 w-auto text-primary" />
      <h1 className="mt-5 font-serif text-[28px] font-semibold leading-tight text-foreground">
        {trocando ? "Mudar de paróquia" : "Qual é a sua paróquia?"}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
        {atual
          ? `Hoje você faz parte da ${atual.parishName}. Escolha a nova, e a mudança vale na hora.`
          : "Escolha e pronto, você já faz parte. Nada a aprovar, ninguém a esperar."}
      </p>

      {/* Quem tem papel perde o papel ao mudar, e precisa saber ANTES de
          tocar: na nova paróquia todo mundo entra como fiel. */}
      {atual && atual.roleCode !== "FIEL" && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-tint p-3.5 text-[13.5px] leading-relaxed text-foreground">
          Você é <strong>{atual.roleName}</strong> na {atual.parishName}. Na nova paróquia você
          entra como fiel, e esse papel fica na atual.
        </div>
      )}

      <div className="mt-6">
        {deEntrada && (
          <p className="mb-3 rounded-lg border border-gold/45 bg-gold/[0.08] px-3.5 py-2.5 text-[13.5px] text-foreground">
            Você chegou pelo link da <strong>{deEntrada.name}</strong>. Ela já está marcada abaixo.
          </p>
        )}
        <EscolherForm
          sugerida={deEntrada?.id ?? null}
          trocando={trocando}
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
            {trocando && !busca
              ? "Ainda não há outra paróquia no aplicativo."
              : "Nenhuma paróquia encontrada com esse nome ou cidade."}
          </p>
          <p className="text-[13px] text-muted">
            Se a sua ainda não está no app, peça ao pároco para cadastrar.
          </p>
        </div>
      )}
    </div>
  );
}
