import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";

/**
 * Barra superior sobre o gradiente do tempo litúrgico, fechada por uma
 * hairline dourada. É o elemento que mais "assina" a marca no dia a dia:
 * o app inteiro muda de atmosfera aqui quando o tempo litúrgico vira.
 */
export function Topbar({
  parishName,
  seasonName,
  unreadCount = 0,
}: {
  parishName: string;
  seasonName: string;
  unreadCount?: number;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-wash px-[18px] pb-3 pt-3.5 text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold after:to-transparent after:opacity-80">
      <Link
        href="/eu/aparencia"
        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15"
        aria-label="Aparência e tempo litúrgico"
      >
        <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[19px] font-semibold leading-tight">{parishName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-eyebrow text-gold-soft">
          <span className="h-[5px] w-[5px] rounded-full bg-gold" aria-hidden />
          {seasonName}
        </p>
      </div>

      <Link
        href="/eu/notificacoes"
        className="relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-[#3a2a05]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
