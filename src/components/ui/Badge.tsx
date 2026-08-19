import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-terracotta-100 px-3 py-1 text-xs font-medium text-terracotta-700">
      {children}
    </span>
  );
}
