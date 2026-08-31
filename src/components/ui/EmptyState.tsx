import { Sprout, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  /**
   * O próximo passo, quando existe um e a pessoa pode dá-lo.
   *
   * Opcional porque na maioria das telas vazias não há nada a fazer ali —
   * "ninguém pediu oração ainda" não tem botão. Mas quando a tela está
   * vazia justamente porque falta alguém criar a coisa, mandar a pessoa
   * procurar o caminho no menu é um passo a mais sem motivo.
   */
  action?: ReactNode;
};

export function EmptyState({ icon: Icon = Sprout, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center">
      <Icon className="h-[26px] w-[26px] text-border-strong" strokeWidth={1.5} aria-hidden />
      <p className="font-serif text-xl font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-[13.5px] text-muted">{description}</p>
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
