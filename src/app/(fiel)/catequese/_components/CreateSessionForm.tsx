"use client";

import { useActionState } from "react";
import { createSessionAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export type TemaOferecido = { id: string; ordem: number; titulo: string };

/**
 * Criar o encontro e dizer o que foi dado.
 *
 * O tema vem de uma LISTA quando a turma segue um itinerário, e continua
 * sendo texto livre quando não segue. É a diferença entre a coordenação
 * conseguir comparar duas turmas e não conseguir: com campo aberto, duas
 * catequistas escrevem o mesmo tema de dois jeitos.
 *
 * O texto livre não morre por causa da lista. Ele vira o COMPLEMENTO — "e
 * fizemos a visita à capela" — e a saída para quem saiu do roteiro naquele
 * dia. Fechar o campo de vez seria a maneira mais rápida de a catequista
 * parar de preencher.
 */
export function CreateSessionForm({
  groupId,
  temas,
}: {
  groupId: string;
  temas: TemaOferecido[];
}) {
  const [state, formAction, pending] = useActionState(createSessionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-muted">
            Data do encontro
          </label>
          <input id="date" name="date" type="date" required className={INPUT_CLASSES} />
        </div>

        {temas.length > 0 && (
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label htmlFor="itinerarioTemaId" className="text-sm font-medium text-muted">
              Tema do itinerário
            </label>
            <select id="itinerarioTemaId" name="itinerarioTemaId" className={INPUT_CLASSES}>
              <option value="">Ainda não sei / fora do roteiro</option>
              {temas.map((tema) => (
                <option key={tema.id} value={tema.id}>
                  {tema.ordem}. {tema.titulo}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="topic" className="text-sm font-medium text-muted">
          {temas.length > 0 ? "Observações do encontro (opcional)" : "O que foi dado (opcional)"}
        </label>
        <input
          id="topic"
          name="topic"
          className={INPUT_CLASSES}
          placeholder={
            temas.length > 0 ? "Ex.: fizemos também a visita à capela" : "Ex.: Os sacramentos"
          }
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Novo encontro"}
        </Button>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
      </div>
    </form>
  );
}
