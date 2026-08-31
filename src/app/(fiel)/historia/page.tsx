import type { Metadata } from "next";
import { Landmark, Phone } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getParish } from "@/server/modules/parishes/service";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Typography";
import { TextoRico } from "@/components/ui/TextoRico";
import { Leitura } from "@/components/layout/DuasColunas";

/**
 * "Nossa História" — o memorial da paróquia.
 *
 * Vive no banco, por paróquia, e não no código: cada comunidade tem a sua,
 * e quem a escreve é a secretaria, não quem programa.
 */
export const metadata: Metadata = { title: "Nossa História" };

export default async function HistoriaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Landmark}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para conhecer a história dela."
      />
    );
  }

  const parish = await getParish(session.membership.parishId);
  if (!parish) return null;

  return (
    <Leitura className="flex flex-col">
      <PageHeader title="Nossa História" description={parish.name} />

      {/* A foto vem antes do texto: é o que a pessoa reconhece — a igreja
          por onde ela passa — e dá rosto ao que vem escrito depois. */}
      {parish.historiaFotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={parish.historiaFotoUrl}
          alt={`Igreja da ${parish.name}`}
          className="mb-5 w-full rounded-xl border border-border object-cover"
        />
      )}

      {parish.historia ? (
        <TextoRico texto={parish.historia} />
      ) : (
        <EmptyState
          icon={Landmark}
          title="A história ainda não foi escrita aqui"
          description="A secretaria pode cadastrá-la no Painel da Paróquia, em Nossa História."
        />
      )}

      {/* Quem acabou de ler a história costuma querer a próxima coisa:
          falar com a paróquia, ou saber quando ela está aberta. */}
      <div className="pt-7">
        <LinkButton href="/contato" className="w-full">
          <Phone className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
          Falar com a paróquia
        </LinkButton>
      </div>

      <div className="rule-gold my-7" />
    </Leitura>
  );
}
