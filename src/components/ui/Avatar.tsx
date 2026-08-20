import { cn } from "@/lib/cn";

const SIZE_CLASSES = {
  sm: "h-[34px] w-[34px] text-sm font-sans font-semibold",
  md: "h-[46px] w-[46px] text-[19px]",
  lg: "h-[76px] w-[76px] text-3xl",
} as const;

/**
 * Iniciais dentro de um círculo com aro dourado — o "halo" da linguagem da
 * marca, usado no lugar de foto quando não há uma.
 */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-gold/45 bg-primary-tint font-serif font-semibold text-primary",
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
