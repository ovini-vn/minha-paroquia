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

/*
 * Anel de foco visível.
 *
 * `focus-visible` e não `focus`: o navegador só o acende para quem chegou
 * por teclado. Com `focus` puro, todo clique de mouse deixaria um anel
 * aceso, e a primeira reação de quem desenha é remover o anel de novo — que
 * é como se perde a acessibilidade.
 *
 * O `ring-offset-background` cria uma folga da cor do fundo entre o botão e
 * o anel. Sem ela, no botão primário o anel roxo encostaria no fundo roxo
 * do próprio botão e sumiria — justamente no botão mais usado do app.
 *
 * A cor do anel acompanha o tempo litúrgico, porque `primary` é um token
 * que muda com ele.
 */
const FOCO_CLASSES =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 " +
  FOCO_CLASSES;

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
