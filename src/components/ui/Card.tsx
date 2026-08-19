import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-terracotta-100 bg-cream-50 p-5 shadow-sm", className)}
      {...props}
    />
  );
}
