"use client";

import { useActionState } from "react";
import { upsertVolunteerProfileAction, type ActionState } from "@/server/actions/volunteering-actions";
import { Button } from "@/components/ui/Button";
import { TIME_AREA_LABELS, TALENT_LABELS, SERVICE_AREA_LABELS } from "@/lib/servir-labels";

const initialState: ActionState = {};

type ExistingProfile = {
  hasTime: boolean;
  timeAreas: string[];
  hasTalent: boolean;
  talents: string[];
  wantsToServe: boolean;
  serviceAreas: string[];
  availabilityNote: string | null;
  freeText: string | null;
} | null;

function CheckboxGroup({
  legend,
  checkboxName,
  name,
  options,
  defaultChecked,
  defaultValues,
}: {
  legend: string;
  checkboxName: string;
  name: string;
  options: Record<string, string>;
  defaultChecked: boolean;
  defaultValues: string[];
}) {
  return (
    <fieldset className="rounded-xl border border-terracotta-100 p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-ink-900">
        <input type="checkbox" name={checkboxName} defaultChecked={defaultChecked} />
        {legend}
      </label>
      <div className="mt-3 flex flex-wrap gap-3">
        {Object.entries(options).map(([value, label]) => (
          <label key={value} className="flex items-center gap-1.5 text-sm text-ink-700">
            <input type="checkbox" name={name} value={value} defaultChecked={defaultValues.includes(value)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VolunteerProfileForm({ existing }: { existing: ExistingProfile }) {
  const [state, formAction, pending] = useActionState(upsertVolunteerProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CheckboxGroup
        legend="Tenho tempo"
        checkboxName="hasTime"
        name="timeAreas"
        options={TIME_AREA_LABELS}
        defaultChecked={existing?.hasTime ?? false}
        defaultValues={existing?.timeAreas ?? []}
      />
      <CheckboxGroup
        legend="Tenho um talento"
        checkboxName="hasTalent"
        name="talents"
        options={TALENT_LABELS}
        defaultChecked={existing?.hasTalent ?? false}
        defaultValues={existing?.talents ?? []}
      />
      <CheckboxGroup
        legend="Quero servir"
        checkboxName="wantsToServe"
        name="serviceAreas"
        options={SERVICE_AREA_LABELS}
        defaultChecked={existing?.wantsToServe ?? false}
        defaultValues={existing?.serviceAreas ?? []}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="availabilityNote" className="text-sm font-medium text-ink-700">
          Quando costuma estar disponível?
        </label>
        <input
          id="availabilityNote"
          name="availabilityNote"
          placeholder="Ex.: sábado à tarde, disponível eventualmente"
          defaultValue={existing?.availabilityNote ?? ""}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="freeText" className="text-sm font-medium text-ink-700">
          Outra coisa que queira contar
        </label>
        <textarea
          id="freeText"
          name="freeText"
          rows={3}
          defaultValue={existing?.freeText ?? ""}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
