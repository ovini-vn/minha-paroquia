import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Rótulo de categoria — pequeno, caixa alta, com letter-spacing. É o único
 * lugar onde usamos uppercase (briefing, seção 5): nunca em texto corrido.
 */
export function Eyebrow({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "accent";
}) {
  return (
    <p
      className={cn(
        "text-[10.5px] font-semibold uppercase tracking-eyebrow",
        tone === "accent" ? "text-primary" : "text-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Cabeçalho de seção: rótulo + título serifado, com uma ação opcional à
 * direita ("Ver todos"). Mantém a mesma hierarquia em todas as telas.
 */
export function SectionTitle({
  eyebrow,
  title,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <Eyebrow tone="accent">{eyebrow}</Eyebrow>
        <h2 className="mt-1 font-serif text-[22px] font-semibold leading-tight text-foreground">{title}</h2>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 rounded-full border border-border-strong px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** Cabeçalho de tela interna — título grande serifado + descrição curta. */
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">{title}</h1>
      {description && <p className="mt-1.5 max-w-[34ch] text-[13.5px] text-muted">{description}</p>}
    </div>
  );
}
