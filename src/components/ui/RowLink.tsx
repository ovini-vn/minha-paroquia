import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/**
 * Linha de navegação com ícone + título + subtítulo. É o padrão de lista do
 * app inteiro — em vez de empilhar cards, agrupamos linhas dentro de um
 * único <Card>, o que dá muito mais respiro (briefing, seção 17).
 */
export function RowLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 border-b border-border px-1 py-[15px] transition-colors last:border-b-0 hover:bg-primary-tint"
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-primary-tint text-primary">
        <Icon className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium text-foreground">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[12.5px] text-muted">{subtitle}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
    </Link>
  );
}
