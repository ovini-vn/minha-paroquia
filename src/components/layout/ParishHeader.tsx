export function ParishHeader({ parishName }: { parishName: string }) {
  return (
    <header className="border-b border-terracotta-100 bg-cream-100 px-5 py-3">
      <p className="text-xs uppercase tracking-wide text-terracotta-600">Sua comunidade</p>
      <p className="font-serif text-lg text-ink-900">{parishName}</p>
    </header>
  );
}
