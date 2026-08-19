type EmptyStateProps = {
  icon?: string;
  title: string;
  description: string;
};

export function EmptyState({ icon = "🌱", title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="font-serif text-lg text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
