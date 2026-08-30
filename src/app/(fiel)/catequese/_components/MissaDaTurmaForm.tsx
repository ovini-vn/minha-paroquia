"use client";

import { Church } from "lucide-react";
import { registrarMissaDaTurmaAction } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

type Matricula = { id: string; familyMember: { fullName: string } };

/**
 * A segunda chamada da semana: quem foi à missa.
 *
 * São duas presenças diferentes e nenhuma substitui a outra. A do encontro
 * diz se a criança veio à catequese; a da missa é o que a caminhada
 * sacramental pede, e é justamente a que a família mais acompanha.
 *
 * Antes só existia o lançamento individual, dentro da ficha de cada
 * catequizando — numa turma de 25, marcar quem foi à missa eram 25 telas.
 * Aqui é a turma inteira num domingo só, ao lado da chamada do encontro.
 *
 * A data vem separada porque a missa não é no dia do encontro: o padrão é o
 * domingo anterior, que é o caso comum de uma catequese de sábado ou de
 * meio de semana.
 */
export function MissaDaTurmaForm({
  groupId,
  sessionId,
  matriculas,
  presentes,
  domingoSugerido,
  celebracoes,
}: {
  groupId: string;
  sessionId: string;
  matriculas: Matricula[];
  presentes: Set<string>;
  domingoSugerido: string;
  celebracoes: { id: string; label: string }[];
}) {
  return (
    <form action={registrarMissaDaTurmaAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attendedOn" className="text-sm font-medium text-muted">
            Dia da missa
          </label>
          <input
            id="attendedOn"
            name="attendedOn"
            type="date"
            required
            defaultValue={domingoSugerido}
            className={INPUT_CLASSES}
          />
        </div>

        {celebracoes.length > 0 && (
          <div className="flex min-w-[190px] flex-col gap-1.5">
            <label htmlFor="celebrationId" className="text-sm font-medium text-muted">
              Qual missa (opcional)
            </label>
            <select id="celebrationId" name="celebrationId" className={INPUT_CLASSES}>
              <option value="">—</option>
              {celebracoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 pt-1">
        {matriculas.map((matricula) => (
          <label
            key={matricula.id}
            className="flex items-center gap-2.5 text-[14.5px] text-foreground"
          >
            {/* O valor É o id da matrícula: quem vier marcado está presente,
                e quem não vier tem a presença daquele dia removida. */}
            <input
              type="checkbox"
              name="missa"
              value={matricula.id}
              defaultChecked={presentes.has(matricula.id)}
              className="h-[18px] w-[18px] accent-[rgb(var(--color-primary))]"
            />
            {matricula.familyMember.fullName}
          </label>
        ))}
      </div>

      <Button type="submit" className="mt-1 w-fit">
        <Church className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
        Salvar presença na missa
      </Button>
    </form>
  );
}
