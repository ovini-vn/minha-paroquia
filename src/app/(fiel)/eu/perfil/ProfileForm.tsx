"use client";

import { useActionState } from "react";
import { updateProfileAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { hojeEmBrasilia } from "@/lib/brasilia";

const initialState: ActionState = {};

type ProfileFormProps = {
  fullName: string;
  phone: string;
  birthDate: string;
  photoUrl: string;
  compartilhaDatas: boolean;
};

export function ProfileForm({
  fullName,
  phone,
  birthDate,
  photoUrl,
  compartilhaDatas,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-muted">
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={fullName}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-muted">
          Telefone (opcional)
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={phone}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="birthDate" className="text-sm font-medium text-muted">
          Data de nascimento (opcional)
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          max={hojeEmBrasilia()}
          defaultValue={birthDate}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="photoUrl" className="text-sm font-medium text-muted">
          URL da foto (opcional)
        </label>
        <input
          id="photoUrl"
          name="photoUrl"
          type="url"
          defaultValue={photoUrl}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      {/*
        O consentimento fica JUNTO das datas, e não numa tela de privacidade.

        É aqui que a pessoa acabou de digitar o nascimento — é aqui que a
        pergunta "quem pode ver isto?" tem sentido. Numa aba separada de
        ajustes, ela seria respondida por quem já esqueceu o que preencheu.

        Desmarcado por padrão: a política publicada promete que um fiel não
        alcança dados de outro, e essa promessa foi feita a quem já entrou.
      */}
      <div className="mt-1 rounded-lg border border-border bg-sunken p-3.5">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            name="compartilhaDatas"
            value="sim"
            defaultChecked={compartilhaDatas}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--color-primary))]"
          />
          <span>
            <span className="block text-[14px] font-medium text-foreground">
              Deixar a comunidade rezar por mim nas minhas datas
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-muted">
              Seu nome e o dia aparecem em &ldquo;Esta semana na comunidade&rdquo;. Nos sacramentos
              a comunidade vê quantos anos completa — &ldquo;10 anos de casamento&rdquo;; no
              aniversário, a sua IDADE não aparece. Datas de dependentes nunca entram, e você pode
              desmarcar quando quiser.
            </span>
          </span>
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
