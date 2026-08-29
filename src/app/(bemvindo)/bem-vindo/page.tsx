import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSessionForPage } from "@/server/auth/guards";
import { listActiveGroups } from "@/server/modules/pastorais/service";
import { getPublicVapidKey } from "@/server/modules/push/service";
import { getLiturgicalSeason } from "@/lib/liturgical-season";
import { Passos } from "./Passos";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function BemVindoPage() {
  const session = await requireSessionForPage();

  // Já passou por aqui: não repete. Também protege contra alguém digitar a
  // URL depois — a tela não tem saída de navegação.
  if (session.onboardedAt) redirect("/inicio");

  // Sem paróquia não há o que apresentar; a tela de convite cuida disso.
  if (!session.membership) redirect("/inicio");

  const pastorais = await listActiveGroups(session.membership.parishId);

  return (
    <Passos
      primeiroNome={session.fullName.split(" ")[0] ?? ""}
      parishName={session.membership.parishName}
      vapidPublicKey={getPublicVapidKey()}
      fontScale={session.fontScale}
      themePreference={session.themePreference}
      nomeDoTempo={getLiturgicalSeason(new Date()).name}
      pastorais={pastorais.slice(0, 6).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      }))}
    />
  );
}
