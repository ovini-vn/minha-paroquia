import Link from "next/link";

export function ParishHeader({ parishName, unreadCount = 0 }: { parishName: string; unreadCount?: number }) {
  return (
    <header className="flex items-center justify-between border-b border-terracotta-100 bg-cream-100 px-5 py-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-terracotta-600">Sua comunidade</p>
        <p className="font-serif text-lg text-ink-900">{parishName}</p>
      </div>
      <Link href="/eu/notificacoes" className="relative text-xl" aria-label="Notificações">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-600 px-1 text-[10px] font-medium text-cream-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
