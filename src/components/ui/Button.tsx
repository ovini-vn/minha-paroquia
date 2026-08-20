import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "secondary" | "gold";
type Size = "md" | "sm";

const GHOST_CLASSES =
  "border border-border-strong bg-surface text-foreground hover:border-primary hover:text-primary";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white shadow hover:bg-primary-hover",
  ghost: GHOST_CLASSES,
  /** Alias histórico de `ghost` — muitas telas já usam esse nome. */
  secondary: GHOST_CLASSES,
  // Contorno dourado: para ações especiais/litúrgicas, sem encher de dourado.
  gold: "border border-gold/45 bg-surface text-foreground hover:border-gold",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "px-5 py-3 text-sm",
  sm: "px-3.5 py-2 text-xs",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

/** Botão de ação/formulário — nunca use dentro de um <Link>, use <LinkButton> em vez disso. */
export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(BASE_CLASSES, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
};

/** Mesmo visual do Button, mas renderiza um <a> (via next/link) — evita aninhar <button> dentro de <a>. */
export function LinkButton({ variant = "primary", size = "md", className, href, ...props }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(BASE_CLASSES, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}
