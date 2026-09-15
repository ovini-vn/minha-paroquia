import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listPriests } from "@/server/modules/priests/service";
import { apagarSacerdoteAction } from "@/server/actions/sacerdote-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { nomeDoSacerdote } from "@/lib/sacerdote";
import { SacerdoteSemContaForm } from "../SacerdoteSemContaForm";

export const metadata: Metadata = { title: "Sacerdotes" };

/**
 * Quem são os sacerdotes da paróquia — a lista que já existia no índice do
 * painel, agora com endereço próprio.
 *
 * A tela da agenda de um sacerdote sem conta (`/painel/sacerdotes/<id>`)
 * existia desde antes; só faltava esta, e quem chegava naquela vinha de um
 * cartão perdido no meio do índice.
 */
export default async function SacerdotesPage() {
  const session = await requirePermissionForPage(PERMISSIONS.INVITATIONS_CREATE);
  if (!session.membership) return null;

  const priests = await listPriests(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sacerdotes"
        description="Quem celebra e atende nesta paróquia. Aparece para o fiel em “Falar com um sacerdote”."
      />

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Cadastrados
        </Eyebrow>
        {priests.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum sacerdote cadastrado ainda. Quem usa o aplicativo cria a conta, escolhe esta
            paróquia, e você muda o papel dele para &ldquo;Sacerdote&rdquo; em Membros e papéis.
            Quem não usa, cadastre ao fim desta página.
          </p>
        ) : (
          <Card>
            <ul className="flex flex-col gap-3">
              {priests.map((priest) => (
                <li key={priest.id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    {nomeDoSacerdote(priest)} <Badge>{priest.title}</Badge>
                    {/*
                      Quem NÃO usa o app se reconhece na lista, e é a informação
                      que muda o que a secretaria faz: a agenda dele não vai
                      aparecer sozinha, alguém tem de marcar por telefone.
                    */}
                    {priest.userId ? (
                      <span className="text-xs text-muted">
                        Define a própria agenda em &ldquo;Minha disponibilidade&rdquo;
                      </span>
                    ) : (
                      <Badge tone="muted">Não usa o app</Badge>
                    )}
                  </div>

                  {/*
                    A agenda dele tem tela própria, e esta lista só aponta.
                    Caixas e lista de janelas aqui dentro espremeriam as duas
                    coisas numa linha que já carrega nome, cargo e tarja.
                  */}
                  {!priest.userId && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <LinkButton
                        href={`/painel/sacerdotes/${priest.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        Horários e o que atende
                      </LinkButton>
                      {/* Formulário separado do link: apagar por engano ao
                          mirar no botão ao lado é o acidente que a separação
                          evita. */}
                      <form action={apagarSacerdoteAction}>
                        <input type="hidden" name="id" value={priest.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Remover
                        </Button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <Card>
        <Eyebrow tone="accent" className="mb-3">
          Sacerdote que não usa o aplicativo
        </Eyebrow>
        <SacerdoteSemContaForm />
      </Card>
    </div>
  );
}
