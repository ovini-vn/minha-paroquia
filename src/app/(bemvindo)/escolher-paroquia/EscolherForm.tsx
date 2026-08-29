"use client";

import { useActionState, useState } from "react";
import { Search, Church } from "lucide-react";
import { entrarNaParoquiaAction, type JoinState } from "@/server/actions/onboarding-actions";
import { Button } from "@/components/ui/Button";

const initialState: JoinState = {};

type Paroquia = { id: string; name: string; local: string };

export function EscolherForm({
  paroquias,
  buscaAtual,
}: {
  paroquias: Paroquia[];
  buscaAtual: string;
}) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(entrarNaParoquiaAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      {/* Busca por GET: recarrega a lista pelo servidor, sem trazer todas as
          paróquias para o navegador. */}
      <form method="get" className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            name="busca"
            defaultValue={buscaAtual}
            placeholder="Nome da paróquia ou cidade"
            aria-label="Buscar paróquia"
            className="w-full rounded-xl border border-border bg-surface py-3 pl-9 pr-4 text-sm text-foreground"
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="parishId" value={escolhida ?? ""} />

        {paroquias.map((p) => {
          const ativa = escolhida === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setEscolhida(p.id)}
              aria-pressed={ativa}
              className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                ativa
                  ? "border-primary bg-primary-tint"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
                  ativa ? "bg-primary text-white dark:bg-primary-light" : "bg-primary-tint text-primary"
                }`}
              >
                <Church className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-medium text-foreground">{p.name}</span>
                {p.local && <span className="mt-0.5 block text-[12.5px] text-muted">{p.local}</span>}
              </span>
            </button>
          );
        })}

        {state.error && <p className="text-sm text-error">{state.error}</p>}

        {escolhida && (
          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? "Entrando…" : "Entrar nesta paróquia"}
          </Button>
        )}
      </form>
    </div>
  );
}
