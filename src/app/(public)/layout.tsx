export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream-100 px-4 py-10">
      <div className="mb-6 text-center">
        <p className="font-serif text-2xl text-terracotta-700">Comunidade</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
