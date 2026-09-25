import {
  BookOpen,
  Cake,
  Church,
  Clock,
  Compass,
  Flame,
  FileSpreadsheet,
  Gauge,
  HandCoins,
  HandHeart,
  HeartHandshake,
  KeyRound,
  Landmark,
  Megaphone,
  Music,
  PartyPopper,
  Repeat,
  ScrollText,
  Ticket,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CONVITES_ATIVOS } from "@/lib/funcionalidades";
import { PERMISSIONS, type PermissionCode } from "@/server/auth/rbac";

/**
 * Os destinos do painel, numa lista só.
 *
 * Existem DOIS lugares que precisam desta lista: o índice do painel e a
 * barra lateral do computador. Mantê-la duplicada é o jeito conhecido de
 * um destino novo entrar num lugar e faltar no outro — já aconteceu neste
 * projeto com o atributo do tempo litúrgico, que divergiu entre o layout do
 * fiel e o do painel justamente por não morar num lugar só.
 *
 * O que NÃO está aqui: os subtítulos. Eles trazem contagens ("3 aguardando
 * validação") que só a página sabe calcular, e enfiá-las aqui puxaria meia
 * dúzia de consultas para dentro de um arquivo de navegação.
 */

/**
 * Os grupos, na ordem em que aparecem.
 *
 * O recorte é por TIPO DE TRABALHO, e não por área do organograma: quem
 * está na secretaria passa a manhã no balcão, depois fecha o caixa, depois
 * publica os avisos — e cada um desses é um bloco de tempo. Agrupar por
 * "pastoral / administrativo" espalharia as três tarefas da manhã por
 * cantos diferentes da barra.
 */
export const GRUPOS_DO_PAINEL = [
  "Atendimento",
  "Dinheiro",
  "Comunidade",
  "Formação e liturgia",
  "A paróquia",
  "Acessos",
] as const;

export type GrupoDoPainel = (typeof GRUPOS_DO_PAINEL)[number];

export type ItemDoPainel = {
  href: string;
  /** Curto, porque a barra lateral é estreita. O índice usa o mesmo. */
  label: string;
  icon: LucideIcon;
  grupo: GrupoDoPainel;
  /** Sem permissão declarada, quem alcança o painel alcança o destino. */
  permissao?: PermissionCode;
  /**
   * Destino FORA do painel (mora no app do fiel).
   *
   * A catequese é o caso: ela é trabalho de coordenação, mas a tela vive
   * junto com a do catequista e a do pai que acompanha o filho. Sai do
   * painel ao clicar, e a barra some — por isso é marcada, para a barra
   * poder avisar em vez de o sumiço parecer defeito.
   */
  saiDoPainel?: boolean;
};

export const ITENS_DO_PAINEL: ItemDoPainel[] = [
  /*
   * Atendimento vem primeiro, e dentro dele a redefinição de senha.
   *
   * É a única tarefa do painel que chega com alguém esperando do outro lado
   * do balcão — quem não consegue entrar liga ou aparece. Já esteve na
   * posição 15 de 18, a 2.300px do topo do índice: existia e não era
   * encontrado.
   *
   * O rótulo é do ponto de vista de QUEM OPERA. "Esqueci minha senha" está
   * escrito para o fiel; quem abre esta tela não esqueceu senha nenhuma —
   * está ajudando quem esqueceu.
   */
  {
    href: "/painel/acesso",
    label: "Ajudar a entrar",
    icon: KeyRound,
    grupo: "Atendimento",
    permissao: PERMISSIONS.MEMBER_PASSWORD_RESET,
  },
  { href: "/painel/oracao", label: "Pedidos de oração", icon: HandHeart, grupo: "Atendimento" },
  { href: "/painel/sacramentos", label: "Sacramentos", icon: ScrollText, grupo: "Atendimento" },
  {
    href: "/painel/intencoes",
    label: "Intenções de missa",
    icon: Flame,
    grupo: "Atendimento",
    permissao: PERMISSIONS.AGENDA_MANAGE,
  },

  {
    href: "/painel/financeiro",
    label: "Financeiro",
    icon: Wallet,
    grupo: "Dinheiro",
    permissao: PERMISSIONS.FINANCEIRO_VER,
  },
  { href: "/painel/dizimo", label: "Dízimo", icon: HandCoins, grupo: "Dinheiro" },
  { href: "/painel/doacao", label: "Ofertar", icon: HandCoins, grupo: "Dinheiro" },

  { href: "/painel/avisos", label: "Avisos", icon: Megaphone, grupo: "Comunidade" },
  { href: "/painel/eventos", label: "Eventos", icon: PartyPopper, grupo: "Comunidade" },
  { href: "/painel/aniversarios", label: "Aniversários", icon: Cake, grupo: "Comunidade" },
  {
    href: "/painel/conselho",
    label: "Painel do conselho",
    icon: Gauge,
    grupo: "Comunidade",
    permissao: PERMISSIONS.DASHBOARD_PARISH_VIEW,
  },
  { href: "/painel/pastorais", label: "Grupos e pastorais", icon: Users, grupo: "Comunidade" },
  { href: "/painel/servir", label: "Servir", icon: HeartHandshake, grupo: "Comunidade" },

  {
    href: "/catequese",
    label: "Catequese",
    icon: BookOpen,
    grupo: "Formação e liturgia",
    saiDoPainel: true,
  },
  { href: "/painel/liturgia", label: "Liturgia", icon: Music, grupo: "Formação e liturgia" },
  { href: "/painel/missas", label: "Horários das missas", icon: Repeat, grupo: "Formação e liturgia" },

  {
    href: "/painel/relatorios",
    label: "Relatórios",
    icon: FileSpreadsheet,
    grupo: "A paróquia",
    permissao: PERMISSIONS.DASHBOARD_PARISH_VIEW,
  },
  {
    href: "/painel/paroquia",
    label: "Dados da paróquia",
    icon: Church,
    grupo: "A paróquia",
  },
  { href: "/painel/paroco", label: "Nosso Pároco", icon: UserRound, grupo: "A paróquia" },
  {
    href: "/painel/sacerdotes",
    label: "Sacerdotes",
    // Ícone próprio: "Grupos e pastorais" já usa `Users`, e dois destinos
    // idênticos na mesma barra desfazem o que a barra existe para fazer.
    icon: UsersRound,
    grupo: "A paróquia",
    permissao: PERMISSIONS.INVITATIONS_CREATE,
  },
  { href: "/painel/historia", label: "Nossa História", icon: Landmark, grupo: "A paróquia" },
  { href: "/painel/expediente", label: "Horário da secretaria", icon: Clock, grupo: "A paróquia" },
  {
    href: "/painel/plano",
    label: "Plano pastoral",
    icon: Compass,
    grupo: "A paróquia",
    permissao: PERMISSIONS.PLANO_MANAGE,
  },

  // Desligado por `CONVITES_ATIVOS` (ver src/lib/funcionalidades.ts): fora
  // da lista, some do menu lateral E da página inicial do painel, que leem
  // esta mesma lista.
  ...(CONVITES_ATIVOS
    ? [
        {
          href: "/painel/convites",
          label: "Convites",
          icon: Ticket,
          grupo: "Acessos" as const,
          permissao: PERMISSIONS.INVITATIONS_CREATE,
        },
      ]
    : []),
  {
    href: "/painel/membros",
    label: "Membros e papéis",
    icon: Users,
    grupo: "Acessos",
    permissao: PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
  },
  {
    href: "/painel/permissoes",
    label: "Delegar permissões",
    icon: KeyRound,
    grupo: "Acessos",
    permissao: PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
  },
  {
    href: "/painel/auditoria",
    label: "Histórico de acessos",
    icon: ScrollText,
    grupo: "Acessos",
    permissao: PERMISSIONS.PERMISSION_OVERRIDES_MANAGE,
  },
];

/**
 * Qual destino está aberto agora.
 *
 * Compara pelo caminho MAIS LONGO que casa, e não pelo primeiro: as telas
 * de dentro (`/painel/sacerdotes/<id>`) precisam acender o destino raiz, mas
 * `/painel` casaria com tudo se a comparação fosse por prefixo simples.
 */
export function itemAtivoDoPainel(pathname: string): ItemDoPainel | null {
  const candidatos = ITENS_DO_PAINEL.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}
