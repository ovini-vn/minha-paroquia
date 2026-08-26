import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

const TAMANHOS = {
  sm: "h-[34px] w-[34px]",
  md: "h-[46px] w-[46px]",
  lg: "h-[76px] w-[76px]",
} as const;

/**
 * O rosto de alguém: a foto quando existe, as iniciais quando não.
 *
 * O Avatar de iniciais continua sendo o padrão do app — este componente só
 * troca por foto quando há uma, mantendo o mesmo tamanho e o mesmo aro
 * dourado, para a lista não dançar entre um card e outro.
 */
export function Retrato({
  nome,
  fotoUrl,
  size = "md",
  className,
}: {
  nome: string;
  fotoUrl?: string | null;
  size?: keyof typeof TAMANHOS;
  className?: string;
}) {
  if (!fotoUrl) return <Avatar name={nome} size={size} className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotoUrl}
      alt={nome}
      loading="lazy"
      className={cn(
        TAMANHOS[size],
        "shrink-0 rounded-full border border-gold/45 object-cover",
        className,
      )}
    />
  );
}
