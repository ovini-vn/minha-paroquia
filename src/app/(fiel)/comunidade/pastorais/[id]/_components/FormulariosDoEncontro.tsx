"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  criarEncontroAction,
  editarEncontroAction,
  type GrupoActionState,
} from "@/server/actions/grupo-actions";
import { Button } from "@/components/ui/Button";
import { CamposDoEncontro, type ValoresDoEncontro } from "./CamposDoEncontro";

const inicial: GrupoActionState = {};

/** Incluir um encontro avulso — o que não veio no cronograma colado. */
export function NovoEncontroForm({ groupId }: { groupId: string }) {
  const [estado, acao, pendente] = useActionState(criarEncontroAction, inicial);
  const form = useRef<HTMLFormElement>(null);
  // A chave muda a cada inclusão bem-sucedida: os campos voltam ao começo
  // sem que o formulário precise saber o que cada um guardava.
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      setRodada((r) => r + 1);
    }
  }, [estado]);

  return (
    <form ref={form} action={acao} className="flex flex-col gap-3.5">
      <input type="hidden" name="groupId" value={groupId} />
      <CamposDoEncontro key={rodada} id={`novo-${rodada}`} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Incluindo…" : "Incluir no cronograma"}
        </Button>
        {estado.ok && <p className="text-sm text-success">{estado.ok}</p>}
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

/**
 * Corrigir um encontro — e é aqui que se põe quem prega no domingo.
 *
 * Fechado por padrão, como na chamada da catequese: a lista existe para ser
 * lida, e um formulário aberto em cada linha viraria uma parede. Apagar
 * fica dentro do formulário, longe de "Salvar", para não sair por engano.
 */
export function EditarEncontroForm({
  groupId,
  encontroId,
  valores,
}: {
  groupId: string;
  encontroId: string;
  valores: ValoresDoEncontro;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(editarEncontroAction, inicial);

  useEffect(() => {
    if (estado.ok) setAberto(false);
  }, [estado]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="alvo-de-toque inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-muted transition-colors hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {valores.pregador ? "Editar" : "Editar · pôr quem prega"}
      </button>
    );
  }

  return (
    <form action={acao} className="mt-2 flex w-full flex-col gap-3.5 rounded-lg bg-sunken p-3.5">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="encontroId" value={encontroId} />
      <CamposDoEncontro id={encontroId} valores={valores} />

      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <button
          type="submit"
          name="apagar"
          value="sim"
          formNoValidate
          className="alvo-de-toque ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-muted transition-colors hover:text-error"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          Apagar encontro
        </button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}
