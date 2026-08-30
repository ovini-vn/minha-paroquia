"use client";

import { useActionState } from "react";
import { criarTemaAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

/**
 * Digitar um encontro do itinerário.
 *
 * O material vem em texto livre e generoso de propósito. Cada arquidiocese
 * escreve o seu de um jeito, e uma lista fechada aqui obrigaria a paróquia a
 * traduzir o material dela para o nosso vocabulário — que é como se garante
 * que ninguém preencha.
 *
 * Não há campo de ordem: o encontro entra no fim da lista, que é a sequência
 * em que a coordenação digita. Numerar à mão seria trabalho para resolver um
 * problema que não existe.
 */
export function CriarTemaForm({ itinerarioId }: { itinerarioId: string }) {
  const [state, formAction, pending] = useActionState(criarTemaAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="itinerarioId" value={itinerarioId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="titulo" className="text-sm font-medium text-muted">
          Tema do encontro
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          className={INPUT_CLASSES}
          placeholder="Ex.: Deus é Pai e nos criou por amor"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao" className="text-sm font-medium text-muted">
          Material do encontro (opcional)
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          className={INPUT_CLASSES}
          placeholder="O que este encontro trabalha, a página do livro, a leitura bíblica…"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Acrescentar encontro"}
        </Button>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
      </div>
    </form>
  );
}
