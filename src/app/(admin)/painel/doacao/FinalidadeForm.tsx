"use client";

import { useActionState } from "react";
import { salvarFinalidadeAction, type DoacaoState } from "@/server/actions/doacao-actions";
import { Button } from "@/components/ui/Button";
import { ICONES_DE_DOACAO } from "@/lib/doacao";

const initialState: DoacaoState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

/** Serve para criar e para editar: com `id`, a ação atualiza em vez de criar. */
export function FinalidadeForm({
  id = "",
  title = "",
  description = "",
  icon = "igreja",
  finalidadeId = "",
  finalidades = [],
}: {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  finalidadeId?: string | null;
  /** As finalidades de contribuição, cadastradas em Financeiro. */
  finalidades?: { id: string; nome: string }[];
}) {
  const [state, formAction, pending] = useActionState(salvarFinalidadeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`fin-title-${id}`} className="text-sm font-medium text-muted">
            Título
          </label>
          <input
            id={`fin-title-${id}`}
            name="title"
            required
            maxLength={80}
            defaultValue={title}
            placeholder="Manutenção da Igreja"
            className={campo}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`fin-icon-${id}`} className="text-sm font-medium text-muted">
            Ícone
          </label>
          <select id={`fin-icon-${id}`} name="icon" defaultValue={icon} className={campo}>
            {Object.entries(ICONES_DE_DOACAO).map(([chave, { rotulo }]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`fin-desc-${id}`} className="text-sm font-medium text-muted">
          Onde essa oferta ajuda
        </label>
        <textarea
          id={`fin-desc-${id}`}
          name="description"
          required
          rows={2}
          maxLength={400}
          defaultValue={description}
          placeholder="Ajuda na manutenção, conservação e melhorias dos espaços da nossa paróquia."
          className={campo}
        />
      </div>

      {finalidades.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`fin-para-${id}`} className="text-sm font-medium text-muted">
            Caminho para contribuir (opcional)
          </label>
          <select
            id={`fin-para-${id}`}
            name="finalidadeId"
            defaultValue={finalidadeId ?? ""}
            className={campo}
          >
            <option value="">Nenhum — este cartão só explica</option>
            {finalidades.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <p className="text-[12px] leading-relaxed text-muted">
            Escolhendo uma finalidade, o cartão inteiro vira um caminho para contribuir. Em branco,
            ele continua sendo só a explicação de onde a oferta ajuda.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvando..." : id ? "Salvar alterações" : "Adicionar finalidade"}
        </Button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      </div>
    </form>
  );
}
