"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * Excluir em dois toques.
 *
 * O primeiro toque troca o rótulo para "Confirmar?"; o segundo apaga. Sem
 * isso, um dedo distraído na tela do celular apaga um aviso publicado e não
 * há desfazer — não guardamos versão anterior.
 *
 * Dois toques em vez do alerta do navegador: o alerta pode vir bloqueado,
 * sai em inglês em alguns aparelhos e não parece parte do aplicativo. Aqui
 * a pergunta acontece no próprio botão, no idioma certo.
 *
 * A confirmação expira sozinha: quem tocou e desistiu não deixa um botão
 * armado esperando o próximo toque.
 */
export function BotaoExcluir({
  action,
  id,
  rotulo = "Excluir",
  descricao,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  rotulo?: string;
  /** O que será apagado, para o leitor de tela anunciar sem ambiguidade. */
  descricao?: string;
}) {
  const [armado, setArmado] = useState(false);
  const relogio = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (relogio.current) window.clearTimeout(relogio.current);
    },
    [],
  );

  function armar(evento: React.MouseEvent<HTMLButtonElement>) {
    if (armado) return; // Segundo toque: deixa o formulário enviar.
    evento.preventDefault();
    setArmado(true);
    relogio.current = window.setTimeout(() => setArmado(false), 4000);
  }

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={armar}
        aria-label={
          armado
            ? `Confirmar exclusão${descricao ? ` de ${descricao}` : ""}`
            : `${rotulo}${descricao ? ` ${descricao}` : ""}`
        }
        className={
          armado
            ? "inline-flex items-center gap-1.5 rounded-lg bg-error-tint px-3 py-1.5 text-[13px] font-semibold text-error"
            : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-error"
        }
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.6} aria-hidden />
        {armado ? "Confirmar?" : rotulo}
      </button>
    </form>
  );
}
