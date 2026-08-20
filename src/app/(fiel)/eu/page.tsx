import {
  UserPen,
  Sparkles,
  CalendarDays,
  Users,
  HandCoins,
  Clock,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Landmark,
  Settings,
} from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { findUserById } from "@/server/modules/users/repository";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow } from "@/components/ui/Typography";
import { logoutAction } from "@/server/actions/auth-actions";
import { formatDateOnly } from "@/lib/date";

export default async function ProfilePage() {
  const session = await getSessionContext();
  if (!session) return null;
  const user = await findUserById(session.userId);

  const canSeeAdminPanel =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  const canManageAvailability = session.permissions.includes(PERMISSIONS.AVAILABILITY_MANAGE);
  const canTeachCatequese =
    session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH) ||
    session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE);

  const detalhes = [user?.phone, user?.birthDate ? formatDateOnly(user.birthDate) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      {/* Identidade — quem eu sou nesta comunidade. */}
      <Card className="flex flex-col items-center gap-2 py-6 text-center">
        <Avatar name={session.fullName} size="lg" />
        <p className="mt-1 font-serif text-2xl font-semibold text-foreground">{session.fullName}</p>
        <p className="text-[13px] text-muted">{session.email}</p>
        {detalhes && <p className="text-[13px] text-muted">{detalhes}</p>}
        {session.membership && (
          <div className="mt-1 flex flex-col items-center gap-1.5">
            <Badge>{session.membership.roleName}</Badge>
            <p className="text-xs text-muted">{session.membership.parishName}</p>
          </div>
        )}
      </Card>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Minha caminhada
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          <RowLink
            href="/eu/atendimentos"
            icon={CalendarDays}
            title="Meus atendimentos"
            subtitle="Conversas e confissões agendadas"
          />
          <RowLink
            href="/eu/familia"
            icon={Users}
            title="Minha família"
            subtitle="Dependentes e responsáveis"
          />
          <RowLink
            href="/eu/dizimo"
            icon={HandCoins}
            title="Dízimo"
            subtitle="Minha participação por período"
          />
        </Card>
      </section>

      {(session.dioceses.length > 0 || session.isPlatformAdmin) && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Diocese
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            <RowLink
              href="/diocese"
              icon={Landmark}
              title={session.dioceses.length === 1 ? session.dioceses[0]!.name : "Dioceses"}
              subtitle="Visão do conjunto das paróquias"
            />
            {session.isPlatformAdmin && (
              <RowLink
                href="/plataforma/dioceses"
                icon={Settings}
                title="Administração da plataforma"
                subtitle="Dioceses, paróquias e vínculos"
              />
            )}
          </Card>
        </section>
      )}

      {(canManageAvailability || canTeachCatequese || canSeeAdminPanel) && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Meu serviço
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {canManageAvailability && (
              <RowLink
                href="/eu/disponibilidade"
                icon={Clock}
                title="Minha disponibilidade"
                subtitle="Quando posso atender"
              />
            )}
            {canTeachCatequese && (
              <RowLink
                href="/eu/catequese"
                icon={BookOpen}
                title="Minha catequese"
                subtitle="Turmas que acompanho"
              />
            )}
            {canSeeAdminPanel && (
              <RowLink
                href="/painel"
                icon={LayoutDashboard}
                title="Painel da paróquia"
                subtitle="Gestão da comunidade"
              />
            )}
          </Card>
        </section>
      )}

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Conta
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          <RowLink
            href="/eu/perfil"
            icon={UserPen}
            title="Editar perfil"
            subtitle="Nome, telefone e data de nascimento"
          />
          <RowLink
            href="/eu/aparencia"
            icon={Sparkles}
            title="Aparência"
            subtitle="Tema padrão ou cor do Tempo Litúrgico"
          />
        </Card>
      </section>

      <form action={logoutAction}>
        <Button variant="ghost" type="submit" className="w-full">
          <LogOut className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
          Sair
        </Button>
      </form>
    </div>
  );
}
