"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { gerarLinkDeNovaSenhaAction, type EstadoDoLink } from "@/server/actions/acesso-actions";
import { Button } from "@/components/ui/Button";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { Card } from "@/components/ui/Card";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { formatDateTime } from "@/lib/date";

type Membro = { id: string; nome: string; papel: string };

/**
 * Escolher a pessoa e receber o link para passar a ela.
 *
 * É uma LISTA, não um campo de e-mail digitado. Digitar abriria a porta
 * para gerar acesso a uma conta de fora da paróquia por engano ou de
 * propósito; a lista só contém membros ativos daqui.
 */
export function GerarLinkForm({ membros }: { membros: Membro[] }) {
  const [estado, acao, pendente] = useActionState<EstadoDoLink, FormData>(
    gerarLinkDeNovaSenhaAction,
    {},
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={acao} className="flex flex-col gap-3">
        <label htmlFor="userId" className="text-[13px] font-medium text-muted">
          De quem é a conta?
        </label>
        <select id="userId" name="userId" required defaultValue="" className={INPUT_CLASSES}>
          <option value="" disabled>
            Escolha uma pessoa…
          </option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} — {m.papel}
            </option>
          ))}
        </select>

        <Button type="submit" disabled={pendente} className="self-start">
          <KeyRound className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {pendente ? "Gerando…" : "Gerar link"}
        </Button>
      </form>

      {estado.erro && <p className="text-[13.5px] text-error">{estado.erro}</p>}

      {estado.gerado && (
        <Card className="border-gold/45 bg-gold/[0.07]">
          <p className="text-[14.5px] font-medium text-foreground">
            Link para {estado.gerado.nome}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Passe este endereço para a pessoa. Ao abrir, ela escolhe a nova senha — ninguém aqui
            fica sabendo qual é.
          </p>

          {/* Quebra em qualquer ponto: o link é longo e num celular ele
              estouraria a largura da tela. */}
          <p className="mt-3 break-all rounded-md bg-surface px-3 py-2.5 font-mono text-[12px] text-foreground">
            {estado.gerado.url}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <BotaoCopiar
              valor={estado.gerado.url}
              rotulo="Copiar link"
              rotuloCopiado="Copiado!"
            />
            <span className="text-[12.5px] text-muted">
              Vale até {formatDateTime(new Date(estado.gerado.expiraEm))}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
