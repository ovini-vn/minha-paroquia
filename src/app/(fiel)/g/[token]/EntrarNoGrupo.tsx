"use client";

import { useActionState } from "react";
import { entrarPeloConviteAction, type GrupoActionState } from "@/server/actions/grupo-actions";
import { Button } from "@/components/ui/Button";

const inicial: GrupoActionState = {};

export function EntrarNoGrupo({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(entrarPeloConviteAction, inicial);
  return (
    <form action={acao} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar no grupo"}
      </Button>
      {estado.error && <p className="text-sm text-error">{estado.error}</p>}
    </form>
  );
}
