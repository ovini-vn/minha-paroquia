"use client";

import { useActionState } from "react";
import {
  createDioceseAction,
  createParishAction,
  assignDioceseMemberAction,
  type ActionState,
} from "@/server/actions/diocese-actions";
import { Button } from "@/components/ui/Button";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export function CreateDioceseForm() {
  const [state, formAction, pending] = useActionState(createDioceseAction, initialState);

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <FormField label="Nome da diocese" name="name" required placeholder="Diocese de Londrina" />
        <FormField label="UF" name="state" maxLength={2} placeholder="PR" className="uppercase" />
      </div>
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Diocese criada.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar diocese"}
      </Button>
    </form>
  );
}

/**
 * Abrir uma paróquia nova.
 *
 * Ela nasce vazia e sem ninguém: horários, história e pároco são
 * preenchidos no painel dela, por quem a administra. O primeiro acesso de
 * um pároco sem conta continua sendo o bootstrap — aqui é o caso de quem
 * já está no app e vai cuidar de mais uma.
 */
export function CreateParishForm({ dioceses }: { dioceses: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createParishAction, initialState);

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_110px]">
        <FormField
          label="Nome da paróquia"
          name="name"
          required
          placeholder="Paróquia Nossa Senhora do Rocio"
        />
        <FormField label="Cidade" name="city" required placeholder="Londrina" />
        <FormField label="UF" name="state" required maxLength={2} placeholder="PR" className="uppercase" />
      </div>
      {dioceses.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          <label htmlFor="parish-diocese" className="text-sm font-medium text-muted">
            Diocese (opcional)
          </label>
          <select id="parish-diocese" name="dioceseId" className={INPUT_CLASSES} defaultValue="">
            <option value="">Sem diocese por enquanto</option>
            {dioceses.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && (
        <p className="mb-3 text-sm text-success">
          Paróquia criada. Ela já aparece para quem escolhe paróquia no app.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar paróquia"}
      </Button>
    </form>
  );
}

export function AssignDioceseMemberForm({ dioceseId }: { dioceseId: string }) {
  const [state, formAction, pending] = useActionState(assignDioceseMemberAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="dioceseId" value={dioceseId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <FormField
          label="E-mail da pessoa"
          name="email"
          type="email"
          required
          placeholder="bispo@exemplo.com"
          hint="A pessoa precisa já ter conta no app."
        />
        <div className="mb-3.5">
          <label
            htmlFor={`role-${dioceseId}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
          >
            Função
          </label>
          <select id={`role-${dioceseId}`} name="role" className={INPUT_CLASSES}>
            <option value="BISPO">Bispo</option>
            <option value="ADMINISTRADOR_DIOCESANO">Administrador diocesano</option>
          </select>
        </div>
      </div>
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Vínculo criado.</p>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Vinculando..." : "Vincular"}
      </Button>
    </form>
  );
}
