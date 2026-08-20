import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Tone = "accent" | "gold" | "success" | "warning" | "error" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  accent: "bg-primary-tint text-primary",
  gold: "bg-gold/15 text-[#7c5f16] dark:text-gold",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  error: "bg-error-tint text-error",
  muted: "bg-sunken text-muted",
};

export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
