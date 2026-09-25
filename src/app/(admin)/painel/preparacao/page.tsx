import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  CAMINHO_DO_SACRAMENTO,
  NOME_DA_PREPARACAO,
  SACRAMENTOS_COM_PREPARACAO,
  preparacoesDaParoquia,
} from "@/server/modules/preparacao/service";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Typography";
import { PreparacaoForm } from "./PreparacaoForm";

export const metadata: Metadata = { title: "Preparação dos sacramentos" };

/**
 * O que a secretaria responde dez vezes por semana no balcão, escrito uma
 * vez: como marcar um batismo ou um casamento nesta paróquia.
 */
export default async function PreparacaoDoPainelPage() {
  const session = await requirePermissionForPage(PERMISSIONS.SACRAMENTS_VALIDATE);
  if (!session.membership) return null;
  const existentes = await preparacoesDaParoquia(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13.5px] leading-relaxed text-muted">
        A família encontra isto no app, em Minha Caminhada e na busca, e vai marcando os documentos conforme junta.
        Nada de valores aqui.
      </p>
      {SACRAMENTOS_COM_PREPARACAO.map((tipo) => {
        const atual = existentes.find((p) => p.tipo === tipo);
        return (
          <section key={tipo}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Eyebrow tone="accent">{NOME_DA_PREPARACAO[tipo]}</Eyebrow>
              {atual && (
                <Link
                  href={`/preparacao/${CAMINHO_DO_SACRAMENTO[tipo]}`}
                  className="inline-flex items-center gap-1 text-[13px] text-primary underline"
                >
                  Ver como a família vê
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                </Link>
              )}
            </div>
            <Card className="p-4">
              <PreparacaoForm
                tipo={tipo}
                nome={NOME_DA_PREPARACAO[tipo]}
                orientacao={atual?.orientacao ?? ""}
                documentos={atual?.documentos ?? []}
                encontros={atual?.encontros ?? ""}
              />
            </Card>
          </section>
        );
      })}
    </div>
  );
}
