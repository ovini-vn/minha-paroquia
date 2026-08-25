"use client";

import { useActionState } from "react";
import { salvarParocoAction, type ParocoState } from "@/server/actions/paroco-actions";
import { Button } from "@/components/ui/Button";
import { CampoDeImagem } from "@/components/ui/CampoDeImagem";

const initialState: ParocoState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

export function ParocoForm({
  nome,
  title,
  bio,
  photoUrl,
  podeEnviarArquivo,
  motivoIndisponivel,
}: {
  nome: string;
  title: string;
  bio: string;
  photoUrl: string;
  podeEnviarArquivo: boolean;
  motivoIndisponivel: string;
}) {
  const [state, formAction, pending] = useActionState(salvarParocoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* O nome não se edita aqui: ele vem do cadastro da pessoa, e quem é o
          pároco vem do papel em Membros e papéis. */}
      <p className="text-sm text-muted">
        Pároco atual: <strong className="font-semibold text-foreground">{nome}</strong>
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="paroco-title" className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id="paroco-title"
          name="title"
          required
          maxLength={80}
          defaultValue={title}
          placeholder="Pároco"
          className={campo}
        />
      </div>

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="Foto cadastrada do pároco"
          className="h-28 w-28 rounded-full border border-border object-cover"
        />
      )}

      <CampoDeImagem
        nomeDoArquivo="fotoFile"
        nomeDoLink="photoUrl"
        rotulo="Foto do pároco"
        linkAtual={photoUrl}
        podeEnviarArquivo={podeEnviarArquivo}
        motivoIndisponivel={motivoIndisponivel}
        ajuda="Enviar um arquivo novo substitui a foto; apagar o link acima remove a foto."
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="paroco-bio" className="text-sm font-medium text-muted">
          Uma breve história do pároco
        </label>
        <textarea
          id="paroco-bio"
          name="bio"
          rows={14}
          defaultValue={bio}
          placeholder="Onde nasceu, quando foi ordenado, por onde passou, o que o trouxe até aqui…"
          className={`${campo} font-mono text-[13px] leading-relaxed`}
        />
        <p className="text-[12px] leading-relaxed text-muted">
          Aceita as mesmas marcações de Nossa História: <code># </code> para título,{" "}
          <code>## </code> para subtítulo, <code>- </code> para listas e <code>**negrito**</code>{" "}
          entre dois asteriscos.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
    </form>
  );
}
