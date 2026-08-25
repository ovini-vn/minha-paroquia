"use client";

import { useActionState } from "react";
import { salvarExpedienteAction, type ExpedienteState } from "@/server/actions/expediente-actions";
import { Button } from "@/components/ui/Button";
import { DIAS_DA_SEMANA, TURNOS, type Faixa } from "@/lib/expediente";
import { formatMinutes } from "@/lib/brasilia";

const initialState: ExpedienteState = {};

/** A semana começa na segunda, como num cartaz de horário na porta. */
const ORDEM = [1, 2, 3, 4, 5, 6, 0];

function valorDe(faixas: Faixa[], weekday: number, turno: number, campo: "opensAt" | "closesAt") {
  const doDia = faixas.filter((f) => f.weekday === weekday).sort((a, b) => a.opensAt - b.opensAt);
  const faixa = doDia[turno];
  return faixa ? formatMinutes(faixa[campo]) : "";
}

export function ExpedienteForm({ faixas }: { faixas: Faixa[] }) {
  const [state, formAction, pending] = useActionState(salvarExpedienteAction, initialState);

  const input =
    "w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-foreground";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {ORDEM.map((weekday) => (
          <div key={weekday} className="flex flex-col gap-2 border-b border-border pb-3 last:border-b-0">
            <p className="text-sm font-medium text-foreground">{DIAS_DA_SEMANA[weekday]}</p>
            {TURNOS.map((turno, indice) => (
              <div key={turno.id} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-muted">{turno.rotulo}</span>
                <input
                  type="time"
                  aria-label={`${DIAS_DA_SEMANA[weekday]}, ${turno.rotulo}, abre`}
                  name={`d${weekday}-${turno.id}-abre`}
                  defaultValue={valorDe(faixas, weekday, indice, "opensAt")}
                  className={input}
                />
                <span className="text-xs text-muted">às</span>
                <input
                  type="time"
                  aria-label={`${DIAS_DA_SEMANA[weekday]}, ${turno.rotulo}, fecha`}
                  name={`d${weekday}-${turno.id}-fecha`}
                  defaultValue={valorDe(faixas, weekday, indice, "closesAt")}
                  className={input}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Deixe em branco os dias e turnos em que a secretaria não atende. Quem fecha para o almoço
        preenche os dois turnos.
      </p>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar horários"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
    </form>
  );
}
