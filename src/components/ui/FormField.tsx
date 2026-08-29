import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /**
   * Controle desenhado DENTRO do campo, encostado à direita — hoje só o
   * "mostrar senha" usa. Fica aqui, e não em cada formulário, para o rótulo,
   * a dica e a mensagem de erro continuarem escritos num lugar só.
   */
  acessorio?: ReactNode;
};

/** Estilo de campo compartilhado — use nos <select>/<textarea> soltos também. */
export const INPUT_CLASSES =
  "w-full rounded-md border border-border-strong bg-surface px-3.5 py-3 text-[14.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-[3px] focus:ring-primary-tint";

export function FormField({
  label,
  error,
  hint,
  id,
  className,
  acessorio,
  ...props
}: FormFieldProps) {
  const inputId = id ?? props.name;
  // `ReactNode` inclui número, e `acessorio && ...` renderizaria um "0" solto
  // na tela se alguém passasse zero. O booleano fecha esse caminho.
  const temAcessorio = Boolean(acessorio);
  return (
    <div className="mb-3.5">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            INPUT_CLASSES,
            // Abre espaço para o acessório não sentar em cima do texto
            // digitado — senha longa chega até a borda.
            temAcessorio && "pr-12",
            error && "border-error focus:border-error",
            className,
          )}
          {...props}
        />
        {temAcessorio && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-1.5">{acessorio}</span>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}
