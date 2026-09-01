import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { enderecoDaAgenda, type EstadoDaAgenda } from "./endereco";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function nomeDoMes(mes: number): string {
  return MESES[mes - 1] ?? "";
}

/**
 * Mês anterior, mês seguinte, e a escolha entre lista e calendário.
 *
 * Tudo por ENDEREÇO, e não por estado no navegador: assim a pessoa pode
 * mandar "olha a agenda de outubro" para alguém, o botão de voltar do
 * telefone funciona, e a página continua sendo desenhada no servidor.
 */
export function NavegacaoDoMes({ estado }: { estado: EstadoDaAgenda }) {
  const { ano, mes, vista } = estado;
  const seta =
    "grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Link
          href={enderecoDaAgenda({ ...estado, mes: mes - 1 })}
          aria-label="Mês anterior"
          className={seta}
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        </Link>

        <p className="min-w-[9.5rem] text-center font-serif text-[19px] font-semibold capitalize leading-none text-foreground">
          {nomeDoMes(mes)} <span className="text-muted">{ano}</span>
        </p>

        <Link
          href={enderecoDaAgenda({ ...estado, mes: mes + 1 })}
          aria-label="Mês seguinte"
          className={seta}
        >
          <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        </Link>
      </div>

      {/*
        Duas visões da mesma coisa, e não dois lugares. A lista responde "o
        que vai acontecer"; o calendário responde "como está o mês". Quem
        precisa de uma raramente precisa da outra ao mesmo tempo.
      */}
      <div
        role="group"
        aria-label="Como ver a agenda"
        className="inline-flex overflow-hidden rounded-full border border-border"
      >
        {(
          [
            ["lista", "Lista", List],
            ["calendario", "Calendário", CalendarDays],
          ] as const
        ).map(([id, rotulo, Icone]) => (
          <Link
            key={id}
            href={enderecoDaAgenda({ ...estado, vista: id })}
            aria-current={vista === id ? "true" : undefined}
            className={
              vista === id
                ? "inline-flex items-center gap-1.5 bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white dark:bg-primary-light"
                : "inline-flex items-center gap-1.5 bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            }
          >
            <Icone className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            {rotulo}
          </Link>
        ))}
      </div>
    </div>
  );
}
