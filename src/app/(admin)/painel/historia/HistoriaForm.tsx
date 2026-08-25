"use client";

import { useActionState } from "react";
import { salvarHistoriaAction, type HistoriaState } from "@/server/actions/historia-actions";
import { Button } from "@/components/ui/Button";

const initialState: HistoriaState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

export function HistoriaForm({
  historia,
  fotoUrl,
  podeEnviarArquivo,
  motivoIndisponivel,
}: {
  historia: string;
  fotoUrl: string;
  podeEnviarArquivo: boolean;
  motivoIndisponivel: string;
}) {
  const [state, formAction, pending] = useActionState(salvarHistoriaAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="historia-foto" className="text-sm font-medium text-muted">
          Foto atual da igreja
        </label>

        {fotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt="Foto cadastrada da igreja"
            className="max-h-52 w-full rounded-lg border border-border object-cover"
          />
        )}

        {podeEnviarArquivo ? (
          <input
            id="historia-foto"
            name="fotoFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className={`${campo} file:mr-3 file:rounded-md file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:text-sm file:text-primary`}
          />
        ) : (
          <p className="text-[12px] text-muted">
            O envio de arquivo não está disponível. Cole o link da foto abaixo.
            {motivoIndisponivel ? ` (${motivoIndisponivel})` : ""}
          </p>
        )}

        <input
          name="fotoUrl"
          type="url"
          defaultValue={fotoUrl}
          placeholder="https://..."
          aria-label="Link da foto da igreja"
          className={campo}
        />
        <p className="text-[12px] text-muted">
          Até 5 MB. Enviar um arquivo novo substitui a foto atual; apagar o link acima remove a foto.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="historia-texto" className="text-sm font-medium text-muted">
          A história da paróquia
        </label>
        {/* Uma caixa de texto grande, e não um editor: a secretaria cola o
            memorial pronto de uma vez. As marcações abaixo são as únicas
            que a tela do fiel entende. */}
        <textarea
          id="historia-texto"
          name="historia"
          rows={22}
          defaultValue={historia}
          placeholder="# Nossa História&#10;&#10;A paróquia nasceu em…"
          className={`${campo} font-mono text-[13px] leading-relaxed`}
        />
        <p className="text-[12px] leading-relaxed text-muted">
          Comece uma linha com <code># </code> para um título e <code>## </code> para um subtítulo.
          Use <code>- </code> para listas, <code>---</code> para uma linha divisória e{" "}
          <code>**negrito**</code> entre dois asteriscos. Endereços de internet viram links
          sozinhos.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar história"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
    </form>
  );
}
