import { Sprout, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon = Sprout, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center">
      <Icon className="h-[26px] w-[26px] text-border-strong" strokeWidth={1.5} aria-hidden />
      <p className="font-serif text-xl font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-[13.5px] text-muted">{description}</p>
    </div>
  );
}
