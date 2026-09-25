"use client";

import { useActionState, useState } from "react";
import { excluirMinhaContaAction, type ExclusaoState } from "@/server/actions/conta-actions";
import { INPUT_CLASSES } from "@/components/ui/FormField";

/**
 * Excluir a própria conta — fechado por padrão e com a palavra digitada.
 *
 * Diz antes, e por extenso, o que sai e o que fica: a pessoa decide
 * sabendo. Nada de "tem certeza?" genérico; o texto é a confirmação.
 */
export function ExcluirConta() {
  const [aberto, setAberto] = useState(false);
  const [estado, excluir, excluindo] = useActionState(excluirMinhaContaAction, {} as ExclusaoState);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="alvo-de-toque text-[13.5px] font-medium text-error underline"
      >
        Excluir minha conta
      </button>
    );
  }

  return (
    <form action={excluir} className="flex flex-col gap-3">
      <p className="text-[14px] font-semibold text-foreground">Excluir minha conta</p>
      <div className="text-[13px] leading-relaxed text-muted">
        <p>
          <strong className="text-foreground">Sai de vez:</strong> seu nome, e-mail, telefone, foto e data de
          nascimento; suas orações, reflexões, missas e confissões marcadas; pedidos de oração; grupos, respostas e
          disponibilidades. Você deixa a paróquia e não consegue mais entrar com esta conta.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Fica, sem o seu nome:</strong> os sacramentos registrados (a paróquia
          guarda o livro) e as contribuições já feitas (a prestação de contas não pode ter buraco).
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmacao" className="text-xs font-medium text-muted">
          Para confirmar, digite EXCLUIR
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          required
          autoComplete="off"
          autoCapitalize="characters"
          className={INPUT_CLASSES}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={excluindo}
          className="alvo-de-toque rounded-md bg-error px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {excluindo ? "Excluindo..." : "Excluir minha conta"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-[13.5px] text-muted underline">
          Desistir
        </button>
      </div>
      {estado.error && <p className="text-sm text-error">{estado.error}</p>}
    </form>
  );
}
