"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ligarParagrafoAoTemaAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

/**
 * Ligar um parágrafo do Catecismo a um encontro do itinerário.
 *
 * Só o número. O texto o servidor busca no site do Vaticano e guarda o
 * trecho — pedir para a coordenação colar o texto seria pedir que ela
 * digitasse o Catecismo, com o erro de digitação que vem junto.
 */
export function LigarParagrafoForm({ temaId, itinerarioId }: { temaId: string; itinerarioId: string }) {
  const [state, formAction, pending] = useActionState(ligarParagrafoAoTemaAction, initialState);
  const campo = `paragrafo-${temaId}`;

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="temaId" value={temaId} />
      <input type="hidden" name="itinerarioId" value={itinerarioId} />
      <label htmlFor={campo} className="text-sm font-medium text-muted">
        Número do parágrafo
      </label>
      <div className="flex gap-2">
        <input
          id={campo}
          name="paragrafo"
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder="Ex.: 1324"
          className={`${INPUT_CLASSES} w-32`}
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Buscando…" : "Acrescentar"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <p className="text-[13px] leading-relaxed text-muted">
        Não sabe o número?{" "}
        <Link href="/catecismo" className="font-medium text-primary underline-offset-2 hover:underline">
          Procure no Catecismo
        </Link>
        .
      </p>
    </form>
  );
}
