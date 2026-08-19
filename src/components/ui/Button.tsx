import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-terracotta-600 text-cream-50 hover:bg-terracotta-700",
  secondary: "bg-cream-100 text-ink-900 hover:bg-cream-200 border border-terracotta-100",
  ghost: "bg-transparent text-terracotta-700 hover:bg-terracotta-50",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Botão de ação/formulário — nunca use dentro de um <Link>, use <Button href="..."> em vez disso. */
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)} {...props} />;
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
};

/** Mesmo visual do Button, mas renderiza um <a> (via next/link) — evita aninhar <button> dentro de <a>. */
export function LinkButton({ variant = "primary", className, href, ...props }: LinkButtonProps) {
  return <Link href={href} className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)} {...props} />;
}
