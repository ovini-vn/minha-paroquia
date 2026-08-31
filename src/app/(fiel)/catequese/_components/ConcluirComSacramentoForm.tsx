"use client";

import { useActionState } from "react";
import { Award } from "lucide-react";
import { concluirComSacramentoAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";

const initialState: ActionState = {};

const TIPOS = ["batismo", "primeira_eucaristia", "crisma", "matrimonio", "outro"] as const;

/**
 * O fim da caminhada: registrar o sacramento recebido.
 *
 * O registro pende do catequizando, e NÃO de uma conta de usuário — a
 * criança que faz a Primeira Eucaristia tem sete anos e não usa o
 * aplicativo. Foi isso que destravou o certificado: antes, o app não tinha
 * onde guardar o sacramento de quem a catequese acompanha.
 *
 * Relançar o mesmo tipo CORRIGE em vez de duplicar: duas primeiras
 * eucaristias na ficha seriam erro de registro, e o certificado sairia com a
 * data errada.
 */
export function ConcluirComSacramentoForm({
  enrollmentId,
  tipoSugerido,
}: {
  enrollmentId: string;
  /** O sacramento para o qual a turma caminha, quando dá para deduzir. */
  tipoSugerido?: string;
}) {
  const [state, formAction, pending] = useActionState(concluirComSacramentoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
          <label htmlFor="sac-type" className="text-sm font-medium text-muted">
            Sacramento recebido
          </label>
          <select
            id="sac-type"
            name="type"
            required
            defaultValue={tipoSugerido ?? "primeira_eucaristia"}
            className={INPUT_CLASSES}
          >
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {SACRAMENT_TYPE_LABELS[tipo]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sac-date" className="text-sm font-medium text-muted">
            Data
          </label>
          <input id="sac-date" name="date" type="date" required className={INPUT_CLASSES} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sac-location" className="text-sm font-medium text-muted">
          Local (opcional)
        </label>
        <input
          id="sac-location"
          name="location"
          className={INPUT_CLASSES}
          placeholder="Ex.: Igreja Matriz"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sac-note" className="text-sm font-medium text-muted">
          Livro, folha e número (opcional)
        </label>
        {/* É o que a paróquia realmente registra e o que o certificado
            precisa citar. Fica em texto livre porque cada livro é numerado
            do seu jeito. */}
        <input
          id="sac-note"
          name="note"
          className={INPUT_CLASSES}
          placeholder="Ex.: Livro 12, folha 43, nº 118"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Award className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
          {pending ? "Registrando..." : "Registrar sacramento"}
        </Button>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
      </div>
    </form>
  );
}
