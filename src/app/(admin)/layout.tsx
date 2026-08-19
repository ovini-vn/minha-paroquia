import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream-100">
      <header className="border-b border-terracotta-100 bg-cream-50 px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="font-serif text-lg text-ink-900">Painel da Paróquia</p>
          <Link href="/inicio" className="text-sm text-terracotta-700">
            Voltar ao app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  );
}
