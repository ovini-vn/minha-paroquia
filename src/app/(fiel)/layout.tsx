import { requireSessionForPage } from "@/server/auth/guards";
import { ParishHeader } from "@/components/layout/ParishHeader";
import { TabBar } from "@/components/layout/TabBar";

export default async function FielLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionForPage();

  return (
    <div className="min-h-dvh bg-cream-100 pb-20">
      <ParishHeader parishName={session.membership?.parishName ?? "Sem comunidade ativa"} />
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <TabBar />
    </div>
  );
}
