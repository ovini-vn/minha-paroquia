import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Estilo de campo compartilhado — use nos <select>/<textarea> soltos também. */
export const INPUT_CLASSES =
  "w-full rounded-md border border-border-strong bg-surface px-3.5 py-3 text-[14.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-[3px] focus:ring-primary-tint";

export function FormField({ label, error, hint, id, className, ...props }: FormFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="mb-3.5">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(INPUT_CLASSES, error && "border-error focus:border-error", className)}
        {...props}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}
