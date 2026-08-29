"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import type { InputHTMLAttributes } from "react";

/**
 * Campo de senha com o olho de "mostrar".
 *
 * Vale mais onde a pessoa está CRIANDO uma senha — cadastro e nova senha —
 * do que no login: ali ela digita às cegas uma sequência que nunca viu, e o
 * erro só aparece depois de enviar. Com teclado de celular, maiúscula e
 * símbolo, errar é o caso comum, não a exceção.
 *
 * O botão é focável de propósito. Colocar `tabIndex={-1}` esconderia dele
 * exatamente quem mais precisa: quem não usa mouse.
 *
 * O rótulo do botão é `aria-label` e MUDA com o estado, em vez de um texto
 * fixo com `aria-pressed` só. Leitor de tela anuncia "Mostrar senha" e, ao
 * acionar, "Ocultar senha" — a pessoa sabe o que aconteceu sem enxergar o
 * ícone. O `aria-pressed` fica junto porque é o estado real do controle.
 *
 * Efeito colateral aceito: com `type="text"`, alguns gerenciadores de senha
 * deixam de reconhecer o campo enquanto ele está revelado. É o preço de
 * poder conferir o que se digitou, e o `autoComplete` continua declarado.
 */
export function CampoDeSenha({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const Icone = visivel ? EyeOff : Eye;

  return (
    <FormField
      {...props}
      label={label}
      type={visivel ? "text" : "password"}
      acessorio={
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
        >
          <Icone className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
        </button>
      }
    />
  );
}
