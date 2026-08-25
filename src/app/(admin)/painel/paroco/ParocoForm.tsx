"use client";

import { useActionState } from "react";
import { salvarParocoAction, type ParocoState } from "@/server/actions/paroco-actions";
import { Button } from "@/components/ui/Button";
import { CampoDeImagem } from "@/components/ui/CampoDeImagem";

const initialState: ParocoState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

export function ParocoForm({
  nome,
  titulo,
  historia,
  fotoUrl,
  nomeDaConta,
  podeEnviarArquivo,
  motivoIndisponivel,
}: {
  nome: string;
  titulo: string;
  historia: string;
  fotoUrl: string;
  /** Nome de quem tem o papel de Pároco, se alguém tiver conta. */
  nomeDaConta: string | null;
  podeEnviarArquivo: boolean;
  motivoIndisponivel: string;
}) {
  const [state, formAction, pending] = useActionState(salvarParocoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="paroco-nome" className="text-sm font-medium text-muted">
          Nome do pároco
        </label>
        <input
          id="paroco-nome"
          name="parocoNome"
          maxLength={120}
          defaultValue={nome}
          placeholder={nomeDaConta ?? "Pe. Nome do Pároco"}
          className={campo}
        />
        <p className="text-[12px] leading-relaxed text-muted">
          {nomeDaConta ? (
            <>
              Preencha se o pároco não usa o aplicativo. Em branco, a tela mostra{" "}
              <strong className="font-semibold text-foreground">{nomeDaConta}</strong>, que é quem
              tem o papel de Pároco — e o fiel consegue pedir atendimento pela agenda.
            </>
          ) : (
            <>
              Ninguém tem o papel de Pároco nesta paróquia ainda. Enquanto isso, o nome digitado
              aqui é o que a comunidade vê.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="paroco-titulo" className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id="paroco-titulo"
          name="parocoTitulo"
          maxLength={80}
          defaultValue={titulo}
          placeholder="Pároco"
          className={campo}
        />
      </div>

      {fotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl}
          alt="Foto cadastrada do pároco"
          className="h-28 w-28 rounded-full border border-border object-cover"
        />
      )}

      <CampoDeImagem
        nomeDoArquivo="fotoFile"
        nomeDoLink="parocoFotoUrl"
        rotulo="Foto do pároco"
        linkAtual={fotoUrl}
        podeEnviarArquivo={podeEnviarArquivo}
        motivoIndisponivel={motivoIndisponivel}
        ajuda="Enviar um arquivo novo substitui a foto; apagar o link acima remove a foto."
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="paroco-historia" className="text-sm font-medium text-muted">
          Uma breve história do pároco
        </label>
        <textarea
          id="paroco-historia"
          name="parocoHistoria"
          rows={14}
          defaultValue={historia}
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
