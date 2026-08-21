"use client";

import { useActionState, useState } from "react";
import { UserPlus, Link2, Phone } from "lucide-react";
import {
  createParishPersonAction,
  linkParishPersonAction,
  removeParishPersonAction,
  type PersonActionState,
} from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const initialState: PersonActionState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

export type Pessoa = {
  id: string;
  fullName: string;
  birthDate: Date | null;
  guardianName: string | null;
  guardianPhone: string | null;
  matriculas: number;
};

type Conta = { id: string; fullName: string };

function Cadastrar() {
  const [state, formAction, pending] = useActionState(createParishPersonAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-fullName" className="text-sm font-medium text-muted">
          Nome do catequizando
        </label>
        <input id="p-fullName" name="fullName" required className={campo} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-birthDate" className="text-sm font-medium text-muted">
          Nascimento (opcional)
        </label>
        <input
          id="p-birthDate"
          name="birthDate"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          className={campo}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-guardianName" className="text-sm font-medium text-muted">
          Responsável
        </label>
        <input id="p-guardianName" name="guardianName" placeholder="Nome do pai/mãe" className={campo} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-guardianPhone" className="text-sm font-medium text-muted">
          Telefone
        </label>
        <input id="p-guardianPhone" name="guardianPhone" placeholder="(43) 9…" className={campo} />
      </div>
      <Button type="submit" disabled={pending}>
        <UserPlus className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
        {pending ? "Cadastrando…" : "Cadastrar"}
      </Button>
      {state.error && <p className="w-full text-sm text-error">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-success">{state.ok}</p>}
    </form>
  );
}

function Vincular({ pessoa, contas }: { pessoa: Pessoa; contas: Conta[] }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(linkParishPersonAction, initialState);

  if (state.ok) return <p className="text-[12.5px] text-success">{state.ok}</p>;

  if (!aberto) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(true)}>
        <Link2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Vincular a uma conta
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="familyMemberId" value={pessoa.id} />
      <select name="userId" required className={`${campo} py-2`} defaultValue="">
        <option value="" disabled>
          Escolha o responsável…
        </option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.fullName}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Vinculando…" : "Vincular"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
        Cancelar
      </Button>
      {state.error && <p className="w-full text-right text-[12.5px] text-error">{state.error}</p>}
    </form>
  );
}

function Excluir({ pessoa }: { pessoa: Pessoa }) {
  const [confirmando, setConfirmando] = useState(false);
  const [state, formAction, pending] = useActionState(removeParishPersonAction, initialState);

  if (state.ok) return <p className="text-[12.5px] text-success">{state.ok}</p>;

  if (!confirmando) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
        Excluir
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="familyMemberId" value={pessoa.id} />
      <p className="text-right text-[12.5px] text-muted">
        Excluir o cadastro de {pessoa.fullName}?
      </p>
      {state.error && <p className="text-right text-[12.5px] text-error">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Excluindo…" : "Sim, excluir"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Cadastro de catequizando que não usa o app.
 *
 * A lista mostra só quem AINDA não foi assumido por uma conta: assim que
 * alguém é vinculado, o cadastro sai daqui e passa a viver em "Minha
 * família" do responsável, com o histórico intacto.
 */
export function ParishPeoplePanel({ pessoas, contas }: { pessoas: Pessoa[]; contas: Conta[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Cadastrar />

      {pessoas.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-[12.5px] text-muted">
            Cadastrados pela secretaria, ainda sem conta no app vinculada:
          </p>
          <div className="flex flex-col">
            {pessoas.map((pessoa) => (
              <div
                key={pessoa.id}
                className="flex flex-wrap items-center gap-2 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-foreground">{pessoa.fullName}</p>
                  {(pessoa.guardianName || pessoa.guardianPhone) && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                      <Phone className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                      {[pessoa.guardianName, pessoa.guardianPhone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {pessoa.matriculas > 0 && (
                  <Badge tone="success">
                    {pessoa.matriculas} {pessoa.matriculas === 1 ? "turma" : "turmas"}
                  </Badge>
                )}
                <Vincular pessoa={pessoa} contas={contas} />
                <Excluir pessoa={pessoa} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
