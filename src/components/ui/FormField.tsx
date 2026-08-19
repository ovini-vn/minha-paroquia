import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function FormField({ label, error, id, className, ...props }: FormFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-ink-900 outline-none transition-colors focus:border-terracotta-500",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
