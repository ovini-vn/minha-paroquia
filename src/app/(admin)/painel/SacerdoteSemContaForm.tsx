"use client";

import { useActionState } from "react";
import { UserRoundPlus } from "lucide-react";
import { cadastrarSacerdoteAction, type ActionState } from "@/server/actions/sacerdote-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: ActionState = {};

/**
 * Cadastrar um sacerdote que não usa o aplicativo.
 *
 * O caminho de quem usa continua sendo o convite com vínculo "Sacerdote",
 * logo acima nesta tela — e é o preferido, porque quem tem conta cuida da
 * própria agenda e assina a própria Palavra. Este formulário é para o
 * padre que não vai entrar: sem ele, a única saída era criar uma conta
 * que ninguém abriria, só para o app ter onde pendurar o nome.
 *
 * Dois campos e nada mais. Foto e apresentação do pároco já vivem em
 * "Nosso Pároco", e duplicar aqui faria as duas telas divergirem.
 */
export function SacerdoteSemContaForm() {
  const [estado, cadastrar, salvando] = useActionState(cadastrarSacerdoteAction, inicial);

  return (
    <form action={cadastrar} className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
      <p className="text-[13px] font-medium text-foreground">
        Sacerdote que não usa o aplicativo
      </p>
      <p className="text-[12.5px] leading-relaxed text-muted">
        Ele aparece em &ldquo;Falar com um sacerdote&rdquo; e pode celebrar missas e sacramentos no
        registro. Quem cuida da agenda dele é a secretaria — sem conta, não há como ele abrir
        horários sozinho.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="sac-nome" className="text-xs font-medium text-muted">
            Nome
          </label>
          <input
            id="sac-nome"
            name="nome"
            required
            maxLength={120}
            placeholder="Pe. João Bortoloci Filho"
            className={INPUT_CLASSES}
          />
        </div>
        <div className="flex w-[160px] flex-col gap-1.5">
          <label htmlFor="sac-title" className="text-xs font-medium text-muted">
            Cargo
          </label>
          <select id="sac-title" name="title" defaultValue="Pároco" className={INPUT_CLASSES}>
            <option value="Pároco">Pároco</option>
            <option value="Vigário">Vigário</option>
            <option value="Sacerdote">Sacerdote</option>
            <option value="Diácono">Diácono</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={salvando}>
          <UserRoundPlus className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden />
          {salvando ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </div>

      {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-primary">{estado.ok}</p>}
    </form>
  );
}
