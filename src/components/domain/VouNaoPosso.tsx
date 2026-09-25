"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import {
  responderEncontroAction,
  responderEventoAction,
  type RespostaState,
} from "@/server/actions/compromisso-actions";
import { cn } from "@/lib/cn";

/**
 * "Vou" ou "não posso" — um toque, e a coordenação sabe quantos vêm.
 *
 * A resposta atual fica marcada, e trocar é tocar no outro. Não há
 * "talvez": quem não sabe ainda simplesmente não responde.
 */
export function VouNaoPosso({
  alvo,
  alvoId,
  vaiAtual,
}: {
  alvo: "encontro" | "evento";
  alvoId: string;
  vaiAtual: boolean | null;
}) {
  const acaoDoAlvo = alvo === "encontro" ? responderEncontroAction : responderEventoAction;
  const [estado, acao, pendente] = useActionState(acaoDoAlvo, { vai: vaiAtual ?? undefined } as RespostaState);
  const vai = estado.vai ?? vaiAtual;

  const botao = (valor: "sim" | "nao", rotulo: string, marcado: boolean, Icone: typeof Check) => (
    <button
      type="submit"
      name="vai"
      value={valor}
      disabled={pendente}
      aria-pressed={marcado}
      className={cn(
        "alvo-de-toque inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
        marcado
          ? valor === "sim"
            ? "border-success bg-success text-white"
            : "border-border-strong bg-sunken text-foreground"
          : "border-border-strong text-foreground hover:border-primary",
      )}
    >
      <Icone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {rotulo}
    </button>
  );

  return (
    <form action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="alvoId" value={alvoId} />
      {botao("sim", "Vou", vai === true, Check)}
      {botao("nao", "Não posso", vai === false, X)}
      {estado.error && <span className="text-[12.5px] text-error">{estado.error}</span>}
    </form>
  );
}
