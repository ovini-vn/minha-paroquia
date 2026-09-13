"use client";

import { useActionState, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  reiniciarOnboardingAction,
  type EstadoDoReinicio,
} from "@/server/actions/acesso-actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { INPUT_CLASSES } from "@/components/ui/FormField";

type Conta = {
  id: string;
  nome: string;
  email: string;
  jaViuAsBoasVindas: boolean;
  impedimentos: string[];
};

/**
 * Devolver alguém ao começo do onboarding.
 *
 * É uma LISTA, pelo mesmo motivo do link de nova senha: digitar um e-mail
 * abriria a porta para apagar o vínculo de alguém de fora da paróquia. A
 * lista só traz membros ativos daqui.
 *
 * Quem tem histórico aparece DESABILITADO, com o motivo ao lado, em vez de
 * sumir da lista. Sumir faria a pessoa procurar um nome que existe e não
 * aparece; dizer por que não pode responde a pergunta antes dela.
 *
 * Pede o nome digitado para confirmar. Não é "tem certeza?", que se clica
 * no automático: digitar obriga a olhar de quem é a conta — e esta ação
 * apaga o vínculo com a paróquia.
 */
export function ReiniciarForm({ contas }: { contas: Conta[] }) {
  const [estado, acao, pendente] = useActionState<EstadoDoReinicio, FormData>(
    reiniciarOnboardingAction,
    {},
  );
  const [escolhida, setEscolhida] = useState("");
  const [digitado, setDigitado] = useState("");

  const conta = contas.find((c) => c.id === escolhida) ?? null;
  const confere = conta !== null && digitado.trim() === conta.nome;

  return (
    <Card>
      <form action={acao} className="flex flex-col gap-3">
        <label htmlFor="reiniciar-userId" className="text-[13px] font-medium text-muted">
          De quem é a conta?
        </label>
        <select
          id="reiniciar-userId"
          name="userId"
          required
          value={escolhida}
          onChange={(e) => {
            setEscolhida(e.target.value);
            setDigitado("");
          }}
          className={INPUT_CLASSES}
        >
          <option value="" disabled>
            Escolha uma pessoa…
          </option>
          {contas.map((c) => (
            <option key={c.id} value={c.id} disabled={c.impedimentos.length > 0}>
              {c.nome} — {c.email}
              {c.impedimentos.length > 0
                ? ` (tem ${c.impedimentos.join(", ")})`
                : c.jaViuAsBoasVindas
                  ? ""
                  : " (já está no começo)"}
            </option>
          ))}
        </select>

        {conta && (
          <>
            <label htmlFor="reiniciar-nome" className="text-[13px] font-medium text-muted">
              Para confirmar, digite o nome: <strong className="text-foreground">{conta.nome}</strong>
            </label>
            <input
              id="reiniciar-nome"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              className={INPUT_CLASSES}
              placeholder={conta.nome}
              autoComplete="off"
            />
          </>
        )}

        <Button type="submit" disabled={!confere || pendente} className="self-start">
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {pendente ? "Reiniciando…" : "Reiniciar o cadastro"}
        </Button>
      </form>

      {estado.erro && <p className="mt-3 text-[13px] text-error">{estado.erro}</p>}
      {estado.ok && <p className="mt-3 text-[13px] text-primary">{estado.ok}</p>}
    </Card>
  );
}
