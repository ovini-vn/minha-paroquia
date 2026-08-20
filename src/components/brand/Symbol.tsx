import { cn } from "@/lib/cn";

/**
 * Emblema do MINHA PARÓQUIA, redesenhado como vetor.
 *
 * Os cinco conceitos da marca, de cima para baixo:
 *   LUZ          — a estrela de oito pontas
 *   PERTENCIMENTO— o portal/arco que acolhe
 *   CRISTO       — a cruz ao centro, para onde a caminhada converge
 *   COMUNIDADE   — as sete figuras reunidas
 *   SERVIÇO      — as mãos que sustentam, e o caminho dourado que desce
 *
 * As partes em violeta usam `currentColor` de propósito: o emblema herda a
 * cor do texto do pai, então funciona tanto sobre marfim quanto sobre o
 * gradiente litúrgico. Só o dourado é fixo — é a "luz" imutável da
 * identidade.
 *
 * Quem usa PRECISA definir a cor (`text-primary`, `text-white`...): sem uma
 * cor herdada o emblema sai na cor do texto corrente. Não fixamos
 * `text-primary` aqui porque isso deixava o emblema violeta sobre o fundo
 * violeta do login, praticamente invisível.
 */
export function Symbol({ className }: { className?: string }) {
  const gold = "rgb(var(--color-gold))";

  return (
    <svg
      viewBox="0 0 400 440"
      className={cn(className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* LUZ — estrela de oito pontas (dois losangos sobrepostos). */}
      <path
        d="M200 6 Q205 51 250 56 Q205 61 200 106 Q195 61 150 56 Q195 51 200 6 Z"
        fill={gold}
      />
      <path
        d="M200 24 Q203 53 232 56 Q203 59 200 88 Q197 59 168 56 Q197 53 200 24 Z"
        fill={gold}
        transform="rotate(45 200 56)"
      />

      {/* PERTENCIMENTO — portal externo (violeta) e arco interno (dourado). */}
      <path
        d="M46 396 V242 A154 154 0 0 1 354 242 V396"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <path
        d="M80 396 V242 A120 120 0 0 1 320 242 V396"
        stroke={gold}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* CRISTO — a cruz, atrás da comunidade. */}
      <path
        d="M191 140 h18 v46 h39 v18 h-39 v152 h-18 v-152 h-39 v-18 h39 z"
        fill={gold}
      />

      {/* COMUNIDADE — sete figuras, a maior ao centro. */}
      <g fill="currentColor">
        {/* extremos */}
        <circle cx="72" cy="284" r="14" />
        <path d="M54 404 V322 A18 18 0 0 1 90 322 V404 Z" />
        <circle cx="328" cy="284" r="14" />
        <path d="M310 404 V322 A18 18 0 0 1 346 322 V404 Z" />
        {/* intermediárias */}
        <circle cx="106" cy="274" r="17" />
        <path d="M85 404 V312 A21 21 0 0 1 127 312 V404 Z" />
        <circle cx="294" cy="274" r="17" />
        <path d="M273 404 V312 A21 21 0 0 1 315 312 V404 Z" />
        {/* internas */}
        <circle cx="150" cy="262" r="20" />
        <path d="M125 404 V302 A25 25 0 0 1 175 302 V404 Z" />
        <circle cx="250" cy="262" r="20" />
        <path d="M225 404 V302 A25 25 0 0 1 275 302 V404 Z" />
        {/* central */}
        <circle cx="200" cy="248" r="24" />
        <path d="M170 404 V290 A30 30 0 0 1 230 290 V404 Z" />
      </g>

      {/* SERVIÇO — as mãos que sustentam a comunidade. */}
      <g fill="currentColor">
        <path d="M64 302 C42 334 42 384 84 404 C124 422 172 404 200 370 L189 346 C160 375 116 377 91 353 C72 335 66 317 64 302 Z" />
        <path
          d="M64 302 C42 334 42 384 84 404 C124 422 172 404 200 370 L189 346 C160 375 116 377 91 353 C72 335 66 317 64 302 Z"
          transform="matrix(-1 0 0 1 400 0)"
        />
      </g>

      {/* CAMINHADA — o caminho dourado que desce entre as mãos. */}
      <path
        d="M178 330 C172 358 192 372 198 396 C203 416 192 428 168 436 L216 436 C232 418 236 394 226 372 C216 350 200 342 206 330 Z"
        fill={gold}
      />
    </svg>
  );
}
