import type { Metadata } from "next";
import { CalendarCheck,
  UserPen,
  Sparkles,
  Bell,
  CalendarDays,
  Footprints,
  Users,
  HandCoins,
  HandHeart,
  Clock,
  Church,
  LogOut,
  Flame,
} from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { findUserById } from "@/server/modules/users/repository";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RowLink } from "@/components/ui/RowLink";
import { DuasColunas } from "@/components/layout/DuasColunas";
import { Eyebrow } from "@/components/ui/Typography";
import { logoutAction } from "@/server/actions/auth-actions";
import { formatDateOnly } from "@/lib/date";

export const metadata: Metadata = { title: "Eu" };

export default async function ProfilePage() {
  const session = await getSessionContext();
  if (!session) return null;
  const user = await findUserById(session.userId);

  // Disponibilidade continua aqui: "quando posso atender" é decisão
  // pessoal do sacerdote, não trabalho da secretaria. Painel, catequese e
  // as visões de diocese saíram para /gestao — ver src/server/auth/management.ts.
  const canManageAvailability = session.permissions.includes(PERMISSIONS.AVAILABILITY_MANAGE);

  const detalhes = [user?.phone, user?.birthDate ? formatDateOnly(user.birthDate) : null]
    .filter(Boolean)
    .join(" · ");

  /*
   * Duas colunas no computador: o que a pessoa VEIO fazer à esquerda, o
   * que ela quer saber de relance à direita.
   *
   * O cartão de identidade é consulta — nome, papel, paróquia. Os links
   * são o motivo de abrir esta tela. Empilhados numa coluna só, a
   * identidade empurra para baixo da dobra tudo o que se usa.
   *
   * `lateralPrimeiroNoCelular` mantém o celular EXATAMENTE como está:
   * identidade em cima, seções embaixo.
   */
  return (
    <DuasColunas
      lateralPrimeiroNoCelular
      lateral={
        <div className="flex flex-col gap-6">
          {/* Identidade — quem eu sou nesta comunidade. */}
          <Card className="flex flex-col items-center gap-2 py-6 text-center">
            <Avatar name={session.fullName} size="lg" />
            <p className="mt-1 font-serif text-2xl font-semibold text-foreground">{session.fullName}</p>
            <p className="text-[13px] text-muted">{session.email}</p>
            {detalhes && <p className="text-[13px] text-muted">{detalhes}</p>}
            {/* Administrar a plataforma inteira é outro eixo, não um papel de
                paróquia — e quem tem esse alcance precisa vê-lo dito, para não
                confundir com a função que exerce na comunidade. */}
            {session.isPlatformAdmin && <Badge tone="gold">Administrador da Plataforma</Badge>}

            {session.membership && (
              <div className="mt-1 flex flex-col items-center gap-1.5">
                <Badge>{session.membership.roleName}</Badge>
                <p className="text-[13px] text-muted">{session.membership.parishName}</p>
              </div>
            )}
          </Card>
        </div>
      }
      principal={
        <div className="flex flex-col gap-6">
          <section>
            {/*
              "Minha vida na paróquia", e não "Minha caminhada".

              A seção se chamava Minha caminhada e listava atendimentos,
              família, ofertas e dízimo — enquanto a tela que o app inteiro
              chama de Minha Caminhada (sacramentos, missas, confissões)
              morava na aba Palavra e nem aparecia aqui. O mesmo nome para
              duas coisas: quem procurava o próprio batismo abria esta seção e
              não achava.

              Agora o nome é da tela, e a tela está na lista, em primeiro: é o
              registro mais pessoal que o app guarda. Abrir por aqui acende a
              aba Palavra, que é onde a Caminhada mora na barra.
            */}
            <Eyebrow tone="accent" className="mb-3">
              Minha vida na paróquia
            </Eyebrow>
            <Card className="px-3.5 py-1.5">
              <RowLink
                href="/eu/compromissos"
                icon={CalendarCheck}
                title="Meus compromissos"
                subtitle="Escalas, encontros, tarefas e atendimentos"
              />
              <RowLink
                href="/caminhada"
                icon={Footprints}
                title="Minha Caminhada"
                subtitle="Sacramentos, missas e confissões"
              />
              <RowLink
                href="/eu/atendimentos"
                icon={CalendarDays}
                title="Meus atendimentos"
                subtitle="Conversas e confissões agendadas"
              />
              <RowLink
                href="/intencoes"
                icon={Flame}
                title="Intenção de missa"
                subtitle="Pedir que a comunidade reze por alguém"
              />
              <RowLink
                href="/eu/familia"
                icon={Users}
                title="Minha família"
                subtitle="Dependentes e responsáveis"
              />
              {/*
                A oferta antes do dízimo, e as duas juntas.

                Leva à MESMA tela do "Ofertar" do Início, já rolada até Minhas
                ofertas. Eram duas telas — "Minha oferta" aqui, "Ofertar" lá —
                e quem entrava por aqui nunca via os cartões que explicam cada
                causa. Quem só quer conferir o que já ofertou continua sem
                atravessar o convite.

                A oferta vem primeiro porque é a que se FAZ: leva a gerar um
                código hoje. O dízimo abaixo é registro do que a Pastoral já
                anotou, e não tem ação nenhuma para quem abre.

                Sem porteiro, ao contrário do convite em Ofertar. Nesta tela as
                linhas são um índice do que é meu, e nenhuma delas se esconde
                por estar vazia — "Meus atendimentos" também aparece para quem
                nunca agendou. Cada destino explica o próprio vazio.
              */}
              <RowLink
                href="/doacao#minhas-ofertas"
                icon={HandHeart}
                title="Minhas ofertas"
                subtitle="O que você já ofertou, e fazer uma nova oferta"
              />
              <RowLink
                href="/eu/dizimo"
                icon={HandCoins}
                title="Dízimo"
                subtitle="Minha participação por período"
              />
            </Card>
          </section>

          {canManageAvailability && (
            <section>
              <Eyebrow tone="accent" className="mb-3">
                Meu serviço
              </Eyebrow>
              <Card className="px-3.5 py-1.5">
                <RowLink
                  href="/eu/disponibilidade"
                  icon={Clock}
                  title="Minha disponibilidade"
                  subtitle="Quando posso atender"
                />
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
              {/* Sem convites (ver src/lib/funcionalidades.ts), a pessoa
                  escolhe a paróquia sozinha — e muda sozinha também. */}
              {session.membership && (
                <RowLink
                  href="/escolher-paroquia?trocar=1"
                  icon={Church}
                  title="Mudar de paróquia"
                  subtitle={`Hoje: ${session.membership.parishName}`}
                />
              )}
              {/*
                As boas-vindas dizem "você escolhe depois quais avisos quer
                receber, em Eu → Notificações" — e este item não existia: o
                único caminho era o sininho, que não tem nome. A frase
                mandava a pessoa a um lugar que ela não ia achar.
              */}
              <RowLink
                href="/eu/notificacoes#o-que-receber"
                icon={Bell}
                title="Notificações"
                subtitle="Quais avisos você quer receber"
              />
              {/* Dizia "Aparência — Tema padrão ou cor do Tempo Litúrgico":
                  quem procurava letra maior lia o item inteiro e não
                  encontrava a palavra "letra". */}
              <RowLink
                href="/eu/aparencia"
                icon={Sparkles}
                title="Tamanho da letra e aparência"
                subtitle="Letra maior, tema claro ou escuro, cor do Tempo Litúrgico"
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
      }
    />
  );
}
