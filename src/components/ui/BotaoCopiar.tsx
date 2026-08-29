"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Copia um texto e diz que copiou.
 *
 * Sem a confirmação, quem toca não sabe se funcionou e toca de novo — e no
 * meio de uma doação essa dúvida faz a pessoa desistir.
 */

/**
 * Escrever na área de transferência é menos garantido do que parece.
 *
 * A API moderna exige contexto seguro e permissão, e — pior — quando a
 * janela não está em foco o navegador deixa a promessa PENDENTE em vez de
 * recusar. Sem o prazo abaixo, o botão ficaria mudo para sempre.
 *
 * Por isso: tenta a API com prazo, cai no execCommand (obsoleto, mas
 * síncrono e aceito em quase tudo) e só então desiste.
 */
async function copiarTexto(valor: string): Promise<boolean> {
  const prazo = new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 1200));

  if (navigator.clipboard?.writeText) {
    const tentativa = navigator.clipboard
      .writeText(valor)
      .then(() => true)
      .catch(() => false);
    if (await Promise.race([tentativa, prazo])) return true;
  }

  try {
    const area = document.createElement("textarea");
    area.value = valor;
    // Fora da vista, mas ainda selecionável: display:none não copiaria.
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const deuCerto = document.execCommand("copy");
    document.body.removeChild(area);
    return deuCerto;
  } catch {
    return false;
  }
}

export function BotaoCopiar({
  valor,
  rotulo,
  rotuloCopiado,
  className,
}: {
  valor: string;
  rotulo: string;
  rotuloCopiado: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<"parado" | "copiando" | "copiado" | "falhou">("parado");
  const relogio = useRef<number | null>(null);

  // Se a pessoa sair da tela antes do tempo acabar, o timer não pode tentar
  // mexer num componente que já saiu.
  useEffect(
    () => () => {
      if (relogio.current) window.clearTimeout(relogio.current);
    },
    [],
  );

  async function aoClicar() {
    setEstado("copiando");
    const deuCerto = await copiarTexto(valor);
    setEstado(deuCerto ? "copiado" : "falhou");
    if (relogio.current) window.clearTimeout(relogio.current);
    relogio.current = window.setTimeout(() => setEstado("parado"), 2500);
  }

  const copiado = estado === "copiado";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <button
        type="button"
        onClick={aoClicar}
        disabled={estado === "copiando"}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
          copiado ? "bg-success-tint text-success" : "bg-primary text-white hover:bg-primary/90 dark:bg-primary-light dark:hover:bg-primary-light dark:hover:brightness-110",
        )}
      >
        {copiado ? (
          <Check className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
        ) : (
          <Copy className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
        )}
        {copiado ? rotuloCopiado : rotulo}
      </button>

      {/* aria-live para quem usa leitor de tela ouvir a confirmação, já que
          ela é só uma mudança de cor e texto no botão. */}
      <p aria-live="polite" className="sr-only">
        {copiado ? rotuloCopiado : ""}
      </p>

      {estado === "falhou" && (
        <p className="text-[12px] leading-relaxed text-muted">
          Não foi possível copiar automaticamente. Selecione o texto acima e copie à mão.
        </p>
      )}
    </div>
  );
}
