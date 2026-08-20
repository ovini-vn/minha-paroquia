import { Sprout, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon = Sprout, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} aria-hidden />
      <p className="font-serif text-lg text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
