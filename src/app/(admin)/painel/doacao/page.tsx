import type { Metadata } from "next";
import { HandCoins } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParish } from "@/server/modules/parishes/service";
import {
  getDonationSettings,
  listPurposesForAdmin,
  listInitiativesForAdmin,
} from "@/server/modules/doacao/service";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { Card } from "@/components/ui/Card";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { EmptyState } from "@/components/ui/EmptyState";
import { DadosDeDoacaoForm } from "./DadosDeDoacaoForm";
import { FinalidadeForm } from "./FinalidadeForm";
import { listarFinalidades } from "@/server/modules/contribuicao/service";
import { IniciativaForm } from "./IniciativaForm";
import { AcoesDoItem, EtiquetaOculto } from "./ListaOrdenavel";

export const metadata: Metadata = { title: "Doação" };

export default async function DoacaoAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);
  if (!session.membership) return null;

  const parishId = session.membership.parishId;
  /*
   * Duas listas com nomes parecidos, e elas NÃO são a mesma coisa:
   * `finalidades` são os cartões de "Sua doação ajuda", que contam uma
   * história; `finalidadesDeContribuicao` são para onde o dinheiro vai, e
   * vivem em Financeiro. Ligar a iniciativa à primeira apontaria o caminho
   * de contribuir para um texto.
   */
  const [parish, settings, finalidades, iniciativas, finalidadesDeContribuicao] =
    await Promise.all([
      getParish(parishId),
      getDonationSettings(parishId),
      listPurposesForAdmin(parishId),
      listInitiativesForAdmin(parishId),
      listarFinalidades(parishId),
    ]);

  const podeEnviarArquivo = isUploadConfigured();
  const motivoIndisponivel = diagnosticoDoUpload();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doação"
        description="O que o fiel vê em Doação: onde a contribuição ajuda, o que a paróquia está realizando e a chave PIX."
      />

      <Card>
        <DadosDeDoacaoForm
          dados={{
            cnpj: parish?.cnpj ?? "",
            email: parish?.email ?? "",
            pixKey: settings?.pixKey ?? "",
            pixKeyType: settings?.pixKeyType ?? "",
            pixPayload: settings?.pixPayload ?? "",
            dizimoAtivo: settings?.dizimoAtivo ?? true,
            dizimoTitulo: settings?.dizimoTitulo ?? "",
            dizimoTexto: settings?.dizimoTexto ?? "",
            dizimoCtaLabel: settings?.dizimoCtaLabel ?? "",
            dizimoCtaTipo: settings?.dizimoCtaTipo ?? "",
            dizimoCtaValor: settings?.dizimoCtaValor ?? "",
          }}
        />
      </Card>

      <section>
        <Eyebrow tone="accent" className="mb-1">
          Sua doação ajuda
        </Eyebrow>
        <p className="mb-3 text-[12.5px] text-muted">
          Os cards que explicam para onde vai a contribuição, em geral.
        </p>

        {finalidades.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Nenhuma finalidade cadastrada"
            description="Crie a primeira abaixo — ela aparece na tela de Doação."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {finalidades.map((f, indice) => (
              <Card key={f.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-medium text-foreground">{f.title}</p>
                      <EtiquetaOculto ativo={f.active} />
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.description}</p>
                  </div>
                  <AcoesDoItem
                    tabela="finalidade"
                    id={f.id}
                    ativo={f.active}
                    primeiro={indice === 0}
                    ultimo={indice === finalidades.length - 1}
                  />
                </div>

                <details className="mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer text-[13px] text-primary">Editar</summary>
                  <div className="pt-3">
                    <FinalidadeForm
                      finalidadeId={f.finalidadeId}
                      finalidades={finalidadesDeContribuicao}
                      id={f.id}
                      title={f.title}
                      description={f.description}
                      icon={f.icon}
                    />
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-2.5">
          <p className="mb-3 font-serif text-lg font-semibold text-foreground">Nova finalidade</p>
          <FinalidadeForm finalidades={finalidadesDeContribuicao} />
        </Card>
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-1">
          O que estamos realizando
        </Eyebrow>
        <p className="mb-3 text-[12.5px] text-muted">
          As obras e ações em andamento, com período e imagem.
        </p>

        {iniciativas.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Nenhuma iniciativa cadastrada"
            description="Cadastre o que a paróquia está realizando agora."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {iniciativas.map((i, indice) => (
              <Card key={i.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-medium text-foreground">{i.title}</p>
                      <EtiquetaOculto ativo={i.active} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                      {i.description}
                    </p>
                  </div>
                  <AcoesDoItem
                    tabela="iniciativa"
                    id={i.id}
                    ativo={i.active}
                    primeiro={indice === 0}
                    ultimo={indice === iniciativas.length - 1}
                  />
                </div>

                <details className="mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer text-[13px] text-primary">Editar</summary>
                  <div className="pt-3">
                    <IniciativaForm
                      id={i.id}
                      title={i.title}
                      description={i.description}
                      icon={i.icon}
                      category={i.category}
                      imageUrl={i.imageUrl ?? ""}
                      finalidadeId={i.finalidadeId}
                      finalidades={finalidadesDeContribuicao}
                      startsOn={i.startsOn}
                      endsOn={i.endsOn}
                      podeEnviarArquivo={podeEnviarArquivo}
                      motivoIndisponivel={motivoIndisponivel}
                    />
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-2.5">
          <p className="mb-3 font-serif text-lg font-semibold text-foreground">Nova iniciativa</p>
          <IniciativaForm
            finalidades={finalidadesDeContribuicao}
            podeEnviarArquivo={podeEnviarArquivo}
            motivoIndisponivel={motivoIndisponivel}
          />
        </Card>
      </section>
    </div>
  );
}
