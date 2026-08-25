import Link from "next/link";
import { Landmark, UserRound } from "lucide-react";

type Cartao = {
  href: string;
  titulo: string;
  legenda: string;
  imagem: string | null;
  icone: typeof Landmark;
};

/**
 * As duas portas de entrada para conhecer a comunidade: de onde ela vem e
 * quem é o padre da casa.
 *
 * Ficam no alto da Comunidade porque são a pergunta de quem chegou agora —
 * antes dos avisos e da agenda, que interessam a quem já pertence.
 */
export function CartoesDeApresentacao({
  fotoIgreja,
  fotoParoco,
  nomeParoco,
}: {
  fotoIgreja: string | null;
  fotoParoco: string | null;
  nomeParoco: string | null;
}) {
  const cartoes: Cartao[] = [
    {
      href: "/historia",
      titulo: "Nossa História",
      legenda: "De onde vem esta comunidade",
      imagem: fotoIgreja,
      icone: Landmark,
    },
    {
      href: "/paroco",
      titulo: "Nosso Pároco",
      legenda: nomeParoco ?? "Quem é o padre da casa",
      imagem: fotoParoco,
      icone: UserRound,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 pt-5">
      {cartoes.map((cartao) => {
        const Icone = cartao.icone;
        return (
          <Link
            key={cartao.href}
            href={cartao.href}
            className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary"
          >
            {/* Proporção fixa para os dois cartões ficarem do mesmo tamanho
                com fotos de formatos diferentes. */}
            <div className="relative aspect-[4/3] w-full bg-primary-tint">
              {cartao.imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cartao.imagem}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-primary">
                  <Icone className="h-8 w-8" strokeWidth={1.4} aria-hidden />
                </span>
              )}
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[13.5px] font-semibold leading-tight text-foreground">
                {cartao.titulo}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">
                {cartao.legenda}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
