"use client";

import { useActionState, useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { criarPrimeiroAcessoAction, type PrimeiroAcessoState } from "@/server/actions/diocese-actions";
import { Button } from "@/components/ui/Button";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: PrimeiroAcessoState = {};

/**
 * O primeiro acesso de quem vai administrar a paróquia.
 *
 * O link aparece na tela para ser copiado e mandado pelo WhatsApp: o e-mail
 * da plataforma ainda não tem domínio verificado, e esperar por ele travaria
 * a implantação — como travou a da Rocio.
 */
export function PrimeiroAcessoForm({ parishId }: { parishId: string }) {
  const [estado, acao, pendente] = useActionState(criarPrimeiroAcessoAction, inicial);
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <form action={acao} className="flex flex-col gap-3">
        <input type="hidden" name="parishId" value={parishId} />
        <FormField label="Nome completo" name="nome" required placeholder="Pe. Alessandro Bobinton" />
        <FormField label="E-mail" name="email" type="email" required placeholder="nome@exemplo.com" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="papel-primeiro-acesso" className="text-sm font-medium text-muted">
            Papel
          </label>
          <select id="papel-primeiro-acesso" name="papel" defaultValue="PAROCO" className={INPUT_CLASSES}>
            <option value="PAROCO">Pároco</option>
            <option value="ADMINISTRADOR_PAROQUIAL">Administração da paróquia</option>
            <option value="SECRETARIA">Secretaria</option>
          </select>
        </div>
        <Button type="submit" disabled={pendente} className="self-start">
          <KeyRound className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {pendente ? "Criando…" : "Criar acesso e gerar o link"}
        </Button>
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </form>

      {estado.link && (
        <div className="rounded-lg border border-success/40 bg-success-tint p-3.5 text-[13.5px] text-foreground">
          <p className="font-semibold">
            {estado.jaTinhaConta
              ? `${estado.nome} já tinha conta: o link serve para entrar com uma senha nova.`
              : `Acesso de ${estado.nome} criado.`}
          </p>
          <p className="mt-1 text-muted">
            Mande o link abaixo para a pessoa. Ela define a senha e já entra como responsável pela paróquia. Vale
            por uma semana e só pode ser usado uma vez.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <input readOnly value={estado.link} className={`${INPUT_CLASSES} font-mono text-[12.5px]`} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(estado.link ?? "");
                setCopiado(true);
              }}
            >
              <Copy className="h-4 w-4" strokeWidth={1.6} aria-hidden />
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
