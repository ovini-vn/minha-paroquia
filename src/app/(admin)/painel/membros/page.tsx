import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { LinkButton } from "@/components/ui/Button";
import { ChangeRoleForm } from "./ChangeRoleForm";
import { FiltroDeMembros, type FiltrosDeMembros } from "./_components/FiltroDeMembros";

/**
 * Quem é quem na paróquia, e o papel de cada um.
 *
 * Existe porque não havia NENHUM caminho para mudar o papel de alguém: ele
 * era definido no aceite do convite e nunca mais. Quem entrou por um link
 * genérico de fiel ficava fiel para sempre — e delegar permissão avulsa não
 * resolvia, porque as telas que procuram catequista, sacerdote ou
 * coordenador procuram POR PAPEL.
 */
export const metadata: Metadata = { title: "Membros e papéis" };

export default async function MembrosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string; q?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);
  if (!session.membership) return null;

  const todos = await listActiveMembers(session.membership.parishId);

  const { papel, q } = await searchParams;
  const busca = (q ?? "").trim();

  /*
   * Comparação sem acento e sem caixa.
   *
   * Quem procura "jose" tem de achar "José", e quem procura "MARIA" tem de
   * achar "Maria Aparecida". Exigir o acento certo faria a busca funcionar
   * só para quem já sabe como o nome foi digitado — que é justamente quem
   * não precisa procurar.
   */
  const solto = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const papeis = [...new Map(todos.map((m) => [m.role.code, m.role])).values()]
    .map((r) => ({
      code: r.code,
      nome: r.name,
      quantos: todos.filter((m) => m.role.code === r.code).length,
    }))
    .sort((a, b) => b.quantos - a.quantos || a.nome.localeCompare(b.nome, "pt-BR"));

  const escolhido = papeis.some((p) => p.code === papel) ? (papel as string) : null;
  const filtros: FiltrosDeMembros = { papel: escolhido, busca };

  const members = todos.filter(
    (m) =>
      (!escolhido || m.role.code === escolhido) &&
      (!busca || solto(m.user.fullName).includes(solto(busca))),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
          Membros e papéis
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          O papel define o que a pessoa enxerga e pode fazer. É assim que um fiel passa a ser
          catequista, coordenador ou secretaria.
        </p>
      </div>

      <FiltroDeMembros filtros={filtros} papeis={papeis} />

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={todos.length === 0 ? "Ninguém na comunidade ainda" : "Ninguém neste recorte"}
          description={
            todos.length === 0
              ? "Crie um convite no painel para as primeiras pessoas entrarem."
              : busca
                ? `Nenhum nome com "${busca}"${escolhido ? " neste papel" : ""}.`
                : "Não há ninguém com este papel."
          }
          action={
            todos.length > 0 ? (
              <LinkButton href="/painel/membros" size="sm">
                Ver todos os membros
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Card className="px-3.5 py-1.5">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
            >
              <Avatar name={member.user.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-medium text-foreground">{member.user.fullName}</p>
                <p className="mt-0.5">
                  <Badge>{member.role.name}</Badge>
                </p>
              </div>
              <ChangeRoleForm
                userId={member.user.id}
                fullName={member.user.fullName}
                currentRoleCode={member.role.code}
                ehVoce={member.user.id === session.userId}
              />
            </div>
          ))}
        </Card>
      )}

      <p className="text-[12.5px] leading-relaxed text-muted">
        Precisa dar só uma permissão específica sem mudar o papel? Use{" "}
        <span className="text-foreground">Delegar permissões</span>.
      </p>
    </div>
  );
}
