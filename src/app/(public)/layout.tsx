import { Mark } from "@/components/brand/Mark";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Mark className="mb-2 h-10 w-10" />
        <p className="font-serif text-2xl text-primary">Minha Paróquia</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted">Caminhar · Pertencer · Servir</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
