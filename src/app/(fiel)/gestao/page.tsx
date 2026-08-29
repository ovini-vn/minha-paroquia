import type { Metadata } from "next";
import { LayoutDashboard, BookOpen, Landmark, Crown, Flag, Settings } from "lucide-react";
import { requireManagementPage } from "@/server/auth/management";
import { Card } from "@/components/ui/Card";
import { RowLink } from "@/components/ui/RowLink";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";

/**
 * Porta única do que NÃO é vida pessoal: o trabalho da paróquia e o
 * acompanhamento acima dela.
 *
 * Antes tudo isso morava na aba "Eu", misturado com atendimentos, família e
 * dízimo — duas coisas de natureza diferente no mesmo lugar. "Eu" voltou a
 * ser só quem eu sou nesta comunidade.
 *
 * Quem tem o painel da paróquia normalmente entra direto nele pelo
 * cabeçalho; esta página é o caminho de quem NÃO tem — a catequista, que só
 * acompanha turmas, e o bispo, que pode não ter paróquia nenhuma.
 */
export const metadata: Metadata = { title: "Gestão" };

export default async function GestaoPage() {
  const { session, acesso } = await requireManagementPage();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Gestão"
        description="O trabalho da comunidade, separado da sua vida pessoal no app."
      />

      {(acesso.parishPanel || acesso.catequese) && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Na paróquia
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {acesso.parishPanel && (
              <RowLink
                href="/painel"
                icon={LayoutDashboard}
                title="Painel da paróquia"
                subtitle="Avisos, missas, eventos, catequese e convites"
              />
            )}
            {acesso.catequese && (
              <RowLink
                href="/catequese"
                icon={BookOpen}
                title="Catequese"
                subtitle="Turmas que acompanho"
              />
            )}
          </Card>
        </section>
      )}

      {(acesso.national || acesso.provinces || acesso.dioceses || acesso.platform) && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Acompanhamento
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {acesso.national && (
              <RowLink
                href="/nacional"
                icon={Flag}
                title="Visão nacional"
                subtitle="Províncias e dioceses do país"
              />
            )}
            {session.provinces.map((province) => (
              <RowLink
                key={province.id}
                href={`/provincia/${province.id}`}
                icon={Crown}
                title={province.name}
                subtitle="Província eclesiástica"
              />
            ))}
            {acesso.dioceses && (
              <RowLink
                href="/diocese"
                icon={Landmark}
                title={session.dioceses.length === 1 ? session.dioceses[0]!.name : "Dioceses"}
                subtitle="Visão do conjunto das paróquias"
              />
            )}
            {acesso.platform && (
              <>
                <RowLink
                  href="/plataforma/dioceses"
                  icon={Settings}
                  title="Dioceses e paróquias"
                  subtitle="Administração da plataforma"
                />
                <RowLink
                  href="/plataforma/estrutura"
                  icon={Settings}
                  title="Estrutura eclesiástica"
                  subtitle="Províncias, sedes e acesso nacional"
                />
              </>
            )}
          </Card>
        </section>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
