import Link from "next/link";
import { Bell } from "lucide-react";

export function ParishHeader({ parishName, unreadCount = 0 }: { parishName: string; unreadCount?: number }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-5 py-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-primary">Sua comunidade</p>
        <p className="font-serif text-lg text-foreground">{parishName}</p>
      </div>
      <Link href="/eu/notificacoes" className="relative text-foreground" aria-label="Notificações">
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
